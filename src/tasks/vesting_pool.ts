import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { BigNumber, ethers } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";
import { compatHandler, multiSendCallOnlyLib, proxyFactory, readCsv, safeSingleton, writeTxBuilderJson } from "./task_utils";
import { calculateProxyAddress, encodeMultiSend, MetaTransaction } from "@gnosis.pm/safe-contracts";
import { calculateVestingHash } from "../utils/hash";
import { Vesting } from "../utils/types";

const getDeployerAddress = async (hre: HardhatRuntimeEnvironment): Promise<string | undefined> => {
    const getter = hre.config.deterministicDeployment
    if (!getter) return "0x4e59b44847b379578588920ca78fbf26c0b4956c"
    const chainId = await hre.getChainId()
    if (typeof getter === "function") {
        console.log(getter(chainId))
        return getter(chainId)?.factory
    }
    return getter.chainId?.factory
}

const prepareSalt = (saltInput: string): string => {
    if (ethers.utils.isHexString(saltInput))
        return saltInput
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(saltInput))
}

task("generate_vesting_deployment_tx", "Prints deployment transaction details")
    .addParam("salt", "Salt", "", types.string)
    .addParam("manager", "Manager", nameToAddress("Safe Foundation"), types.string, true)
    .addParam("token", "Token", nameToAddress("Safe Token"), types.string, true)
    .setAction(async (taskArgs, hre) => {
        const deployerAddress = await getDeployerAddress(hre);
        console.log(deployerAddress)
        if (!deployerAddress) throw Error("No deployer specified")
        const artifact = await hre.artifacts.readArtifact("VestingPool")
        const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode)
        const deploymentCode = contractFactory.getDeployTransaction(taskArgs.token, taskArgs.manager).data
        if (!deploymentCode) throw Error("Could not generate deployment code")
        const encodedSalt = ethers.utils.defaultAbiCoder.encode(["bytes32"], [prepareSalt(taskArgs.salt)])
        const targetAddress = ethers.utils.getCreate2Address(
            deployerAddress,
            encodedSalt,
            ethers.utils.keccak256(deploymentCode)
        )
        console.log("Expected target address", targetAddress)
        console.log("Transaction target", deployerAddress)
        console.log("Transaction data", encodedSalt + deploymentCode.toString().slice(2))
    });

const calculateRequiredTokens = (inputs: { amount: string }[]): BigNumber => {
    let sum = BigNumber.from(0)
    for(const input of inputs) {
        sum = sum.add(BigNumber.from(input.amount))
    }
    return sum
}

task("build_add_vestings_tx", "Creates a multisend transaction to assign multiple vestings based on a CSV")
    .addFlag("transferTokens", "Indicate whether a the multisend should include the transfer of the required tokens")
    .addFlag("createSafes", "Indicate whether a new Safe should be created for each vesting")
    .addFlag("showVestings", "Indicate whether to display the information of the vestings that will be created")
    .addPositionalParam("csv", "CSV file with the information of the Safes that should be created", undefined, types.inputFile)
    .addParam("defaultOwner", "The default owner of the new vesting (or the Safe for the vesting) if no owner is specified", nameToAddress("Safe Foundation"), types.string, true)
    .addParam("pool", "Address of the vesting pool", "", types.string)
    .addParam("defaultManaged", "Flag if the vesting should be managed by default if not defined in CSV", false, types.boolean, true)
    .addParam("defaultCurve", "Curve that should be used if not defined in CSV", "0", types.string, true)
    .addParam("defaultStartDate", "Start date as unix timestamp that should be used if not defined in CSV", "", types.string, true)
    .addParam("defaultDuration", "Duration in weeks that should be used if not defined in CSV", "", types.string, true)
    .addParam("tokenAddress", "Token address that should be used for transfers (by default it tries to query this from the vesting pool)", "", types.string, true)
    .addParam("export", "If specified instead of executing the data will be exported as a json file for the transaction builder", undefined, types.string, true)
    .setAction(async (taskArgs, hre) => {
        if (!taskArgs.pool) throw Error("No vesting pool specified")

        const inputs: { 
            owner: string | undefined,
            amount: string,
            nonce: string,
            curveType: string | undefined,
            startDate: string | undefined,
            duration: string | undefined,
            managed: boolean | undefined,
            expectedSafe: boolean | undefined
        }[] = await readCsv(taskArgs.csv)
        const txs: MetaTransaction[] = []
        const vestings: { vestingHash: string, vesting: Vesting }[] = []

        const vestingPool = await hre.ethers.getContractAt("VestingPool", taskArgs.pool)      
        if (taskArgs.transferTokens) {
            const tokenAddress = taskArgs.tokenAddress || await vestingPool.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress) 
            const requiredTokens = calculateRequiredTokens(inputs)
            const transferData = token.interface.encodeFunctionData("transfer", [vestingPool.address, requiredTokens])
            txs.push({ to: token.address, data: transferData, operation: 0, value: "0" })
        }
        for (const input of inputs) {
            const vestingOwner = input.owner || taskArgs.defaultOwner 
            let vestingTarget = vestingOwner
            if (taskArgs.createSafes) {
                const singleton = await safeSingleton(hre)
                const factory = await proxyFactory(hre)
                const fallbackHandler = await compatHandler(hre)
                const setupData = singleton.interface.encodeFunctionData(
                    "setup",
                    [[vestingOwner], 1, AddressZero, "0x", fallbackHandler.address, AddressZero, 0, AddressZero]
                )
                const data = factory.interface.encodeFunctionData("createProxyWithNonce", [singleton.address, setupData, input.nonce])
                txs.push({ to: factory.address, data, operation: 0, value: "0" })
                vestingTarget = await calculateProxyAddress(factory, singleton.address, setupData, input.nonce)
                if (input.expectedSafe !== undefined && input.expectedSafe !== vestingTarget) 
                    throw Error(`Unexpected vesting target Safe! Expected ${input.expectedSafe} got ${vestingTarget}`)
            }
            /*
            address account,
            uint8 curveType,
            bool managed,
            uint16 durationWeeks,
            uint64 startDate,
            uint128 amount
            */
            const vestingData = vestingPool.interface.encodeFunctionData("addVesting", [
                vestingTarget,
                input.curveType || taskArgs.defaultCurve,
                input.managed !== undefined ? input.managed : taskArgs.defaultManaged,
                input.duration || taskArgs.defaultDuration,
                input.startDate || taskArgs.defaultStartDate,
                input.amount
            ])
            const vesting = {
                account: vestingTarget,
                curveType: input.curveType || taskArgs.defaultCurve,
                managed: input.managed !== undefined ? input.managed : taskArgs.defaultManaged,
                durationWeeks: input.duration || taskArgs.defaultDuration,
                startDate: input.startDate || taskArgs.defaultStartDate,
                amount: input.amount
            }
            vestings.push({ vestingHash: calculateVestingHash(vestingPool, vesting, 1), vesting})
            txs.push({ to: vestingPool.address, data: vestingData, operation: 0, value: "0" })
        }

        if (taskArgs.export) {
            const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString()
            await writeTxBuilderJson(taskArgs.export, chainId, txs, "Batched Vesting Creations")
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