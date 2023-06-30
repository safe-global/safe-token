import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { BigNumber, Contract, ethers } from "ethers";
import { spawn, Worker, Thread } from "threads"
import { nameToAddress } from "../utils/tokenConfig";
import { calculateRequiredTokens, compatHandler, getDeployerAddress, multiSendCallOnlyLib, prepareSalt, proxyFactory, readCsv, safeSingleton, writeJson, writeTxBuilderJson } from "./task_utils";
import { calculateProxyAddress, encodeMultiSend, MetaTransaction } from "@gnosis.pm/safe-contracts";
import { calculateVestingHash } from "../utils/hash";
import { Vesting } from "../utils/types";
import { generateFullTree, generateProof, generateRoot } from "../utils/proof";

function splitToChunks<T>(sourceArray: T[], chunkSize: number): T[][] {
    let result: T[][] = [];
    for (let i = 0; i < sourceArray.length; i += chunkSize) {
        result[i / chunkSize] = sourceArray.slice(i, i + chunkSize);
    }

    return result;
}

task("airdrop_info", "Prints vesting details")
    .addPositionalParam("airdrop", "Airdrop which should be queried", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const airdrop = await hre.ethers.getContractAt("Airdrop", taskArgs.airdrop)
        const tokenAddress = await airdrop.token()
        console.log({
            airdrop: airdrop.address,
            tokenAddress,
            manager: await airdrop.poolManager(),
            root: await airdrop.root(),
            redeemDeadline: await airdrop.redeemDeadline()
        })
    });

task("generate_airdrop_deployment_tx", "Prints deployment transaction details")
    .addFlag("quiet", "Indicate if the information should be printed")
    .addParam("salt", "Salt", "", types.string)
    .addParam("manager", "Manager that is responsible for the airdrop", nameToAddress("Safe Foundation"), types.string, true)
    .addParam("token", "Token that should be airdropped", nameToAddress("Safe Token"), types.string, true)
    .addParam("redeemDeadline", "Date until which the airdrop can be redeemed", "2026-06-08", types.string, true)
    .setAction(async (taskArgs, hre) => {
        const deployerAddress = await getDeployerAddress(hre);
        console.log({ deployerAddress })
        if (!deployerAddress) throw Error("No deployer specified")
        const artifact = await hre.artifacts.readArtifact("Airdrop")
        const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode)
        const redeemDeadline = Math.floor(Date.parse(taskArgs.redeemDeadline) / 1000)
        console.log({ redeemDeadline })
        const deploymentCode = contractFactory.getDeployTransaction(taskArgs.token, taskArgs.manager, redeemDeadline).data
        if (!deploymentCode) throw Error("Could not generate deployment code")
        const encodedSalt = ethers.utils.defaultAbiCoder.encode(["bytes32"], [prepareSalt(taskArgs.salt)])
        const targetAddress = ethers.utils.getCreate2Address(
            deployerAddress,
            encodedSalt,
            ethers.utils.keccak256(deploymentCode)
        )
        const deploymentData = encodedSalt + deploymentCode.toString().slice(2)
        console.log("Expected target address", targetAddress)
        if (!taskArgs.quiet) {
            console.log("Transaction target", deployerAddress)
            console.log("Transaction data", deploymentData)
        }
        return {
            expectedAddress: targetAddress,
            deployer: deployerAddress,
            data: deploymentData
        }
    });

