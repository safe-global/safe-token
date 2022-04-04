import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { nameToAddress } from "../utils/tokenConfig";

const deploy: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  const deployment = await deploy("SafeToken", {
    from: deployer,
    args: [nameToAddress("Safe Foundation")],
    log: true,
    deterministicDeployment: true,
  });
  console.log("Gas used for token deployment:", deployment?.receipt?.gasUsed?.toString())
  console.log("Token deployed to", deployment.address)
};

deploy.tags = ['token']
export default deploy;
