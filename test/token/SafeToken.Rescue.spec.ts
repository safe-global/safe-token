import { expect } from "chai";
import hre, { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getMock, getTestTokenContract } from "../utils/setup";
import { setupTokenTests } from "./utils";

describe("SafeToken - Deployment", async () => {

    const [user1, user2] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async () => {
        const { token, ownedToken } = await setupTokenTests()
        const mock = await getMock()
        return {
            token,
            mock,
            ownedToken,
        }
    })

    describe("rescueTokens", async () => {

        it('should revert if not called by owner', async () => {
            const { token, mock } = await setupTests()
            await expect(
                token.rescueToken(mock.address, user2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it('should revert if no tokens to rescue', async () => {
            const { ownedToken, mock } = await setupTests()
            const tokenContract = await getTestTokenContract()
            await mock.givenMethodReturnUint(tokenContract.interface.getSighash("balanceOf"), 0)
            await expect(
                ownedToken.rescueToken(mock.address, user2.address)
            ).to.be.revertedWith("TokenRescuer: No tokens to rescue")
        })

        it('should revert if token transfer returns false', async () => {
            const { ownedToken, mock } = await setupTests()

            const tokenContract = await getTestTokenContract()
            await mock.givenMethodReturnUint(tokenContract.interface.getSighash("balanceOf"), 1)
            await mock.givenMethodReturnBool(tokenContract.interface.getSighash("transfer"), false)
            await expect(
                ownedToken.rescueToken(mock.address, user2.address)
            ).to.be.revertedWith("TokenRescuer: Could not rescue token")
        })

        it('should revert if token transfer reverts', async () => {
            const { ownedToken, mock } = await setupTests()

            const tokenContract = await getTestTokenContract()
            await mock.givenMethodReturnUint(tokenContract.interface.getSighash("balanceOf"), 1)
            await mock.givenMethodRevertWithMessage(tokenContract.interface.getSighash("transfer"), "Mock: revert on transfer")
            await expect(
                ownedToken.rescueToken(mock.address, user2.address)
            ).to.be.revertedWith("Mock: revert on transfer")
        })

        it('should call transfer on token contract', async () => {
            const { ownedToken, mock } = await setupTests()

            const tokenContract = await getTestTokenContract()
            await mock.givenMethodReturnUint(tokenContract.interface.getSighash("balanceOf"), 1)
            await mock.givenMethodReturnBool(tokenContract.interface.getSighash("transfer"), true)
            await ownedToken.rescueToken(mock.address, user2.address)

            const expectedData = tokenContract.interface.encodeFunctionData("transfer", [user2.address, 1])
            expect(
                await mock.callStatic.invocationCountForCalldata(expectedData)
            ).to.be.eq(1)
            // balanceOf invocation is a static call, therefore it is not counted
            expect(
                await mock.callStatic.invocationCount()
            ).to.be.eq(1)
        })
    })
})