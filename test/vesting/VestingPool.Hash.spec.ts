import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getVestingPoolContract } from "../utils/setup";
import { Contract } from "ethers";
import { Vesting } from "../../src/utils/types";
import { calculateVestingHash } from "../../src/utils/hash";

describe("VestingPool - Hash", async () => {

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

    const chainId = async () => {
        return (await ethers.provider.getNetwork()).chainId
    }

    const getVestingHash = async(pool: Contract, vesting: Vesting) => {
        return await pool.vestingHash(vesting.account, vesting.curveType, vesting.managed, vesting.durationWeeks, vesting.startDate, vesting.amount)
    }

    describe("vestingHash", async () => {

        it('calculate correct hash for managed vesting', async () => {
            const { pool } = await setupTests()
            const vesting: Vesting = {
                account: user2.address,
                curveType: 0, 
                managed: true, 
                durationWeeks: 104, 
                startDate: (new Date()).getTime(), 
                amount: ethers.utils.parseUnits("200000", 18)
            }
            expect(
                await getVestingHash(pool, vesting)
            ).to.be.eq(calculateVestingHash(pool, vesting, await chainId()))
        })

        it('calculate correct hash for unmanaged vesting', async () => {
            const { pool } = await setupTests()
            const vesting: Vesting = {
                account: user2.address, 
                curveType: 0, 
                managed: false, 
                durationWeeks: 104, 
                startDate: (new Date()).getTime(), 
                amount: ethers.utils.parseUnits("200000", 18)
            }
            expect(
                await getVestingHash(pool, vesting)
            ).to.be.eq(calculateVestingHash(pool, vesting, await chainId()))
        })

        it('calculate correct hash for exponential vesting', async () => {
            const { pool } = await setupTests()
            const vesting: Vesting = {
                account: user2.address, 
                curveType: 1, 
                managed: true, 
                durationWeeks: 104, 
                startDate: (new Date()).getTime(), 
                amount: ethers.utils.parseUnits("200000", 18)
            }
            expect(
                await getVestingHash(pool, vesting)
            ).to.be.eq(calculateVestingHash(pool, vesting, await chainId()))
        })

        it('calculate correct hash for zero amount vesting', async () => {
            const { pool } = await setupTests()
            const vesting: Vesting = {
                account: user2.address, 
                curveType: 0, 
                managed: true, 
                durationWeeks: 104, 
                startDate: (new Date()).getTime(), 
                amount: 0
            }
            expect(
                await getVestingHash(pool, vesting)
            ).to.be.eq(calculateVestingHash(pool, vesting, await chainId()))
        })
    })
})