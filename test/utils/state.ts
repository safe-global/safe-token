import { BigNumberish } from "ethers"
import { ethers } from "hardhat"

export const setNextBlockTime = async (timestamp:BigNumberish) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]) 
}