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

async function main() {
    rUsd = await deploySynt("Raw USD", "rUSD");

    Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.attach(config.INSURANCE);

    Synergy = await ethers.getContractFactory("Synergy");
    synergy = await Synergy.attach(config.SYNERGY);

    Synter = await ethers.getContractFactory("Synter");
    synter = await Synter.attach(config.SYNTER);

    Loan = await ethers.getContractFactory("Loan");
    loan = await Loan.attach(config.LOAN);

    Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.attach(config.ORACLE);

    await insurance.initialize(
        rUsd.address, // _rUsd
        config.RAW, // _raw
        config.SYNERGY, // _synergy
        config.ORACLE // _oracle
    );

    await synergy.initialize(
        rUsd.address, // _rUsd,
        config.WETH, // _wEth,
        config.RAW, // _raw,
        config.SYNTER, // _synter,
        config.ORACLE, // _oracle,
        config.TREASURY, // _treasury,
        config.LOAN, // _loan,
        config.INSURANCE // _insurance
    );

    await synter.initialize(
        rUsd.address, // _rUsdAddress,
        config.SYNERGY, // _synergyAddress,
        config.LOAN, // _loanAddress,
        config.ORACLE, // _oracle,
        config.TREASURY // _treasury
    );

    await loan.initialize(
        rUsd.address, // ISynt(_rUsd);
        config.SYNTER, // ISynter(_synter);
        config.TREASURY, // ITreasury(_treasury);
        config.ORACLE // IOracle(_oracle);
    );

    await oracle.initialize(
        rUsd.address // _rUsd
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
