import { expect } from "chai";
import hre, { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getExecutor, getToken, getMock } from "../utils/setup";
import { parseEther } from "@ethersproject/units";

describe("SafeToken", async () => {

    const [user1, user2] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const token = await getToken()
        const mock = await getMock()
        const executor = await getExecutor()
        return {
            mock,
            executor,
            token
        }
    })

    describe("transfer", async () => {

        it.skip('should revert', async () => {
            const { mock, executor, token } = await setupTests()
            const execTransactionData = executor.interface.encodeFunctionData("execTransaction", [mock.address, 0, "0xbaddad42", 0, 0, 0, 0, ethers.constants.AddressZero, ethers.constants.AddressZero, "0x"])
            await expect(
                token.transfer(executor.address, execTransactionData, user2.address)
            ).to.be.revertedWith("TestExecutor: Not authorized")
        })
    })
})