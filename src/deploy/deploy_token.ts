import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";

const deploy: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deterministic } = deployments;

  const deploymentConfig = await deterministic("SafeToken", {
    from: deployer,
    args: [nameToAddress("Safe Foundation")],
    log: true,
    salt: "0x00000000000000000000000000000000000000000000000000000000236dd1d0",
  });
  console.log("Address", deploymentConfig.address)
  const deployment = await deploymentConfig.deploy()
  console.log("Gas used for token deployment:", deployment?.receipt?.gasUsed?.toString())
  console.log("Token deployed to", deployment.address)
};

deploy.tags = ['token']
export default deploy;
