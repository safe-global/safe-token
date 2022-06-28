import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getAirdropContract, getExecutor, getMock, getTestTokenContract } from "../utils/setup";
import { Vesting } from "../../src/utils/types";
import { calculateVestingHash, preimageVestingHash } from "../../src/utils/hash";
import { BigNumber, Contract } from "ethers";
import { generateRoot, generateProof } from "../../src/utils/proof";
import { setNextBlockTime } from "../utils/state";
import { logGas } from "../utils/gas";

describe("Airdrop - Claiming", async () => {

    const vestingDurationInWeeks = 208
    const vestingDuration = vestingDurationInWeeks * 7 * 24 * 60 * 60
    const currentTime = Math.floor((new Date()).getTime() / 1000) + 1000
    const vestingStart = currentTime - vestingDuration / 2
    const vestingEnd = currentTime + vestingDuration / 2
    const redeemDeadline = currentTime + 60 * 60
    const users = waffle.provider.getWallets()
    const [user1, user2] = users;

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const airdropContract = await getAirdropContract()
        const executor = await getExecutor()
        const token = await deployTestToken()
        const airdrop = await airdropContract.deploy(token.address, executor.address, redeemDeadline)
        return {
            token,
            airdrop,
            executor
        }
    })

    const setupTestsWithoutExecutor = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const airdropContract = await getAirdropContract()
        const token = await deployTestToken()
        const airdrop = await airdropContract.deploy(token.address, user1.address, redeemDeadline)
        return {
            token,
            airdrop
        }
    })

    const setupMockedTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const airdropContract = await getAirdropContract()
        const executor = await getExecutor()
        const mock = await getMock()
        const tokenContract = await getTestTokenContract()
        const token = tokenContract.attach(mock.address)
        const airdrop = await airdropContract.deploy(token.address, executor.address, redeemDeadline)
        return {
            mock,
            token,
            airdrop,
            executor
        }
    })

    const getChainId = async () => {
        return (await ethers.provider.getNetwork()).chainId
    }

    const createVesting = (account: string, amount: BigNumber, startDate: number): Vesting => {
        return {
            account,
            curveType: 0,
            managed: false,
            durationWeeks: vestingDurationInWeeks,
            startDate,
            amount
        }
    }

    const generateAirdrop = async (airdrop: Contract, amount: BigNumber, startDate: number = vestingStart): Promise<{ root: string, elements: string[] }> => {
        const chainId = await getChainId()
        const elements = users.map((u) => u.address)
            .map((account: string) => {
                return createVesting(account, amount, startDate)
            })
            .map((vesting: Vesting) => {
                return calculateVestingHash(airdrop, vesting, chainId)
            })
        const root = generateRoot(elements)
        return {
            root,
            elements
        }
    }

    const setupAirdrop = async (
        airdrop: Contract,
        token: Contract,
        amount: BigNumber = ethers.utils.parseUnits("200000", 18),
        startDate: number = vestingStart,
        executor?: Contract
    ): Promise<string[]> => {
        const { root, elements } = await generateAirdrop(airdrop, amount, startDate)
        if (executor) {
            const initData = airdrop.interface.encodeFunctionData("initializeRoot", [root])
            await executor.exec(airdrop.address, 0, initData,0)
        } else {
            await airdrop.initializeRoot(root)
        }
        await token.transfer(airdrop.address, amount)
        return elements
    }

    const redeemAirdrop = async (
        airdrop: Contract,
        elements: string[],
        userAddress: string,
        amount: BigNumber = ethers.utils.parseUnits("200000", 18),
        startDate: number = vestingStart
    ): Promise<{ vesting: Vesting, vestingHash: string }> => {
        const vesting = createVesting(userAddress, amount, startDate)
        const vestingHash = calculateVestingHash(airdrop, vesting, await getChainId())
        const proof = generateProof(elements, vestingHash)
        await airdrop.redeem(
            vesting.curveType,
            vesting.durationWeeks,
            vesting.startDate,
            vesting.amount,
            proof
        )
        return { vesting, vestingHash }
    }

    describe("claimUnusedTokens", async () => {
        it('should revert if called before redeem deadline', async () => {
            const { airdrop } = await setupTestsWithoutExecutor()
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("Tokens can still be redeemed")
        })

        it('should revert if no tokens to claim', async () => {
            const { airdrop } = await setupTestsWithoutExecutor()
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("No tokens to claim")
        })

        it('should revert if no tokens to claim after a vesting was created', async () => {
            const { airdrop, token } = await setupTestsWithoutExecutor()
            const amount = ethers.utils.parseUnits("200000", 18)
            const elements = await setupAirdrop(airdrop, token, amount)
            await redeemAirdrop(airdrop, elements, user1.address, amount)

            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("No tokens to claim")
            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
        })

        it('should be able to claim if no vesting was created', async () => {
            const { airdrop, token } = await setupTestsWithoutExecutor()
            const amount = ethers.utils.parseUnits("200000", 18)
            await token.transfer(airdrop.address, amount)

            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            )
                .to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, amount)
            expect(await token.balanceOf(airdrop.address)).to.be.eq(0)
            expect(await token.balanceOf(user2.address)).to.be.eq(amount)
        })

        it('should be able to claim if tokens left ofter after vesting was created', async () => {
            const { airdrop, token } = await setupTestsWithoutExecutor()
            const leftOver = ethers.utils.parseUnits("100000", 18)
            await token.transfer(airdrop.address, leftOver)
            const amount = ethers.utils.parseUnits("200000", 18)
            const elements = await setupAirdrop(airdrop, token, amount)
            await redeemAirdrop(airdrop, elements, user1.address, amount)

            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount.add(leftOver))
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            )
                .to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, leftOver)
            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(leftOver)
        })

        it('should be able to claim if vesting was created', async () => {
            const { airdrop, token } = await setupTestsWithoutExecutor()
            const amount = ethers.utils.parseUnits("200000", 18)
            const elements = await setupAirdrop(airdrop, token, amount)
            await redeemAirdrop(airdrop, elements, user1.address, amount)

            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("No tokens to claim")
            expect(await token.balanceOf(airdrop.address)).to.be.eq(amount)
            expect(await token.balanceOf(user2.address)).to.be.eq(0)
        })
    })

    describe("claimVestedTokensViaModule", async () => {

        const MAX_UINT128 = BigNumber.from("0xffffffffffffffffffffffffffffffff")

        it('should revert if not vesting owner', async () => {
            const { airdrop } = await setupTests()
            const vestingHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"))
            const user2Airdrop = airdrop.connect(user2)
            await expect(
                user2Airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Can only be claimed by vesting owner")
        })

        it('should revert if beneficiary is 0-address', async () => {
            const { airdrop } = await setupTests()
            const vestingHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"))
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, ethers.constants.AddressZero, MAX_UINT128)
            ).to.be.revertedWith("Cannot claim to 0-address")
        })

        it('should revert if claiming too many tokens', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await setNextBlockTime(currentTime + 3600)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, amount)
            ).to.be.revertedWith("Trying to claim too many tokens")
        })

        it('should revert if module is not authorized', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, amount)
            ).to.be.revertedWith("TestExecutor: Not authorized")
        })

        it('should revert if token transfer fails', async () => {
            const { airdrop, token, executor } = await setupTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await token.pause()
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, amount)
            ).to.be.revertedWith("Module transaction failed")
        })

        it('should revert if vesting is not active yet', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingEnd, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount, vestingEnd)

            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Vesting not active yet")
        })

        it('should revert if token approval reverts', async () => {
            const { mock, airdrop, token, executor } = await setupMockedTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            await mock.givenMethodReturnUint(token.interface.getSighash("balanceOf"), amount)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await mock.givenMethodRevertWithMessage(token.interface.getSighash("approve"), "Token: Approval failed!")
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Token: Approval failed!")
        })

        it('should revert if token transfer reverts', async () => {
            const { mock, airdrop, token, executor } = await setupMockedTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            await mock.givenMethodReturnUint(token.interface.getSighash("balanceOf"), amount)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await mock.givenMethodReturnBool(token.interface.getSighash("approve"), true)
            await mock.givenMethodRevertWithMessage(token.interface.getSighash("transferFrom"), "Token: Transfer failed!")
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Module transaction failed")
        })

        it('should revert if token balance does not update', async () => {
            const { mock, airdrop, token, executor } = await setupMockedTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            await mock.givenMethodReturnUint(token.interface.getSighash("balanceOf"), amount)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await mock.givenMethodReturnBool(token.interface.getSighash("approve"), true)
            await mock.givenMethodReturnBool(token.interface.getSighash("transferFrom"), true)
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Could not deduct tokens from pool")
        })

        it('can claim available tokens while vesting is running', async () => {
            const { airdrop, token, executor } = await setupTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            const claimAmount = amount.div(2)
            await setNextBlockTime(currentTime)
            await expect(
                logGas("claim vesting", airdrop.claimVestedTokensViaModule(vestingHash, user1.address, claimAmount))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(claimAmount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(claimAmount.lte(vestedAmount)).to.be.true
            expect(claimAmount).to.be.eq(vestedAmount)
            expect(claimedAmount).to.be.eq(claimAmount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim all tokens after vesting is completed', async () => {
            const { airdrop, token, executor } = await setupTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(vestingEnd)

            await expect(
                logGas("claim vesting", airdrop.claimVestedTokensViaModule(vestingHash, user1.address, MAX_UINT128))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(vestedAmount).to.be.eq(amount)
            expect(claimedAmount).to.be.eq(amount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim available tokens to different account', async () => {
            const { airdrop, token, executor } = await setupTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(vestingEnd)

            await expect(
                logGas("claim vesting", airdrop.claimVestedTokensViaModule(vestingHash, user2.address, MAX_UINT128))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user2.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(vestedAmount).to.be.eq(amount)
            expect(claimedAmount).to.be.eq(amount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim available tokens multiple times to different accounts', async () => {
            const { airdrop, token, executor } = await setupTests()

            await executor.enableModule(airdrop.address)
            const amount = ethers.utils.parseUnits("1000", 18)
            
            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(currentTime)

            const claimAmount = amount.div(4)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            let amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount.div(2))
            expect(amounts.claimedAmount).to.be.eq(claimAmount)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.gt(amount.div(2))
            expect(amounts.claimedAmount).to.be.eq(claimAmount.mul(2))

            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user2.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user2.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount)
            expect(amounts.claimedAmount).to.be.eq(claimAmount.mul(3))

            await expect(
                airdrop.claimVestedTokensViaModule(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount)
            expect(amounts.claimedAmount).to.be.eq(amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
        })
    })

    describe("claimVestedTokens", async () => {

        const MAX_UINT128 = BigNumber.from("0xffffffffffffffffffffffffffffffff")

        it('should revert if not vesting owner', async () => {
            const { airdrop } = await setupTests()
            const vestingHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"))
            const user2Airdrop = airdrop.connect(user2)
            await expect(
                user2Airdrop.claimVestedTokens(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Can only be claimed by vesting owner")
        })

        it('should revert if beneficiary is 0-address', async () => {
            const { airdrop } = await setupTests()
            const vestingHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"))
            await expect(
                airdrop.claimVestedTokens(vestingHash, ethers.constants.AddressZero, MAX_UINT128)
            ).to.be.revertedWith("Cannot claim to 0-address")
        })

        it('should revert if claiming too many tokens', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await setNextBlockTime(currentTime + 3600)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, amount)
            ).to.be.revertedWith("Trying to claim too many tokens")
        })

        it('should revert if token transfer fails', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await token.pause()
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, amount)
            ).to.be.revertedWith("SafeToken: token transfer while paused")
        })

        it('should revert if vesting is not active yet', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingEnd, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount, vestingEnd)

            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Vesting not active yet")
        })

        it('should revert if token transfer reverts', async () => {
            const { mock, airdrop, token, executor } = await setupMockedTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            await mock.givenMethodReturnUint(token.interface.getSighash("balanceOf"), amount)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            await mock.givenMethodRevertWithMessage(token.interface.getSighash("transfer"), "Token: Transfer failed!")
            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, MAX_UINT128)
            ).to.be.revertedWith("Token: Transfer failed!")
        })

        it('can claim available tokens while vesting is running', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            const claimAmount = amount.div(2)
            await setNextBlockTime(currentTime)
            await expect(
                logGas("claim vesting", airdrop.claimVestedTokens(vestingHash, user1.address, claimAmount))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(claimAmount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(claimAmount.lte(vestedAmount)).to.be.true
            expect(claimAmount).to.be.eq(vestedAmount)
            expect(claimedAmount).to.be.eq(claimAmount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim all tokens after vesting is completed', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(vestingEnd)

            await expect(
                logGas("claim vesting", airdrop.claimVestedTokens(vestingHash, user1.address, MAX_UINT128))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(vestedAmount).to.be.eq(amount)
            expect(claimedAmount).to.be.eq(amount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim available tokens to different account', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)

            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(vestingEnd)

            await expect(
                logGas("claim vesting", airdrop.claimVestedTokens(vestingHash, user2.address, MAX_UINT128))
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user2.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
            const { vestedAmount, claimedAmount } = await airdrop.calculateVestedAmount(vestingHash)
            expect(vestedAmount).to.be.eq(amount)
            expect(claimedAmount).to.be.eq(amount)
            expect(
                await token.allowance(airdrop.address, executor.address)
            ).to.be.eq(0)
        })

        it('can claim available tokens multiple times to different accounts', async () => {
            const { airdrop, token, executor } = await setupTests()

            const amount = ethers.utils.parseUnits("1000", 18)
            
            const elements = await setupAirdrop(airdrop, token, amount, vestingStart, executor)
            const { vestingHash } = await redeemAirdrop(airdrop, elements, user1.address, amount)

            let vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(0)

            await setNextBlockTime(currentTime)

            const claimAmount = amount.div(4)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            let amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount.div(2))
            expect(amounts.claimedAmount).to.be.eq(claimAmount)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.gt(amount.div(2))
            expect(amounts.claimedAmount).to.be.eq(claimAmount.mul(2))

            await setNextBlockTime(vestingEnd)
            await expect(
                airdrop.claimVestedTokens(vestingHash, user2.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user2.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user2.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount)
            expect(amounts.claimedAmount).to.be.eq(claimAmount.mul(3))

            await expect(
                airdrop.claimVestedTokens(vestingHash, user1.address, claimAmount)
            )
                .to.emit(airdrop, "ClaimedVesting").withArgs(vestingHash, user1.address, user1.address)
                .and.to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, claimAmount)
            amounts = await airdrop.calculateVestedAmount(vestingHash)
            expect(amounts.vestedAmount).to.be.eq(amount)
            expect(amounts.claimedAmount).to.be.eq(amount)

            vesting = await airdrop.vestings(vestingHash)
            expect(vesting.amount).to.be.eq(amount)
            expect(vesting.amountClaimed).to.be.eq(amount)
        })
    })
})