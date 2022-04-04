import "@nomiclabs/hardhat-ethers";
import hre, { deployments, ethers, waffle } from "hardhat";
import { getExecutor, getToken, getMock } from "../utils/setup";
import { parseEther } from "@ethersproject/units";
import { AddressOne, nameToAddress } from "../../src/utils/tokenConfig";

export const setupTokenTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture();
    const token = await getToken()
    const owner = nameToAddress("Safe Foundation")
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [owner],
    });
    const [user1] = waffle.provider.getWallets();
    await user1.sendTransaction({ to: owner, value: parseEther("1") })
    const ownedToken = token.connect(await ethers.getSigner(owner))
    return {
        token,
        ownedToken
    }
})