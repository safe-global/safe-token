import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { deployTestToken, getAirdropContract } from "../utils/setup";

describe("Airdrop - Setup", async () => {

    const [user1, user2] = waffle.provider.getWallets();

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

    describe("addVesting", async () => {

        it('should revert', async () => {
            const { airdrop } = await setupTests()
            const currentTime = (new Date()).getTime()
            await expect(
                airdrop.addVesting(user2.address, 0, true, 104, currentTime, ethers.utils.parseUnits("200000", 18))
            ).to.be.revertedWith("This method is not available for this contract")
        })
    })
})