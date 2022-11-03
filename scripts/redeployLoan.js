const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deployLoan() {
    const Loan = await ethers.getContractFactory("Loan");
    const loan = await Loan.deploy(
        15e7, // _minCollateralRatio, (150%)
        12e7, // _liquidationCollateralRatio, (120%)
        1e7, // _liquidationPenalty, (10%)
        1e7 // _treasuryFee); (10%)
    );
    await loan.deployed();
    console.log("=======================");
    console.log("Loan deployed at { %s }", loan.address);

    return loan;
}

async function main() {
    loan = await deployLoan();

    Synter = await ethers.getContractFactory("Synter");
    synter = await Synter.attach(config.SYNTER);

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    await loan.initialize(
        config.RUSD, // ISynt(_rUsd);
        config.SYNTER, // ISynter(_synter);
        config.TREASURY, // ITreasury(_treasury);
        config.ORACLE // IOracle(_oracle);
    );

    await synter.initialize(
        config.RUSD, // _rUsdAddress,
        config.SYNERGY, // _synergyAddress,
        loan.address, // _loanAddress,
        config.ORACLE, // _oracle,
        config.TREASURY // _treasury
    );

    await synergy.initialize(
        config.RUSD, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        loan.address, // _loan,
        config.INSURANCE // _insurance
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
