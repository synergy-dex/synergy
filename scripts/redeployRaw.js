const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deployRaw() {
    const Raw = await ethers.getContractFactory("Raw");
    const raw = await Raw.deploy();
    await raw.deployed();
    console.log("=======================");
    console.log("RAW deployed at { %s }", raw.address);

    return raw;
}

async function main() {
    raw = await deployRaw();
    Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.attach(config.INSURANCE);

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    await insurance.initialize(
        config.RUSD, // _rUsd
        raw.address, // _raw
        config.SYNERGY, // _synergy
        config.ORACLE // _oracle
    );
    await raw.initialize(
        config.INSURANCE // _insurance
    );
    await synergy.initialize(
        config.RUSD, // _rUsd,
        config.WETH, // _wEth,
        raw.address, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        config.INSURANCE // _insurance
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
