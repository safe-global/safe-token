import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("deploy-contracts", "Deploys and verifies Safe contracts")
    .setAction(async (_, hre) => {
        await hre.run("deploy")
        await hre.run("local-verify")
        try { 
            await hre.run("sourcify") 
        } catch (e) { console.error(e) }
        try { 
            await hre.run("etherscan-verify", { forceLicense: true, license: 'LGPL-3.0'})
        } catch (e) { console.error(e) }
    });

export { }