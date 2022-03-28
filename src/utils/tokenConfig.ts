import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat"

export const AddressOne = "0x0000000000000000000000000000000000000001";

export const nameToAddress = (name: string) => {
    switch (name) {
        case "Safe Token": return "0x6F5A1810eA392cbfb4bdc55C14488e752c18C242"
        case "Strategic Raise": return "0xE005Be86ff21CcFDa30b0cD9B4b1f31b9Dca41d7"
        case "Future team": return "0x43Bd457B59159da3d1A94Dd5473AA7B72D2587BC"
        case "Ecosystem Airdrop": return "0x222EAB9ae8dC5bf0aE88f9AE31F5fcfD092Ac78f"
        case "User Airdrop": return "0xC37D57836a658957F10B82262fa0bED0764030dE"
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