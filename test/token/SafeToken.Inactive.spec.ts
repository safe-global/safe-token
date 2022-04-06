import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { setupTokenTests } from "./utils";
import { nameToAddress } from "../../src/utils/tokenConfig";

describe("SafeToken - Inactive", async () => {

    const [user1, user2] = waffle.provider.getWallets();

    const setupTests = deployments.createFixture(async () => {
        const { token, ownedToken } = await setupTokenTests()
        return {
            token,
            ownedToken,
        }
    })

    describe("transfer", async () => {

        it('should revert if not called by owner', async () => {
            const { token, ownedToken } = await setupTests()
            await ownedToken.transfer(user1.address, 1000)
            expect(
                await token.balanceOf(user1.address)
            ).to.be.eq(1000)
            await expect(
                token.transfer(user2.address, 1000)
            ).to.be.revertedWith("SafeToken: token transfer while paused")
        })

        it('should revert on transfer to token contract', async () => {
            const { token, ownedToken } = await setupTests()
            await expect(
                ownedToken.transfer(token.address, 1000)
            ).to.be.revertedWith("SafeToken: cannot transfer tokens to token contract")
        })

        it('should emit event on transfer', async () => {
            const { ownedToken } = await setupTests()
            await expect(
                ownedToken.transfer(user1.address, 1000)
            ).to.emit(ownedToken, "Transfer").withArgs(nameToAddress("Safe Foundation"), user1.address, 1000)
        })
    })

    describe("transferFrom", async () => {

        it('should revert if not enough allowance', async () => {
            const { token, ownedToken } = await setupTests()
            await ownedToken.transfer(user1.address, 1000)
            expect(
                await token.balanceOf(user1.address)
            ).to.be.eq(1000)
            await expect(
                token.transferFrom(user1.address, user2.address, 1000)
            ).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it('should revert if not called by owner', async () => {
            const { token, ownedToken } = await setupTests()
            await token.connect(user2).approve(user1.address, 1000)
            await ownedToken.transfer(user2.address, 1000)
            expect(
                await token.balanceOf(user2.address)
            ).to.be.eq(1000)
            await expect(
                token.transferFrom(user2.address, user1.address, 1000)
            ).to.be.revertedWith("SafeToken: token transfer while paused")
        })

        it('should revert on transfer to token contract', async () => {
            const { token, ownedToken } = await setupTests()
            await token.approve(nameToAddress("Safe Foundation"), 1000)
            await ownedToken.transfer(user1.address, 1000)
            await expect(
                ownedToken.transferFrom(user1.address, token.address, 1000)
            ).to.be.revertedWith("SafeToken: cannot transfer tokens to token contract")
        })

        it('should update allowance and emit event on transferFrom', async () => {
            const { token, ownedToken } = await setupTests()
            await token.approve(nameToAddress("Safe Foundation"), 1000)
            expect(
                await token.allowance(user1.address, nameToAddress("Safe Foundation"))
            ).to.be.eq(1000)
            await ownedToken.transfer(user1.address, 1000)
            await expect(
                ownedToken.transferFrom(user1.address, user2.address, 300)
            ).to.emit(ownedToken, "Transfer").withArgs(user1.address, user2.address, 300)
            expect(
                await token.allowance(user1.address, nameToAddress("Safe Foundation"))
            ).to.be.eq(700)
        })

        it('should not update unlimited allowance on transferFrom', async () => {
            const { token, ownedToken } = await setupTests()
            await token.approve(nameToAddress("Safe Foundation"), ethers.constants.MaxUint256)
            expect(
                await token.allowance(user1.address, nameToAddress("Safe Foundation"))
            ).to.be.eq(ethers.constants.MaxUint256)
            await ownedToken.transfer(user1.address, 1000)
            await expect(
                ownedToken.transferFrom(user1.address, user2.address, 300)
            ).to.emit(ownedToken, "Transfer").withArgs(user1.address, user2.address, 300)
            expect(
                await token.allowance(user1.address, nameToAddress("Safe Foundation"))
            ).to.be.eq(ethers.constants.MaxUint256)
        })
    })

    describe("approve", async () => {

        it('should revert if zero address is approved', async () => {
            const { token } = await setupTests()
            await expect(
                token.approve(ethers.constants.AddressZero, 1000)
            ).to.be.revertedWith("ERC20: approve to the zero address")
        })

        it('should emit event on approve', async () => {
            const { token } = await setupTests()
            await expect(
                token.approve(user2.address, 1000)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
        })

        it('should overwrite existing allowance', async () => {
            const { token } = await setupTests()
            await expect(
                token.approve(user2.address, 1000)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
            await expect(
                token.approve(user2.address, 200)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 200)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(200)
            await expect(
                token.approve(user2.address, 4200)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 4200)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(4200)
        })
    })

    describe("increaseAllowance", async () => {

        it('should revert if zero address is approved', async () => {
            const { token } = await setupTests()
            await expect(
                token.increaseAllowance(ethers.constants.AddressZero, 1000)
            ).to.be.revertedWith("ERC20: approve to the zero address")
        })

        it('should revert if increasing unlimited allowance', async () => {
            const { token } = await setupTests()
            await token.approve(user2.address, ethers.constants.MaxUint256)
            await expect(
                token.increaseAllowance(user2.address, 1)
            ).to.be.revertedWith("reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)")
        })

        it('should emit event on approve', async () => {
            const { token } = await setupTests()
            await expect(
                token.increaseAllowance(user2.address, 1000)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
        })

        it('should add to existing allowance', async () => {
            const { token } = await setupTests()
            await expect(
                token.approve(user2.address, 1000)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
            await expect(
                token.increaseAllowance(user2.address, 200)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1200)
        })
    })

    describe("decreaseAllowance", async () => {

        it('should revert if decrease unset allowance', async () => {
            const { token } = await setupTests()
            await expect(
                token.decreaseAllowance(user2.address, 1)
            ).to.be.revertedWith("ERC20: decreased allowance below zero")
        })

        it('should revert if decreased more than set allowance', async () => {
            const { token } = await setupTests()
            await token.approve(user2.address, 100)
            await expect(
                token.decreaseAllowance(user2.address, 101)
            ).to.be.revertedWith("ERC20: decreased allowance below zero")
        })

        it('should emit event on approve', async () => {
            const { token } = await setupTests()
            await token.approve(user2.address, 1500)
            await expect(
                token.decreaseAllowance(user2.address, 500)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
        })

        it('should add to existing allowance', async () => {
            const { token } = await setupTests()
            await expect(
                token.approve(user2.address, 1500)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1500)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1500)
            await expect(
                token.decreaseAllowance(user2.address, 500)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 1000)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(1000)
            await expect(
                token.decreaseAllowance(user2.address, 1000)
            ).to.emit(token, "Approval").withArgs(user1.address, user2.address, 0)
            expect(
                await token.allowance(user1.address, user2.address)
            ).to.be.eq(0)
        })
    })
})