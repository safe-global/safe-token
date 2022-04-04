import { ethers } from "ethers";
import { DeployFunction, DeployResult } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";

const deployPool = async(deployer: any, deployFunc: any, name: string, asAirdrop: boolean = false) => {
  const deploymentConfig = await deployFunc(asAirdrop ? "Airdrop" : "VestingPool", {
    from: deployer,
    args: [nameToAddress("Safe Token"), nameToAddress("Safe Dao")],
    log: true,
    salt: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
  });
  console.log(`${name} to ${deploymentConfig.address}`)
  if (nameToAddress(name) !== deploymentConfig.address) console.error("Update deployment address")
  return deploymentConfig.deploy()
}

const deploy: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deterministic } = deployments;

  // Vesting pools
  // await deployPool(deployer, deterministic, "DAOs")
  // await deployPool(deployer, deterministic, "Strategic Raise")
  // await deployPool(deployer, deterministic, "Future team")

  // Airdrops pools
  // await deployPool(deployer, deterministic, "Ecosystem Airdrop", true)
  // await deployPool(deployer, deterministic, "User Airdrop", true)
};

deploy.tags = ['vesting']
export default deploy;
