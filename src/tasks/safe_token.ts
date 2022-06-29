import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { BigNumber, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";

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

task("check_vanity_token", "Calculates an address for a salt")
    .addParam("salt", "Salt", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const deployerAddress = await getDeployerAddress(hre);
        console.log(deployerAddress)
        if (!deployerAddress) throw Error("No deployer specified")
        const artifact = await hre.artifacts.readArtifact("SafeToken")
        const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode)
        const deploymentCode = contractFactory.getDeployTransaction(nameToAddress("Safe Foundation")).data
        if (!deploymentCode) throw Error("Could not generate deployment code")
        const targetAddress = ethers.utils.getCreate2Address(
            deployerAddress,
            taskArgs.salt,
            ethers.utils.keccak256(deploymentCode)
        )
        console.log(targetAddress)
    });

task("generate_token_deployment_tx", "Prints deployment transaction details")
    .addParam("salt", "Salt", "", types.string)
    .addParam("manager", "Manager", nameToAddress("Safe Foundation"), types.string, true)
    .setAction(async (taskArgs, hre) => {
        const deployerAddress = await getDeployerAddress(hre);
        console.log(deployerAddress)
        if (!deployerAddress) throw Error("No deployer specified")
        const artifact = await hre.artifacts.readArtifact("SafeToken")
        const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode)
        const deploymentCode = contractFactory.getDeployTransaction(taskArgs.manager).data
        if (!deploymentCode) throw Error("Could not generate deployment code")
        const encodedSalt = ethers.utils.defaultAbiCoder.encode(["bytes32"], [taskArgs.salt])
        const targetAddress = ethers.utils.getCreate2Address(
            deployerAddress,
            encodedSalt,
            ethers.utils.keccak256(deploymentCode)
        )
        console.log("Expected target address", targetAddress)
        console.log("Transaction target", deployerAddress)
        console.log("Transaction data", encodedSalt + deploymentCode.toString().slice(2))
    });

task("vanity_token", "Tries to find a vanity address for the token contract")
    .addParam("prefix", "Prefix with which the address should start", "", types.string, true)
    .addParam("postfix", "Postfix with which the address should end", "", types.string, true)
    .addParam("offset", "Salt starting offset", "0", types.string, true)
    .addParam("step", "Salt step size", "1", types.string, true)
    .addParam("tries", "Maxiumum tries", -1, types.float, true)
    .setAction(async (taskArgs, hre) => {
        const deployerAddress = await getDeployerAddress(hre);
        if (!deployerAddress) throw Error("No deployer specified")
        const artifact = await hre.artifacts.readArtifact("SafeToken")
        const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode)
        const deploymentCode = contractFactory.getDeployTransaction(nameToAddress("Safe Foundation")).data
        if (!deploymentCode) throw Error("Could not generate deployment code")
        const cleanPrefix = taskArgs.prefix.toLowerCase()
        const cleanPostfix = taskArgs.postfix.toLowerCase()
        let saltNumeric = BigNumber.from(taskArgs.offset);
        let step = BigNumber.from(taskArgs.step);
        let found = 0
        let tries = 0
        while (taskArgs.tries < 0 || tries < taskArgs.tries) {
            const encodedSalt = ethers.utils.defaultAbiCoder.encode(["uint256"], [saltNumeric])
            const targetAddress = ethers.utils.getCreate2Address(
                deployerAddress,
                encodedSalt,
                ethers.utils.keccak256(deploymentCode)
            )
            const cleanTargetAddress = targetAddress.slice(2).toLowerCase()
            if (cleanTargetAddress.startsWith(cleanPrefix) &&
                cleanTargetAddress.endsWith(cleanPostfix)) {
                found++
                console.log(targetAddress, encodedSalt)
            }
            saltNumeric = saltNumeric.add(step)
            tries++
            if (tries%10000 == 0) console.log("0x", cleanPrefix, "...", cleanPostfix, "@ salt", saltNumeric.toString(), "found", found)
        }
    });

export { }