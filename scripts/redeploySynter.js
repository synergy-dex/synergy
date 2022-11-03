const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deploySynter() {
    const Synter = await ethers.getContractFactory("Synter");
    const synter = await Synter.deploy(
        3e4 // _swapFee (0,03%)
    );
    await synter.deployed();
    console.log("=======================");
    console.log("Synter deployed at { %s }", synter.address);

    return synter;
}

async function main() {
    synter = await deploySynter();

    Synt = await ethers.getContractFactory("Synt");
    rUsd = await Synt.attach(config.RUSD);

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    Loan = await ethers.getContractFactory("Loan");
    loan = await Loan.attach(config.LOAN);

    await synter.initialize(
        config.RUSD, // _rUsdAddress,
        config.SYNERGY, // _synergyAddress,
        config.LOAN, // _loanAddress,
        config.ORACLE, // _oracle,
        config.TREASURY // _treasury
    );

    await rUsd.initialize(
        synter.address // _synter
    );

    await synergy.initialize(
        config.RUSD, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        synter.address, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        config.INSURANCE // _insurance
    );

    await loan.initialize(
        config.RUSD, // ISynt(_rUsd);
        synter.address, // ISynter(_synter);
        config.TREASURY, // ITreasury(_treasury);
        config.ORACLE // IOracle(_oracle);
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
