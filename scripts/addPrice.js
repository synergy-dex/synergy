const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deployMockDataFeed(assetName, assetPrice) {
    const MockDataFeed = await ethers.getContractFactory("MockDataFeed");
    const mockDataFeed = await MockDataFeed.deploy(assetName, assetPrice);
    await mockDataFeed.deployed();
    console.log("=======================");
    console.log("MockDataFeed for { %s } deployed at { %s }", assetName, mockDataFeed.address);

    return mockDataFeed;
}

async function main() {
    mockDataFeed = await deployMockDataFeed("RAW", ethers.utils.parseEther("10")); // 10$

    Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.attach(config.ORACLE);

    // ==============

    feedAddress = mockDataFeed.address;
    assetAddress = config.RAW;

    await oracle.changeFeed(assetAddress, feedAddress);
    console.log("Data feed of { %s } changed to { %s }", assetAddress, feedAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
