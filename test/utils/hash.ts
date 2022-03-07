import { BigNumberish, Contract, utils } from "ethers"
import { Vesting } from "./types"

export const EIP_DOMAIN = {
    EIP712Domain: [
        { type: "uint256", name: "chainId" },
        { type: "address", name: "verifyingContract" }
    ]
}

export const EIP712_VESTING_TYPE = {
    // "Vesting(address account,uint8 curveType,bool managed,uint16 durationWeeks,uint64 startDate,uint128 amount)"
    Vesting: [
        { type: "address", name: "account" },
        { type: "uint8", name: "curveType" },
        { type: "bool", name: "managed" },
        { type: "uint16", name: "durationWeeks" },
        { type: "uint64", name: "startDate" },
        { type: "uint128", name: "amount" }
    ]
}

export const preimageVestingHash = (pool: Contract, vesting: Vesting, chainId: BigNumberish): string => {
    return utils._TypedDataEncoder.encode({ verifyingContract: pool.address, chainId }, EIP712_VESTING_TYPE, vesting)
}

export const calculateVestingHash = (pool: Contract, vesting: Vesting, chainId: BigNumberish): string => {
    return utils._TypedDataEncoder.hash({ verifyingContract: pool.address, chainId }, EIP712_VESTING_TYPE, vesting)
}