import { BigNumberish } from "ethers"
import { ethers } from "hardhat"

export const setNextBlockTime = async (timestamp: BigNumberish, mine: boolean = false) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
    if (mine) {
        await mineBlock()
    }
}

export const mineBlock = async () => {
    await ethers.provider.send("evm_mine", [])
}