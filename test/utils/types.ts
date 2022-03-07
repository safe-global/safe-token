import { BigNumberish } from "ethers"

export interface Vesting {
    account: string,
    curveType: number,
    managed: boolean,
    durationWeeks: number,
    startDate: number,
    amount: BigNumberish
}