import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getVestingPoolContract } from "../utils/setup";

describe("VestingPool - Setup", async () => {

    const [user1, user2] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const poolContract = await getVestingPoolContract()
        const token = await deployTestToken()
        const pool = await poolContract.deploy(token.address, user1.address)
        return {
            token,
            pool
        }
    })

    describe("addVesting", async () => {

        it('should revert if not pool manager', async () => {
            const { pool } = await setupTests()
            const currentTime = (new Date()).getTime()
            const user2Pool = pool.connect(user2)
            await expect(
                user2Pool.addVesting(user2.address, 0, true, 104, currentTime, ethers.utils.parseUnits("200000", 18))
            ).to.be.revertedWith("Can only be called by pool manager")
        })

        it('should revert if no balance available', async () => {
            const { pool } = await setupTests()
            const currentTime = (new Date()).getTime()
            await expect(
                pool.addVesting(user2.address, 0, true, 104, currentTime, ethers.utils.parseUnits("200000", 18))
            ).to.be.revertedWith("Not enough tokens available")
        })

        it('should revert with invalid vesting curve', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount = ethers.utils.parseUnits("200000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp
            // 1h in the future
            const targetTime = currentTime + 3600
            await token.transfer(pool.address, vestingAmount)
            await expect(
                pool.addVesting(user2.address, 2, true, 104, currentTime, ethers.utils.parseUnits("200000", 18))
            ).to.be.revertedWith("Invalid vesting curve")
        })

        it('can add linear vesting that starts in the future', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount = ethers.utils.parseUnits("200000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp
            // 1h in the future
            const targetTime = currentTime + 3600
            await token.transfer(pool.address, vestingAmount)
            const vestingHash = await pool.vestingHash(user2.address, 0, true, 104, targetTime, vestingAmount)
            await expect(
                pool.addVesting(user2.address, 0, true, 104, targetTime, vestingAmount)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash, user2.address)
            await expect(
                pool.calculateVestedAmount(vestingHash)
            ).to.be.revertedWith("Vesting not active yet")
        })

        it('can add linear vesting that starts in the past', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount = ethers.utils.parseUnits("200000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp
            // 1h in the past
            const targetTime = currentTime - 3600
            await token.transfer(pool.address, vestingAmount)
            const vestingHash = await pool.vestingHash(user2.address, 0, true, 104, targetTime, vestingAmount)
            await expect(
                pool.addVesting(user2.address, 0, true, 104, targetTime, vestingAmount)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash, user2.address)
            const { vestedAmount } = await pool.calculateVestedAmount(vestingHash)
            // Expected value after exactly 60 minutes
            expect(vestedAmount).to.be.gte(ethers.utils.parseUnits("11.4468864469", 18))
            // Expected value after exactly 61 minutes
            expect(vestedAmount).to.be.lt(ethers.utils.parseUnits("11.6376678877", 18))
            expect(await pool.totalTokensInVesting()).to.be.eq(vestingAmount)
        })

        it('can add exponential vesting that starts in the future', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount = ethers.utils.parseUnits("400000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp
            // 1h in the future
            const targetTime = currentTime + 3600
            await token.transfer(pool.address, vestingAmount)
            const vestingHash = await pool.vestingHash(user2.address, 1, true, 104, targetTime, vestingAmount)
            await expect(
                pool.addVesting(user2.address, 1, true, 104, targetTime, vestingAmount)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash, user2.address)
            await expect(
                pool.calculateVestedAmount(vestingHash)
            ).to.be.revertedWith("Vesting not active yet")
        })

        it('can add exponential vesting that starts in the past', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount = ethers.utils.parseUnits("400000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp
            // 1h in the past
            const targetTime = currentTime - 3600
            await token.transfer(pool.address, vestingAmount)
            const vestingHash = await pool.vestingHash(user2.address, 1, true, 208, targetTime, vestingAmount)
            await expect(
                pool.addVesting(user2.address, 1, true, 208, targetTime, vestingAmount)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash, user2.address)
            const { vestedAmount } = await pool.calculateVestedAmount(vestingHash)
            // Expected value after exactly 60 minutes
            expect(vestedAmount).to.be.gte(ethers.utils.parseUnits("0.00032757802", 18))
            // Expected value after exactly 61 minutes
            expect(vestedAmount).to.be.lt(ethers.utils.parseUnits("0.00033858828", 18))
            expect(await pool.totalTokensInVesting()).to.be.eq(vestingAmount)
        })

        it('can add multiple vestings for same user', async () => {
            const { pool, token } = await setupTests()
            const vestingAmount1 = ethers.utils.parseUnits("400000", 18)
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp

            // 1h in the past
            const targetTime = currentTime - 3600

            // Transfer tokens for first vesting
            await token.transfer(pool.address, vestingAmount1.add(ethers.utils.parseUnits("100000", 18)))
            // Add first vesting
            const vestingHash1 = await pool.vestingHash(user2.address, 1, true, 208, targetTime, vestingAmount1)
            await expect(
                pool.addVesting(user2.address, 1, true, 208, targetTime, vestingAmount1)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash1, user2.address)

            // Check pool state
            expect(await pool.totalTokensInVesting()).to.be.eq(vestingAmount1)
            // Check first vesting
            const { vestedAmount: vestedAmount1 } = await pool.calculateVestedAmount(vestingHash1)
            // Expected value after exactly 60 minutes
            expect(vestedAmount1).to.be.gte(ethers.utils.parseUnits("0.00032757802", 18))
            // Expected value after exactly 61 minutes
            expect(vestedAmount1).to.be.lt(ethers.utils.parseUnits("0.00033858828", 18))

            // Try to add second vesting
            const vestingAmount2 = ethers.utils.parseUnits("200000", 18)
            await expect(
                pool.addVesting(user2.address, 0, true, 104, currentTime, vestingAmount2)
            ).to.be.revertedWith("Not enough tokens available")

            // Transfer tokens for second vesting
            await token.transfer(pool.address, vestingAmount1)
            // Add second vesting
            const vestingHash2 = await pool.vestingHash(user2.address, 0, true, 104, targetTime, vestingAmount2)
            await expect(
                pool.addVesting(user2.address, 0, true, 104, targetTime, vestingAmount2)
            ).to.emit(pool, "AddedVesting").withArgs(vestingHash2, user2.address)

            // Check pool state
            expect(await pool.totalTokensInVesting()).to.be.eq(vestingAmount1.add(vestingAmount2))
            // Check second vesting
            const { vestedAmount: vestedAmount2 } = await pool.calculateVestedAmount(vestingHash2)
            // Expected value after exactly 60 minutes
            expect(vestedAmount2).to.be.gte(ethers.utils.parseUnits("11.4468864469", 18))
            // Expected value after exactly 61 minutes
            expect(vestedAmount2).to.be.lt(ethers.utils.parseUnits("11.6376678877", 18))
        })
    })
})