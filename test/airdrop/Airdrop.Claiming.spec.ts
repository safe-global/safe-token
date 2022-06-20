import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getAirdropContract } from "../utils/setup";
import { Vesting } from "../../src/utils/types";
import { calculateVestingHash } from "../../src/utils/hash";
import { BigNumber, Contract } from "ethers";
import { generateRoot, generateProof } from "../../src/utils/proof";
import { setNextBlockTime } from "../utils/state";

describe("Airdrop - Claiming", async () => {

    const vestingStart = (new Date()).getTime()
    const redeemDeadline = (new Date()).getTime() + 60 * 60 * 1000
    const users = waffle.provider.getWallets()
    const [user1, user2] = users;

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const airdropContract = await getAirdropContract()
        const token = await deployTestToken()
        const airdrop = await airdropContract.deploy(token.address, user1.address, redeemDeadline)
        return {
            token,
            airdrop
        }
    })

    const getChainId = async () => {
        return (await ethers.provider.getNetwork()).chainId
    }

    const createVesting = (account: string, amount: BigNumber): Vesting => {
        return {
            account,
            curveType: 0,
            managed: false,
            durationWeeks: 208,
            startDate: vestingStart,
            amount
        }
    }

    const generateAirdrop = async (airdrop: Contract, amount: BigNumber): Promise<{ root: string, elements: string[] }> => {
        const chainId = await getChainId()
        const elements = users.map((u) => u.address)
            .map((account: string) => {
                return createVesting(account, amount)
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

    describe("claimUnusedTokens", async () => {
        it('should revert if called before redeem deadline', async () => {
            const { airdrop } = await setupTests()
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("Tokens can still be redeemed")
        })

        it('should revert if no tokens to claim', async () => {
            const { airdrop } = await setupTests()
            await setNextBlockTime(redeemDeadline + 1)
            await expect(
                airdrop.claimUnusedTokens(
                    user2.address
                )
            ).to.be.revertedWith("No tokens to claim")
        })

        it('should revert if no tokens to claim after a vesting was created', async () => {
            const { airdrop, token } = await setupTests()
            const amount = ethers.utils.parseUnits("200000", 18)
            const { root, elements } = await generateAirdrop(airdrop, amount)
            await airdrop.initializeRoot(root)
            await token.transfer(airdrop.address, amount)
            const vesting = createVesting(user1.address, amount)
            const vestingHash = calculateVestingHash(airdrop, vesting, await getChainId())
            const proof = generateProof(elements, vestingHash)
            await airdrop.redeem(
                vesting.curveType,
                vesting.durationWeeks,
                vesting.startDate,
                vesting.amount,
                proof
            )

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
            const { airdrop, token } = await setupTests()
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
            const { airdrop, token } = await setupTests()
            const amount = ethers.utils.parseUnits("200000", 18)
            const leftOver = ethers.utils.parseUnits("100000", 18)
            const { root, elements } = await generateAirdrop(airdrop, amount)
            await airdrop.initializeRoot(root)
            await token.transfer(airdrop.address, amount.add(leftOver))
            const vesting = createVesting(user1.address, amount)
            const vestingHash = calculateVestingHash(airdrop, vesting, await getChainId())
            const proof = generateProof(elements, vestingHash)
            await airdrop.redeem(
                vesting.curveType,
                vesting.durationWeeks,
                vesting.startDate,
                vesting.amount,
                proof
            )

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
            const { airdrop, token } = await setupTests()
            const amount = ethers.utils.parseUnits("200000", 18)
            const { root, elements } = await generateAirdrop(airdrop, amount)
            await airdrop.initializeRoot(root)
            await token.transfer(airdrop.address, amount)
            const vesting = createVesting(user1.address, amount)
            const vestingHash = calculateVestingHash(airdrop, vesting, await getChainId())
            const proof = generateProof(elements, vestingHash)
            await airdrop.redeem(
                vesting.curveType,
                vesting.durationWeeks,
                vesting.startDate,
                vesting.amount,
                proof
            )

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
})