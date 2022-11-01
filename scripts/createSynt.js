const hre = require("hardhat");
const ethers = hre.ethers;

import { abi as synterAbi } from "artifacts/contracts/Synter.sol/Synter.json";
import { abi as oracleAbi } from "artifacts/contracts/Oracle.sol/Oracle.json";

import { deploySynt, deployMockDataFeed } from "./deploy.js";

async function createSynt(name, symbol, synter, oracle, price) {
    synt = await deploySynt(name, symbol, synter);
    dataFeed = await deployMockDataFeed(name, price);
    await oracle.changeFeed(synt.address, dataFeed.address);
    await synter.addSynt(synt.address, true);
    console.log("Synt { %s } set with price { %s }", name, synt.address, price / 1e18);
    return synt;
}

SYNTER_ADDRESS = "";
ORACLE_ADDRESS = "";

async function main() {
    // create GOLD with 50$ price per Gram
    const owner = await ethers.getSigner();
    synter = new ethers.Contract(SYNTER_ADDRESS, synterAbi, owner);
    oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, owner);

    await createSynt("GOLD", "rGLD", synter, oracle, ethers.utils.parseEther("50"));

    // create GAS with 2.58$ price per Gallon
    await createSynt("GAS", "rGAS", synter, oracle, ethers.utils.parseEther("2.58"));

    // create gold with 50$ price per gram
    await createSynt("GOLD", "rGLD", synter, oracle, ethers.utils.parseEther("50"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
