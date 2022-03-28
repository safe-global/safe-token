import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat"

export const AddressOne = "0x0000000000000000000000000000000000000001";

export const nameToAddress = (name: string) => {
    switch (name) {
        case "Safe Token": return "0x164FF0341AC389F4989FB4F22Fae4401BceA547D"
        case "Strategic Raise": return "0x4beedA344bcb0Ddb4A9edC8E7f0685d2D8A74BF9"
        case "Future team": return "0xB59a8Fd09590074e2Bff05d856e5aa138Ca059bB"
        case "Ecosystem Airdrop": return "0x2eC254E6A262B31Ff26B8D27A68B1978a6301aA1"
        case "User Airdrop": return "0xa7CBfB7CF02c4d84a0522863C908Ea1039458c54"
    }
    return getAddress("0x" + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)).slice(-40))
}

interface TokenSetup {
    initialTokenHolders: string[]
    initialTokenAmounts: BigNumber[]
}

const addIntialTokenHolder = (setup: TokenSetup, address: string, amount: number) => {
    setup.initialTokenHolders.push(address)
    setup.initialTokenAmounts.push(ethers.utils.parseUnits(amount.toString(), 18))
}

export const loadTokenConfig = () => {
    const setup = {
        initialTokenHolders: [],
        initialTokenAmounts: []
    }
    const safeDao = nameToAddress("Safe Dao")
    // 40%
    // This is a Safe instance
    addIntialTokenHolder(setup, safeDao, 400_000_000)
    // 11% -> ~40 people
    const teamMembers = 40
    for (let i = 0; i < teamMembers; i++) {
        // This is a Safe instance
        addIntialTokenHolder(setup, nameToAddress("Safe Team" + i), 110_000_000 / teamMembers)
    }
    // 4% people
    // This is a VestingPool contract instance
    addIntialTokenHolder(setup, nameToAddress("Future Safe Team"), 40_000_000)
    // 8%
    // This is a VestingPool contract instance
    addIntialTokenHolder(setup, nameToAddress("Strategic Raise"), 80_000_000)
    // 7%
    // This is a Safe instance
    addIntialTokenHolder(setup, nameToAddress("Safe Foundation"), 70_000_000)
    // 15%
    // This is a Safe instance
    addIntialTokenHolder(setup, nameToAddress("Gnosis Dao"), 150_000_000)
    // 5%
    // This is a Safe instance
    addIntialTokenHolder(setup, nameToAddress("Dao Shared Treasury"), 50_000_000)
    // 5%
    // This is an Airdrop contract instance
    addIntialTokenHolder(setup, nameToAddress("User Airdrop"), 50_000_000)
    // 5%
    // This is an Airdrop contract instance
    addIntialTokenHolder(setup, nameToAddress("Ecosystem Airdrop"), 50_000_000)
    return {
        safeDao,
        ...setup
    }
}

export default loadTokenConfig