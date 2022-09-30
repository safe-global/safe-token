import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import fsSync from 'fs'
import { task, types } from "hardhat/config";
import { BigNumber, Contract, ethers } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";
import { calculateRequiredTokens, compatHandler, multiSendCallOnlyLib, prepareSalt, proxyFactory, readCsv, safeSingleton, writeTxBuilderJson } from "./task_utils";
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

const loadVestingDetails = async (vestingPool: Contract, vestingId: string, tokenInfo: { decimals: BigNumber | number, symbol: string }, quiet?: boolean): Promise<Vesting> => {
    const vesting = await vestingPool.vestings(vestingId)
    if (!quiet) {
        console.log("Vesting Details")
        console.log("Account:", vesting.account)
        console.log("Amount:", ethers.utils.formatUnits(vesting.amount, tokenInfo.decimals), tokenInfo.symbol)
        const startDate = new Date(vesting.startDate * 1000)
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 7 * vesting.durationWeeks)
        console.log("Start Date:", startDate.toUTCString())
        console.log("End Date:", endDate.toUTCString())
        console.log("Duration:", vesting.durationWeeks, "weeks")
        console.log("Managed:", vesting.managed)
        console.log("Cancelled:", vesting.cancelled)
    }
    return vesting
}

task("show_vesting", "Prints vesting details")
    .addParam("pool", "Vesting pool which should be queried", "", types.string)
    .addParam("id", "Id of the vesting for which to query information", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const vestingPool = await hre.ethers.getContractAt("VestingPool", taskArgs.pool)
        let decimals = 0
        let symbol = ""
        try {
            const tokenAddress = await vestingPool.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress)
            decimals = await token.decimals()
            symbol = await token.symbol()
        } catch {
            console.warn("Could not load token info!")
        }
        return await loadVestingDetails(vestingPool, taskArgs.id, { decimals, symbol })
    });

task("show_vestings", "Prints vesting details")
    .addPositionalParam("csv", "CSV file with the information of the Safes that should be created", undefined, types.inputFile)
    .addParam("pool", "Vesting pool which should be queried", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const vestingPool = await hre.ethers.getContractAt("VestingPool", taskArgs.pool)
        let decimals = 0
        let symbol = ""
        try {
            const tokenAddress = await vestingPool.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress)
            decimals = await token.decimals()
            symbol = await token.symbol()
        } catch {
            console.warn("Could not load token info!")
        }
        const inputs: {
            vestingId: string | undefined,
        }[] = await readCsv(taskArgs.csv)
        for (const input of inputs) {
            if (input.vestingId) {
                await loadVestingDetails(vestingPool, input.vestingId, { decimals, symbol })
            }
            console.log("")
        }
    });

task("list_vestings", "Prints all vesting details")
    .addParam("pool", "Vesting pool which should be queried", nameToAddress("Investor Vestings"), types.string, true)
    .addParam("export", "If specified instead of printing the data will be exported as a json file for the transaction builder", undefined, types.string, true)
    .setAction(async (taskArgs, hre) => {
        const vestingPool = await hre.ethers.getContractAt("VestingPool", taskArgs.pool)
        const addedVestingEvents = await vestingPool.queryFilter(vestingPool.filters.AddedVesting(), "earliest", "latest")
        console.log(addedVestingEvents.length, "Vestings have been created")
        let decimals = 0
        let symbol = ""
        try {
            const tokenAddress = await vestingPool.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress)
            decimals = await token.decimals()
            symbol = await token.symbol()
        } catch {
            console.warn("Could not load token info!")
        }
        var output: fsSync.WriteStream|undefined = undefined
        if (taskArgs.export) {
            output = fsSync.createWriteStream(taskArgs.export)
            output.write("vestingId,owner,amount,startDate,duration\n")
        }  
        for (const event of addedVestingEvents) {
            const vestingId = event.args?.id
            if (!vestingId) throw Error("Vesting ID missing in event")
            const vesting = await loadVestingDetails(vestingPool, vestingId, { decimals, symbol })
            if (output) {
                const startDate = new Date(vesting.startDate * 1000)
                output.write(`${vestingId},${vesting.account},${vesting.amount},${startDate.toISOString()},${vesting.durationWeeks}\n`)
            }
        }
        if (output) {
            output.end()
        }
    });

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

task("build_add_vestings_tx", "Creates a multisend transaction to assign multiple vestings based on a CSV")
    .addFlag("transferTokens", "Indicate whether the multisend should include the transfer of the required tokens")
    .addFlag("forceFullTokenTransfer", "Indicate whether to force that all required token are transfered (e.g. don't use existing tokens on the pool)")
    .addFlag("createSafes", "Indicate whether a new Safe should be created for each vesting")
    .addFlag("showVestings", "Indicate whether to display the information of the vestings that will be created")
    .addPositionalParam("csv", "CSV file with the information of the vestings that should be created", undefined, types.inputFile)
    .addParam("defaultOwner", "The default owner of the new vesting (or the Safe for the vesting) if no owner is specified", nameToAddress("Safe Foundation Manager"), types.string, true)
    .addParam("pool", "Address of the vesting pool", "", types.string)
    .addParam("defaultManaged", "Flag if the vesting should be managed by default if not defined in CSV", false, types.boolean, true)
    .addParam("defaultCurve", "Curve that should be used if not defined in CSV", "0", types.string, true)
    .addParam("defaultStartDate", "Start date as unix timestamp that should be used if not defined in CSV", "", types.string, true)
    .addParam("defaultDuration", "Duration in weeks that should be used if not defined in CSV", "", types.string, true)
    .addParam("token", "Token address that should be used for transfers (by default it tries to query this from the vesting pool)", "", types.string, true)
    .addParam("tokenAmount", "Token amount that should be be transferred to vesting pool (by default it the required amount for the vestings to be created is used)", "", types.string, true)
    .addParam("export", "If specified instead of printing the data will be exported as a json file for the transaction builder", undefined, types.string, true)
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
            expectedSafe: string | undefined
        }[] = await readCsv(taskArgs.csv)
        const txs: MetaTransaction[] = []
        const vestings: { vestingHash: string, vesting: Vesting }[] = []

        const vestingPool = await hre.ethers.getContractAt("VestingPool", taskArgs.pool)
        if (taskArgs.transferTokens) {
            const tokenAddress = taskArgs.tokenAddress || await vestingPool.token()
            const token = await hre.ethers.getContractAt("SafeToken", tokenAddress)
            const requiredTokens = taskArgs.tokenAmount !== "" ? BigNumber.from(taskArgs.tokenAmount) : calculateRequiredTokens(inputs)
            let tokenToTransfer = requiredTokens;
            if (!taskArgs.forceFullTokenTransfer) {
                const availableTokens = await vestingPool.tokensAvailableForVesting()
                tokenToTransfer = requiredTokens.sub(availableTokens)
            }
            if (tokenToTransfer.gt(0)) {
                console.log("Amount of tokens missing:", hre.ethers.utils.formatEther(tokenToTransfer))
                const transferData = token.interface.encodeFunctionData("transfer", [vestingPool.address, tokenToTransfer])
                txs.push({ to: token.address, data: transferData, operation: 0, value: "0" })
            }
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
            const chainId = (await hre.ethers.provider.getNetwork()).chainId
            vestings.push({ vestingHash: calculateVestingHash(vestingPool, vesting, chainId), vesting })
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