task("build_airdrop_init_tx", "Creates a multisend transaction to assign multiple vestings based on a CSV")
    .addFlag("deploy", "Indicate whether the airdrop should be deployed as part of this command")
    .addFlag("transferTokens", "Indicate whether the multisend should include the transfer of the required tokens")
    .addFlag("generateProofs", "Indicate whether all proofs should be generated")
    .addPositionalParam("csv", "CSV file with the information for the accounts that should receive an aidrop", undefined, types.inputFile)
    .addParam("airdrop", "Address of the airdrop (optional if --deploy is used)", "", types.string, true)
    .addParam("defaultCurve", "Curve that should be used if not defined in CSV", "0", types.string, true)
    .addParam("defaultStartDate", "Start date that should be used if not defined in CSV", "2022-06-08", types.string, true)
    .addParam("defaultDuration", "Duration in weeks that should be used if not defined in CSV", "", types.string, true)
    .addParam("token", "Token address that should be used for transfers (by default it tries to query this from the vesting pool)", "", types.string, true)
    .addParam("tokenAmount", "Token amount that should be be transferred to vesting pool (by default it the required amount for the vestings to be created is used)", "", types.string, true)
    .addParam("export", "If specified instead of printing the data will be exported as a json file for the transaction builder", undefined, types.string, true)
    .addParam("salt", "Salt", "", types.string)
    .addParam("manager", "Manager that is responsible for the airdrop", nameToAddress("Safe Foundation"), types.string, true)
    .addParam("redeemDeadline", "Date until which the airdrop can be redeemed", "2026-06-08", types.string, true)
    .addParam("decimals", "Specifies by how many decimals the amount in the csv should be offset (by default it is assumed that token atoms is used)", 0, types.int, true)
    .setAction(async (taskArgs, hre) => {
        const txs: MetaTransaction[] = []
        const merkleLeaves: string[] = []
        const vestings: { vestingHash: string, vesting: Vesting }[] = []

        if (taskArgs.deploy) {
            const deploymentTx = await hre.run("generate_airdrop_deployment_tx", {
                salt: taskArgs.salt,
                manager: taskArgs.manager,
                token: taskArgs.token,
                redeemDeadline: taskArgs.redeemDeadline,
                quiet: !!taskArgs.export
            })
            txs.push({ to: deploymentTx.deployer, data: deploymentTx.data, operation: 0, value: "0" })
            if (taskArgs.airdrop && taskArgs.airdrop != deploymentTx.expectedAddress)
                throw Error(`Unexpected airdrop address! Expected ${taskArgs.airdrop} got ${deploymentTx.expectedAddress}`)
            taskArgs.airdrop = deploymentTx.expectedAddress
        }
        if (!taskArgs.airdrop) throw Error("No airdrop specified")

        const inputs: {
            owner: string,
            amount: string,
            nonce: string,
            curveType: string | undefined,
            startDate: string | undefined,
            duration: string | undefined,
        }[] = await readCsv(taskArgs.csv)

        const airdrop = await hre.ethers.getContractAt("Airdrop", taskArgs.airdrop)
        if (taskArgs.transferTokens) {
            const tokenAddress = taskArgs.token || await airdrop.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress)
            const requiredTokens = taskArgs.tokenAmount !== "" ? BigNumber.from(taskArgs.tokenAmount) : calculateRequiredTokens(inputs, taskArgs.decimals)
            console.log(inputs.length, "vestings")
            console.log("Required tokens", requiredTokens.toString())
            const transferData = token.interface.encodeFunctionData("transfer", [airdrop.address, requiredTokens])
            txs.push({ to: token.address, data: transferData, operation: 0, value: "0" })
        }
        const chainId = (await hre.ethers.provider.getNetwork()).chainId
        for (const input of inputs) {
            const vestingAmount = ethers.utils.parseUnits(input.amount, taskArgs.decimals)
            const vestingOwner = input.owner || taskArgs.defaultOwner
            const vesting = {
                account: vestingOwner,
                curveType: input.curveType || taskArgs.defaultCurve,
                managed: false,
                durationWeeks: input.duration || taskArgs.defaultDuration,
                startDate: Math.floor(Date.parse(input.startDate || taskArgs.defaultStartDate) / 1000),
                amount: vestingAmount
            }
            const vestingHash = calculateVestingHash(airdrop, vesting, chainId)
            merkleLeaves.push(vestingHash)
            vestings.push({ vestingHash, vesting })
        }
        console.log("Merkle leaves", merkleLeaves.length)
        const root = generateRoot(merkleLeaves)
        console.log(`Merkle root: ${root}`)
        if (taskArgs.generateProofs) {
            console.log(`Generating Full Tree`)
            const fullTree = generateFullTree(merkleLeaves)
            console.log(`Generating Proofs`)
            const writeProof = await spawn(new Worker("./writeProofWorker"))
            const chunks = splitToChunks(vestings, 10000)

            await Promise.all(chunks.map(chunk => writeProof(chunk, fullTree)))
            await Thread.terminate(writeProof)
            console.log(`Generated all Proofs`)
        }
        const initData = airdrop.interface.encodeFunctionData("initializeRoot", [root])
        txs.push({ to: airdrop.address, data: initData, operation: 0, value: "0" })

        if (taskArgs.export) {
            await writeTxBuilderJson(taskArgs.export, chainId.toString(), txs, "Airdrop setup")
        } else {
            const multiSend = await multiSendCallOnlyLib(hre)
            console.log(`To: ${multiSend.address}`)
            const multiSendData = multiSend.interface.encodeFunctionData("multiSend", [encodeMultiSend(txs)])
            console.log(`Data: ${multiSendData}`)
        }
        if (taskArgs.showVestings) {
            console.log(`Vestings:`, vestings)
        }
    });
