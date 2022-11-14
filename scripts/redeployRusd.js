const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function deploySynt(name, symbol) {
    const feeData = await ethers.provider.getFeeData();
    console.log(feeData);
    const Synt = await ethers.getContractFactory("Synt");
    console.log("Got factory");
    const synt = await Synt.deploy(
        name, // name
        symbol, // symbol
        ethers.utils.parseEther("1000000000"), // maxSupply
        { gasPrice: 100000000000, gasLimit: 5000000 }
    );
    console.log("Called deploy");
    await synt.deployed();
    console.log("=======================");
    console.log("Synt { %s } deployed at { %s }", name, synt.address);

    return synt;
}

async function main() {
    // rUsd = await deploySynt("Raw USD", "rUSD");
    Rusd = await ethers.getContractFactory("Synt");
    rUsd = await Rusd.attach(config.RUSD);

    Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.attach(config.INSURANCE);

    console.log("-");

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    console.log("-");

    Synter = await ethers.getContractFactory("Synter");
    synter = await Synter.attach(config.SYNTER);

    console.log("-");

    Loan = await ethers.getContractFactory("Loan");
    loan = await Loan.attach(config.LOAN);

    console.log("-");

    Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.attach(config.ORACLE);

    console.log("-");

    trx = await insurance.initialize(
        rUsd.address, // _rUsd
        config.RAW, // _raw
        config.SYNERGY, // _synergy
        config.ORACLE // _oracle
    );
    await trx.wait();

    console.log("Insurance initialized");

    trx = await synergy.initialize(
        rUsd.address, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        config.INSURANCE // _insurance
    );
    await trx.wait();

    console.log("Synergy initialized");

    trx = await synter.initialize(
        rUsd.address, // _rUsdAddress,
        config.SYNERGY, // _synergyAddress,
        config.LOAN, // _loanAddress,
        config.ORACLE, // _oracle,
        config.TREASURY // _treasury
    );
    await trx.wait();

    console.log("Synter initialized");

    trx = await loan.initialize(
        rUsd.address, // ISynt(_rUsd);
        config.SYNTER, // ISynter(_synter);
        config.TREASURY, // ITreasury(_treasury);
        config.ORACLE // IOracle(_oracle);
    );
    await trx.wait();

    console.log("Loan initialized");

    trx = await oracle.initialize(
        rUsd.address // _rUsd
    );
    await trx.wait();

    console.log("Oracle initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
