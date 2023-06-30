import { expose } from "threads/worker";
import { writeJson } from "./task_utils";
import { extractProof } from "../utils/proof";
import { Vesting } from "../utils/types";

expose(
  async (
    vestings: { vestingHash: string; vesting: Vesting }[],
    fullTree: string[][]
  ) =>
    await Promise.all(
      vestings.map((vesting) =>
        writeJson(`output/proofs/${vesting.vesting.account}.json`, {
          vesting: vesting.vesting,
          proof: extractProof(vesting.vestingHash, fullTree),
        })
      )
    )
);
