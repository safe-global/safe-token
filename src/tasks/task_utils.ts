import fs from 'fs/promises'
import fsSync from 'fs'
import csvParser from "csv-parser"
import { MetaTransaction } from '@gnosis.pm/safe-contracts'
import { Contract } from "@ethersproject/contracts";
import { getCompatibilityFallbackHandlerDeployment, getMultiSendDeployment, getProxyFactoryDeployment, getSafeSingletonDeployment, getSafeL2SingletonDeployment, SingletonDeployment, getMultiSendCallOnlyDeployment } from "@gnosis.pm/safe-deployments";
import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";
import { BigNumber, ethers } from 'ethers';

export const contractFactory = (hre: HRE, contractName: string) => hre.ethers.getContractFactory(contractName);

export const contractInstance = async (hre: HRE, deployment: SingletonDeployment | undefined, address?: string): Promise<Contract> => {
    if (!deployment) throw Error("No deployment provided")
    // TODO: use network
    const contractAddress = address || deployment.defaultAddress
    return await hre.ethers.getContractAt(deployment.abi, contractAddress)
}

export const safeSingleton = async (hre: HRE, address?: string) =>
    contractInstance(hre, getSafeSingletonDeployment({ released: undefined }), address)

export const safeL2Singleton = async (hre: HRE, address?: string) =>
    contractInstance(hre, getSafeL2SingletonDeployment({ released: undefined }), address)

export const proxyFactory = async (hre: HRE, address?: string) =>
    contractInstance(hre, getProxyFactoryDeployment(), address)

export const multiSendLib = async (hre: HRE, address?: string) =>
    contractInstance(hre, getMultiSendDeployment(), address)

export const multiSendCallOnlyLib = async (hre: HRE, address?: string) =>
    contractInstance(hre, getMultiSendCallOnlyDeployment(), address)

export const compatHandler = async (hre: HRE, address?: string) =>
    contractInstance(hre, getCompatibilityFallbackHandlerDeployment(), address)


export const writeJson = async (file: string, content: any) => {
    await fs.writeFile(file, JSON.stringify(content, null, 2))
}

export const writeTxBuilderJson = async(file: string, chainId: string, transactions: MetaTransaction[], name?: string, description?: string) => {
    return writeJson(file, {
        version: "1.0",
        chainId,
        createdAt: new Date().getTime(),
        meta: {
            name,
            description
        },
        transactions
    })
}

export const readCsv = async<T>(file: string): Promise<T[]> => new Promise((resolve, reject) => {
    const results: T[] = [];
    fsSync.createReadStream(file).pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("error", (err) => { reject(err) })
        .on("end", () => { resolve(results)})
})

export const prepareSalt = (saltInput: string): string => {
    if (ethers.utils.isHexString(saltInput))
        return saltInput
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(saltInput))
}

export const getDeployerAddress = async (hre: HRE): Promise<string | undefined> => {
    const getter = hre.config.deterministicDeployment
    if (!getter) return "0x4e59b44847b379578588920ca78fbf26c0b4956c"
    const chainId = await hre.getChainId()
    if (typeof getter === "function") {
        console.log(getter(chainId))
        return getter(chainId)?.factory
    }
    return getter.chainId?.factory
}

export const calculateRequiredTokens = (inputs: { amount: string }[], decimals: number = 0): BigNumber => {
    let sum = BigNumber.from(0)
    for(const input of inputs) {
        sum = sum.add(ethers.utils.parseUnits(input.amount, decimals))
    }
    return sum
}
