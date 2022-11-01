const hre = require("hardhat");
const ethers = hre.ethers;

async function deployTreasury() {
    const Treasury = await ethers.getContractFactory("Synter");
    const treasury = await Treasury.deploy();
    await treasury.deployed();
    console.log("=======================");
    console.log("Treasury deployed at { %s }", treasury.address);

    return treasury;
}

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

async function deploySynt(name, symbol, synter) {
    const Synt = await ethers.getContractFactory("Synt");
    const synt = await Synt.deploy(
        name, // name
        symbol, // symbol
        synter // synter
    );
    await synt.deployed();
    console.log("=======================");
    console.log("Synt { %s } deployed at { %s }", name, synt.address);

    return synt;
}

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

async function deployOracle(rUsd) {
    const Oracle = await ethers.getContractFactory("Oracle");
    const oracle = Oracle.deploy(rUsd);
    await oracle.deployed();
    console.log("=======================");
    console.log("Oracle deployed at { %s }", oracle.address);

    return oracle;
}

async function deployLoan() {
    const Loan = await ethers.getContractFactory("Loan");
    const loan = Loan.deploy(
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

async function deployInsurance() {
    const Insurance = await ethers.getContractFactory("Insurance");
    const insurance = Insurance.deploy(
        2592000, // _minLockTime (30 days)
        63070000 // _maxLockTime (2 years)
    );
    await insurance.deployed();
    console.log("=======================");
    console.log("Insurance deployed at { %s }", insurance.address);

    return insurance;
}

async function deployRaw(insurance) {
    const Raw = await ethers.getContractFactory("Raw");
    const raw = await Raw.deploy(insurance);
    await raw.deployed();
    console.log("=======================");
    console.log("RAW deployed at { %s }", raw.address);

    return raw;
}

async function deployMockWeth() {
    const MockWeth = await ethers.getContractFactory("MockWeth");
    const mockWeth = await MockWeth.deploy();
    await mockWeth.deployed();
    console.log("=======================");
    console.log("MockWeth deployed at { %s }", mockWeth.address);

    return mockWeth;
}

async function deployMockDataFeed(assetName, assetPrice) {
    const MockDataFeed = await ethers.getContractFactory("MockDataFeed");
    const mockDataFeed = await MockDataFeed.deploy();
    await mockDataFeed.deployed(assetName, assetPrice);
    console.log("=======================");
    console.log("MockDataFeed deployed at { %s }", mockDataFeed.address);

    return mockDataFeed;
}

async function main() {
    treasury = await deployTreasury();
    synter = await deploySynter(); // need init
    rUsd = await deploySynt("Raw USD", "rUSD", synter.address);
    synergy = await deploySynergy(); // need init
    oracle = await deployOracle(rUsd.address);
    loan = await deployLoan(); // need init
    insurance = await deployInsurance(); // need init
    raw = await deployRaw(insurance.address);

    wEth = await deployMockWeth();

    await synter.initialize(
        rUsd.address, // _rUsdAddress,
        synergy.address, // _synergyAddress,
        loan.address, // _loanAddress,
        oracle.address, // _oracle,
        treasury.address // _treasury
    );

    await synergy.initialize(
        rUsd.address, // _rUsd,
        wEth.address, // _wEth, !!! todo
        raw.address, // _raw,
        synter.address, // _synter,
        oracle.address, // _oracle,
        treasury.address, // _treasury,
        loan.address, // _loan,
        insurance.address // _insurance
    );

    // set datafeed for RAW with price 10$
    dataFeed = await deployMockDataFeed("RAW", ethers.utils.parseEther("10"));
    await oracle.changeFeed(raw.address, dataFeed.address);

    // set datafeed for wETH with price 1600$
    dataFeed = await deployMockDataFeed("WETH", ethers.utils.parseEther("1600"));
    await oracle.changeFeed(wEth.address, dataFeed.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
