import { expect } from "chai";
import { deployments } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { setupTokenTests } from "./utils";
import { nameToAddress } from "../../src/utils/tokenConfig";

describe("SafeToken - Pausable", async () => {

    const setupTests = deployments.createFixture(async () => {
        const { token, ownedToken } = await setupTokenTests()
        return {
            token,
            ownedToken,
        }
    })

    describe("unpause", async () => {

        it('should revert if not called by owner', async () => {
            const { token } = await setupTests()
            expect(
                await token.paused()
            ).to.be.true
            await expect(
                token.unpause()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it('should revert if called multiple times', async () => {
            const { ownedToken } = await setupTests()
            await ownedToken.unpause()
            await expect(
                ownedToken.unpause()
            ).to.be.revertedWith("SafeToken: token is not paused")
        })

        it('should emit event on unpause', async () => {
            const { ownedToken } = await setupTests()
            await expect(
                ownedToken.unpause()
            ).to.emit(ownedToken, "Unpaused").withArgs(nameToAddress("Safe Foundation"))
        })
    })
})