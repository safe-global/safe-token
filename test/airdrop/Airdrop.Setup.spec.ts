import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getAirdropContract } from "../utils/setup";

describe("Airdrop - Setup", async () => {

    const redeemDeadline = (new Date()).getTime() + 60 * 60 * 1000
    const [user1, user2] = waffle.provider.getWallets();

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

    describe("initializeRoot", async () => {
        it('should revert if not pool manager', async () => {
            const { airdrop } = await setupTests()
            const user2Airdrop = airdrop.connect(user2)
            expect(await airdrop.root()).to.be.eq(ethers.constants.HashZero)
            await expect(
                user2Airdrop.initializeRoot(ethers.constants.MaxUint256)
            ).to.be.revertedWith("Can only be called by pool manager")
            expect(await airdrop.root()).to.be.eq(ethers.constants.HashZero)
        })

        it('should revert if initialized twice', async () => {
            const { airdrop } = await setupTests()
            await airdrop.initializeRoot(ethers.constants.MaxUint256)
            await expect(
                airdrop.initializeRoot(ethers.constants.MaxUint256)
            ).to.be.revertedWith("State root already initialized")
        })

        it('set storage root', async () => {
            const { airdrop } = await setupTests()
            await airdrop.initializeRoot(ethers.constants.MaxUint256)
            expect(await airdrop.root()).to.be.eq(ethers.constants.MaxUint256)
        })
    })

    describe("addVesting", async () => {
        it('should revert', async () => {
            const { airdrop } = await setupTests()
            const currentTime = (new Date()).getTime()
            await expect(
                airdrop.addVesting(user2.address, 0, true, 104, currentTime, ethers.utils.parseUnits("200000", 18))
            ).to.be.revertedWith("This method is not available for this contract")
        })
    })
    
    describe("constructor", async () => {
        it('should revert with redeem date in the past', async () => {
            const airdropContract = await getAirdropContract()
            const token = await deployTestToken()
            await expect(
                airdropContract.deploy(token.address, user1.address, 0)
            ).to.be.revertedWith("Redeem deadline should be in the future")
        })

        it('should revert with redeem date at current time', async () => {
            const airdropContract = await getAirdropContract()
            const token = await deployTestToken()
            setNextBlockTime(redeemDeadline)
            await expect(
                airdropContract.deploy(token.address, user1.address, redeemDeadline)
            ).to.be.revertedWith("Redeem deadline should be in the future")
        })
    })
})