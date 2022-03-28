import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import loadTokenConfig from "../utils/tokenConfig";

const deploy: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  const tokenConfig = loadTokenConfig()

  const deployment = await deploy("SafeToken", {
    from: deployer,
    args: [tokenConfig.safeDao],
    log: true,
    deterministicDeployment: true,
  });
  console.log("Gas used for token deployment:", deployment?.receipt?.gasUsed?.toString())
  console.log("Token deployed to", deployment.address)
  //const token = new ethers.Contract(deployment.address, deployment.abi, hre.ethers.provider.getSigner(tokenConfig.safeDao))
  //await token.initialize(tokenConfig.initialTokenHolders, tokenConfig.initialTokenAmounts)
};

deploy.tags = ['token']
export default deploy;
