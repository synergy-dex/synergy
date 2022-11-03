const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deploySynergy() {
    const Synergy = await ethers.getContractFactory("Synergy");
    const synergy = await Synergy.deploy(
        2e8, // _minCollateralRatio, (200%)
        15e7, // _liquidationCollateralRatio, (150%)
        1e7, // _liquidationPenalty, (10%)
        1e7 // _treasuryFee (10%)
    );
    await synergy.deployed();
    console.log("=======================");
    console.log("Synergy deployed at { %s }", synergy.address);

    return synergy;
}

async function main() {
    synergy = await deploySynergy();

    Synter = await ethers.getContractFactory("Synter");
    synter = await Synter.attach(config.SYNTER);

    Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.attach(config.INSURANCE);

    await synergy.initialize(
        config.RUSD, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        config.INSURANCE // _insurance
    );

    await synter.initialize(
        config.RUSD, // _rUsdAddress,
        synergy.address, // _synergyAddress,
        config.LOAN, // _loanAddress,
        config.ORACLE, // _oracle,
        config.TREASURY // _treasury
    );

    await insurance.initialize(
        config.RUSD, // _rUsd
        config.RAW, // _raw
        synergy.address, // _synergy
        config.ORACLE // _oracle
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
