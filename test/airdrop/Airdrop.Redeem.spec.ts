import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getAirdropContract } from "../utils/setup";
import { Vesting } from "../../src/utils/types";
import { calculateVestingHash } from "../../src/utils/hash";
import { BigNumber, Contract } from "ethers";
import { generateRoot, generateProof } from "../../src/utils/proof";

describe("Airdrop - Setup", async () => {

    const vestingStart = (new Date()).getTime()
    const users = waffle.provider.getWallets()
    const [user1] = users;

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const airdropContract = await getAirdropContract()
        const token = await deployTestToken()
        const airdrop = await airdropContract.deploy(token.address, user1.address)
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

    describe("redeem", async () => {
        it('will transfer tokens and add vesting', async () => {
            const { airdrop, token } = await setupTests()
            const amount = ethers.utils.parseUnits("200000", 18)
            const { root, elements } = await generateAirdrop(airdrop, amount)
            await airdrop.initializeRoot(root)
            await token.transfer(airdrop.address, amount.mul(2))
            const vesting = createVesting(user1.address, amount)
            const vestingHash = calculateVestingHash(airdrop, vesting, await getChainId())
            const proof = generateProof(elements, vestingHash)
            await expect(
                airdrop.redeem(
                    vesting.account,
                    vesting.curveType,
                    vesting.durationWeeks,
                    vesting.startDate,
                    vesting.amount,
                    proof
                )
            )
                .to.emit(token, "Transfer").withArgs(airdrop.address, user1.address, amount)
                .and.to.emit(airdrop, "AddedVesting").withArgs(vestingHash, user1.address)
        })
    })
})