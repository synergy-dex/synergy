const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deployInsurance() {
    const Insurance = await ethers.getContractFactory("Insurance");
    const insurance = await Insurance.deploy(
        2592000, // _minLockTime (30 days)
        63070000 // _maxLockTime (2 years)
    );
    await insurance.deployed();
    console.log("=======================");
    console.log("Insurance deployed at { %s }", insurance.address);

    return insurance;
}

async function main() {
    insurance = await deployInsurance();

    await insurance.initialize(
        config.RUSD, // _rUsd
        config.RAW, // _raw
        config.SYNERGY, // _synergy
        config.ORACLE // _oracle
    );

    Raw = await ethers.getContractFactory("Raw");
    raw = await Raw.attach(config.RAW);

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    await raw.initialize(
        insurance.address // _insurance
    );

    await synergy.initialize(
        config.RUSD, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        insurance.address // _insurance
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
