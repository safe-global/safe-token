import { ethers, BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";

export const AddressOne = "0x0000000000000000000000000000000000000001";

export const nameToAddress = (name: string) => {
    switch (name) {
        case "Safe Token": return "0x5aFE3855358E112B5647B952709E6165e1c1eEEe"
        case "Safe Foundation": return "0x8CF60B289f8d31F737049B590b5E4285Ff0Bd1D1"
        case "Safe Foundation Manager": return "0xc894dCacaCF66d904264e47c08a987e64b48c57C"
        case "Strategic Raise": return "0x4beedA344bcb0Ddb4A9edC8E7f0685d2D8A74BF9"
        case "Future team": return "0xB59a8Fd09590074e2Bff05d856e5aa138Ca059bB"
        case "Ecosystem Airdrop": return "0x2eC254E6A262B31Ff26B8D27A68B1978a6301aA1"
        case "User Airdrop": return "0xa7CBfB7CF02c4d84a0522863C908Ea1039458c54"
    }
    return getAddress("0x" + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)).slice(-40))
}