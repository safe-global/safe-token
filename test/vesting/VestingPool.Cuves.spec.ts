import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getVestingPoolContract } from "../utils/setup";
import { BigNumber, Contract } from "ethers";
import { Vesting } from "../utils/types";
import { calculateVestingHash } from "../utils/hash";
import { setNextBlockTime } from "../utils/state";

describe("VestingPool - Curves", async () => {

    const WEEK_IN_SECONDS =  7 * 24 * 60 * 60
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

    const addVesting = async (pool: Contract, token: Contract, vesting: Vesting) => {
        await token.transfer(pool.address, vesting.amount)
        const vestingHash = await pool.vestingHash(vesting.account, vesting.curveType, vesting.managed, vesting.durationWeeks, vesting.startDate, vesting.amount)
        await expect(
            pool.addVesting(vesting.account, vesting.curveType, vesting.managed, vesting.durationWeeks, vesting.startDate, vesting.amount)
        ).to.emit(pool, "AddedVesting").withArgs(vestingHash, user2.address)
        return { vestingHash }
    }

    describe("linear", async () => {

        const checkLinearVesting = async (pool: Contract, vesting: Vesting, progress: number, vestingHash: string) => {
            const { vestedAmount } = await pool.calculateVestedAmount(vestingHash)
            const expectedVestedAmount = BigNumber.from(vesting.amount).mul(progress).div(100)
            expect(vestedAmount).to.be.eq(expectedVestedAmount)
        }

        const testLinearVesting = async (progress: number) => {
            const { pool, token } = await setupTests()
            const vesting: Vesting = {
                account: user2.address,
                curveType: 0,
                managed: true,
                durationWeeks: 104,
                startDate: (new Date()).getTime(),
                amount: ethers.utils.parseUnits("200000", 18)
            }
            const { vestingHash } = await addVesting(pool, token, vesting)
            if (progress > 0) {
                const durationSeconds = vesting.durationWeeks * WEEK_IN_SECONDS;
                await setNextBlockTime(vesting.startDate + durationSeconds * progress / 100, true)
                await checkLinearVesting(pool, vesting, progress, vestingHash)
            }
            return {
                pool,
                token,
                vesting,
                vestingHash
            }
        }

        it('10%', async () => {
            await testLinearVesting(10)
        })

        it('25%', async () => {
            await testLinearVesting(25)
        })

        it('50%', async () => {
            await testLinearVesting(50)
        })

        it('66%', async () => {
            await testLinearVesting(66)
        })

        it('75%', async () => {
            await testLinearVesting(75)
        })

        it('99%', async () => {
            await testLinearVesting(99)
        })

        it('100%', async () => {
            await testLinearVesting(100)
        })

        it('with pauses', async () => {
            const { pool, vesting, vestingHash } = await testLinearVesting(0)
            await pool.pauseVesting(vestingHash)

            // 2 weeks pause
            await setNextBlockTime(vesting.startDate + 2 * WEEK_IN_SECONDS)
            await pool.unpauseVesting(vestingHash)
            await checkLinearVesting(pool, vesting, 0, vestingHash)

            await setNextBlockTime(vesting.startDate + 28 * WEEK_IN_SECONDS)
            await pool.pauseVesting(vestingHash)
            await checkLinearVesting(pool, vesting, 25, vestingHash)

            // 4 weeks pause
            await setNextBlockTime(vesting.startDate + 32 * WEEK_IN_SECONDS)
            await pool.unpauseVesting(vestingHash)
            await checkLinearVesting(pool, vesting, 25, vestingHash)

            await setNextBlockTime(vesting.startDate + 84 * WEEK_IN_SECONDS, true)
            await checkLinearVesting(pool, vesting, 75, vestingHash)

            await setNextBlockTime(vesting.startDate + 200 * WEEK_IN_SECONDS, true)
            await checkLinearVesting(pool, vesting, 100, vestingHash)
        })
    })

    describe("exponential", async () => {

        const checkExponentialVesting = async (pool: Contract, vesting: Vesting, progress: number, vestingHash: string) => {
            const { vestedAmount } = await pool.calculateVestedAmount(vestingHash)
            const expectedVestedAmount = BigNumber.from(vesting.amount).mul(progress).mul(progress).div(10000)
            expect(vestedAmount).to.be.eq(expectedVestedAmount)
        }

        const testExponentialVesting = async (progress: number) => {
            const { pool, token } = await setupTests()
            const vesting: Vesting = {
                account: user2.address,
                curveType: 1,
                managed: true,
                durationWeeks: 208,
                startDate: (new Date()).getTime(),
                amount: ethers.utils.parseUnits("660000000", 18)
            }
            const { vestingHash } = await addVesting(pool, token, vesting)
            if (progress > 0) {
                const durationSeconds = vesting.durationWeeks * WEEK_IN_SECONDS;
                await setNextBlockTime(vesting.startDate + durationSeconds * progress / 100, true)
                await checkExponentialVesting(pool, vesting, progress, vestingHash)
            }
            return {
                pool,
                token,
                vesting,
                vestingHash
            }
        }

        it('10%', async () => {
            await testExponentialVesting(10)
        })

        it('25%', async () => {
            await testExponentialVesting(25)
        })

        it('50%', async () => {
            await testExponentialVesting(50)
        })

        it('66%', async () => {
            await testExponentialVesting(66)
        })

        it('75%', async () => {
            await testExponentialVesting(75)
        })

        it('99%', async () => {
            await testExponentialVesting(99)
        })

        it('100%', async () => {
            await testExponentialVesting(100)
        })

        it('with pauses', async () => {
            const { pool, vesting, vestingHash } = await testExponentialVesting(0)
            await pool.pauseVesting(vestingHash)

            // 3 weeks pause
            await setNextBlockTime(vesting.startDate + 3 * WEEK_IN_SECONDS)
            await pool.unpauseVesting(vestingHash)
            await checkExponentialVesting(pool, vesting, 0, vestingHash)

            await setNextBlockTime(vesting.startDate + 55 * WEEK_IN_SECONDS)
            await pool.pauseVesting(vestingHash)
            await checkExponentialVesting(pool, vesting, 25, vestingHash)

            // 9 weeks pause
            await setNextBlockTime(vesting.startDate + 64 * WEEK_IN_SECONDS)
            await pool.unpauseVesting(vestingHash)
            await checkExponentialVesting(pool, vesting, 25, vestingHash)

            await setNextBlockTime(vesting.startDate + 168 * WEEK_IN_SECONDS, true)
            await checkExponentialVesting(pool, vesting, 75, vestingHash)

            await setNextBlockTime(vesting.startDate + 500 * WEEK_IN_SECONDS, true)
            await checkExponentialVesting(pool, vesting, 100, vestingHash)
        })
    })
})