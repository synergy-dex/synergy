const { getContractFactory } = require("@nomiclabs/hardhat-ethers/types");
const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deploySynt(name, symbol) {
    const Synt = await ethers.getContractFactory("Synt");
    const synt = await Synt.deploy(
        name, // name
        symbol, // symbol
        ethers.utils.parseEther("1000000000") // maxSupply
    );
    await synt.deployed();
    console.log("=======================");
    console.log("Synt { %s } deployed at { %s }", name, synt.address);

    return synt;
}

async function deployMockDataFeed(assetName, assetPrice) {
    const MockDataFeed = await ethers.getContractFactory("MockDataFeed");
    const mockDataFeed = await MockDataFeed.deploy(assetName, assetPrice);
    await mockDataFeed.deployed();
    console.log("=======================");
    console.log("MockDataFeed for { %s } deployed at { %s }", assetName, mockDataFeed.address);

    return mockDataFeed;
}

async function createSynt(name, symbol, synter, oracle, price) {
    synt = await deploySynt(name, symbol);

    await synt.initialize(synter.address);
    dataFeed = await deployMockDataFeed(name, price);
    await oracle.changeFeed(synt.address, dataFeed.address);
    await synter.addSynt(synt.address, true);
    console.log("Synt { %s } set with price { %s }", name, synt.address, price / 1e18);
    return synt;
}

async function addSynt(name, symbol, synter, oracle, feedAddress) {
    synt = await deploySynt(name, symbol);

    await synt.initialize(synter.address);
    await oracle.changeFeed(synt.address, feedAddress);
    await synter.addSynt(synt.address, true);
    console.log("Synt { %s } set with feed { %s }", synt.address, feedAddress);
    return synt;
}

async function main() {
    Synter = await ethers.getContractFactory("Synter");
    synter = await Synter.attach(config.SYNTER);

    Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.attach(config.ORACLE);

    await addSynt("GOLD", "rGLD", synter, oracle, "0x7b219F57a8e9C7303204Af681e9fA69d17ef626f");
    await createSynt("GAS", "rGAS", synter, oracle, ethers.utils.parseEther("6.4")); // 5$ per gallon
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
