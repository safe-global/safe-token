import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { setupTokenTests } from "./utils";
import { nameToAddress } from "../../src/utils/tokenConfig";

describe("SafeToken - Ownable", async () => {

    const [user1] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async () => {
        const { token, ownedToken } = await setupTokenTests()
        return {
            token,
            ownedToken,
        }
    })

    describe("transferOwnership", async () => {

        it('should revert if not called by owner', async () => {
            const { token } = await setupTests()
            await expect(
                token.transferOwnership(user1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner")
            expect(
                await token.owner()
            ).to.be.eq(nameToAddress("Safe Foundation"))
        })

        it('should revert if transferring ownership to zero address', async () => {
            const { token, ownedToken } = await setupTests()
            await expect(
                ownedToken.transferOwnership(ethers.constants.AddressZero)
            ).to.be.revertedWith("Ownable: new owner is the zero address")
            expect(
                await token.owner()
            ).to.be.eq(nameToAddress("Safe Foundation"))
        })


        it('should emit event on ownership transfer', async () => {
            const { token, ownedToken } = await setupTests()
            await expect(
                ownedToken.transferOwnership(user1.address)
            ).to.emit(ownedToken, "OwnershipTransferred").withArgs(nameToAddress("Safe Foundation"), user1.address)
            expect(
                await token.owner()
            ).to.be.eq(user1.address)
        })
    })

    describe("renounceOwnership", async () => {

        it('should revert if not called by owner', async () => {
            const { token } = await setupTests()
            await expect(
                token.renounceOwnership()
            ).to.be.revertedWith("Ownable: caller is not the owner")
            expect(
                await token.owner()
            ).to.be.eq(nameToAddress("Safe Foundation"))
        })

        it('should emit event on renouncing ownership', async () => {
            const { token, ownedToken } = await setupTests()
            await expect(
                ownedToken.renounceOwnership()
            ).to.emit(ownedToken, "OwnershipTransferred").withArgs(nameToAddress("Safe Foundation"), ethers.constants.AddressZero)
            expect(
                await token.owner()
            ).to.be.eq(ethers.constants.AddressZero)
        })
    })
})