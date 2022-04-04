import { expect } from "chai";
import hre, { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getExecutor, getToken, getMock } from "../utils/setup";
import { parseEther } from "@ethersproject/units";
import { AddressOne, nameToAddress } from "../../src/utils/tokenConfig";

describe("SafeToken - Deployment", async () => {

    const [user1, user2] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const token = await getToken()
        const owner = nameToAddress("Safe Foundation")
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [owner],
        });
        await user1.sendTransaction({ to: owner, value: parseEther("1") })
        const ownedToken = token.connect(await ethers.getSigner(owner))
        return {
            token,
            ownedToken
        }
    })

    describe("state", async () => {

        it.skip('should be deployed deterministically', async () => {
            const { token } = await setupTests()
            expect(
                token.address
            ).to.be.eq("0x164FF0341AC389F4989FB4F22Fae4401BceA547D")
        })

        it('should be paused by default', async () => {
            const { token } = await setupTests()
            expect(
                await token.paused()
            ).to.be.true
        })

        it('should be owner by SafeDao', async () => {
            const { token } = await setupTests()
            expect(
                await token.owner()
            ).to.be.eq(nameToAddress("Safe Foundation"))
        })

        it('should have 1 billion tokens', async () => {
            const { token } = await setupTests()
            expect(
                await token.totalSupply()
            ).to.be.eq(ethers.utils.parseUnits("1000000000", 18))
        })

        it('balances', async () => {
            const { token } = await setupTests()
            expect(
                await token.balanceOf(nameToAddress("Safe Foundation"))
            ).to.be.eq(ethers.utils.parseUnits("1000000000", 18))
        })
    })
})