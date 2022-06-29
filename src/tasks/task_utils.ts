import fs from 'fs/promises'
import fsSync from 'fs'
import csvParser from "csv-parser"
import { MetaTransaction } from '@gnosis.pm/safe-contracts'
import { Contract } from "@ethersproject/contracts";
import { getCompatibilityFallbackHandlerDeployment, getMultiSendDeployment, getProxyFactoryDeployment, getSafeSingletonDeployment, getSafeL2SingletonDeployment, SingletonDeployment, getMultiSendCallOnlyDeployment } from "@gnosis.pm/safe-deployments";
import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";

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


export const writeJson = async(file: string, content: any) => {
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