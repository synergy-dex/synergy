const hre = require("hardhat");
const ethers = hre.ethers;

import { abi as synterAbi } from "artifacts/contracts/Synter.sol/Synter.json";
import { abi as oracleAbi } from "artifacts/contracts/Oracle.sol/Oracle.json";

import { deploySynt, deployMockDataFeed } from "./deploy.js";

async function createSynt(name, symbol, synter, oracle, price) {
    synt = await deploySynt(name, symbol);

    init = await synt.initialize(synter.address);
    await init.wait();

    dataFeed = await deployMockDataFeed(name, price);
    await oracle.changeFeed(synt.address, dataFeed.address);
    await synter.addSynt(synt.address, true);
    console.log("Synt { %s } set with price { %s }", name, synt.address, price / 1e18);
    return synt;
}

async function addSynt(name, symbol, synter, oracle, feedAddress) {
    synt = await deploySynt(name, symbol);

    init = await synt.initialize(synter.address);
    await init.wait();

    await oracle.changeFeed(synt.address, feedAddress);
    await synter.addSynt(synt.address, true);
    console.log("Synt { %s } set with feed { %s }", name, synt.address, feedAddress);
    return synt;
}

SYNTER_ADDRESS = "";
ORACLE_ADDRESS = "";

async function main() {
    // create GOLD with 50$ price per Gram
    const owner = await ethers.getSigner();
    synter = new ethers.Contract(SYNTER_ADDRESS, synterAbi, owner);
    oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, owner);

    // create GOLD with price from XAU datafeed
    await addSynt("GOLD", "rGLD", synter, oracle, "0x7b219F57a8e9C7303204Af681e9fA69d17ef626f");

    // create GAS with 2.58$ price per Gallon
    await createSynt("GAS", "rGAS", synter, oracle, ethers.utils.parseEther("2.58"));

    // create WHEAT with 9.17$ price per Bushel
    await createSynt("WHEAT", "rWHT", synter, oracle, ethers.utils.parseEther("9.17"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
