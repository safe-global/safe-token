import { ethers, BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";

export const AddressOne = "0x0000000000000000000000000000000000000001";

export const nameToAddress = (name: string) => {
    switch (name) {
        case "Safe Token": return "0x5aFE3855358E112B5647B952709E6165e1c1eEEe"
        case "Safe Foundation": return "0x8CF60B289f8d31F737049B590b5E4285Ff0Bd1D1"
        case "Safe Foundation Manager": return "0xc894dCacaCF66d904264e47c08a987e64b48c57C"
        case "Investor Vestings": return "0x96b71e2551915d98d22c448b040a3bc4801ea4ff"
        case "Ecosystem Airdrop": return "0x29067f28306419923bcff96e37f95e0f58abdbbe"
        case "User Airdrop": return "0xA0b937D5c8E32a80E3a8ed4227CD020221544ee6"
    }
    return getAddress("0x" + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)).slice(-40))
}