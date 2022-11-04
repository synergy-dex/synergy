const { expect } = require("chai");
const { ethers } = require("hardhat");
const { lazyFunction } = require("hardhat/plugins");

async function deployTreasury() {
    const owner = await ethers.getSigner();
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.deployed();
    return treasury;
}

async function deploySynter() {
    const Synter = await ethers.getContractFactory("Synter");
    const synter = await Synter.deploy(
        3e4 // _swapFee (0,03%)
    );
    await synter.deployed();
    return synter;
}

async function deploySynt(name, symbol) {
    const Synt = await ethers.getContractFactory("MockSynt"); // mock synt
    const synt = await Synt.deploy(
        name, // name
        symbol, // symbol
        ethers.utils.parseEther("1000000000") // maxSupply
    );
    await synt.deployed();
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
    return synergy;
}

async function deployOracle() {
    const Oracle = await ethers.getContractFactory("Oracle");
    const oracle = await Oracle.deploy();
    await oracle.deployed();
    return oracle;
}

async function deployLoan() {
    const Loan = await ethers.getContractFactory("Loan");
    const loan = await Loan.deploy(
        15e7, // _minCollateralRatio, (150%)
        12e7, // _liquidationCollateralRatio, (120%)
        1e7, // _liquidationPenalty, (10%)
        1e7 // _treasuryFee); (10%)
    );
    await loan.deployed();
    return loan;
}

async function deployInsurance() {
    const Insurance = await ethers.getContractFactory("Insurance");
    const insurance = await Insurance.deploy(
        2592000, // _minLockTime (30 days)
        63070000 // _maxLockTime (2 years)
    );
    await insurance.deployed();
    return insurance;
}

async function deployRaw() {
    const Raw = await ethers.getContractFactory("Raw");
    const raw = await Raw.deploy();
    await raw.deployed();
    return raw;
}

async function deployMockWeth() {
    const MockWeth = await ethers.getContractFactory("MockWeth");
    const mockWeth = await MockWeth.deploy();
    await mockWeth.deployed();
    return mockWeth;
}

async function deployMockDataFeed(assetName, assetPrice) {
    const MockDataFeed = await ethers.getContractFactory("MockDataFeed");
    const mockDataFeed = await MockDataFeed.deploy(assetName, assetPrice);
    await mockDataFeed.deployed();
    return mockDataFeed;
}

describe("Loan", function () {
    let deployer, alice, bob, carol;
    let loan;

    const ETH = ethers.utils.parseEther("1.0");

    beforeEach(async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        treasury = await deployTreasury();
        synter = await deploySynter(); // need init

        rUsd = await deploySynt("Raw USD", "rUSD"); // need init
        rGld = await deploySynt("Raw GOLD", "rGLD"); // need init

        synergy = await deploySynergy(); // need init
        oracle = await deployOracle(); // need init
        loan = await deployLoan(); // need init
        insurance = await deployInsurance(); // need init
        raw = await deployRaw(); // need init

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

        await rUsd.initialize(
            synter.address // _synter
        );

        await rGld.initialize(
            synter.address // _synter
        );

        await oracle.initialize(
            rUsd.address // _rUsd
        );

        await insurance.initialize(
            rUsd.address, // _rUsd
            raw.address, // _raw
            synergy.address, // _synergy
            oracle.address // _oracle
        );

        await loan.initialize(
            rUsd.address, // ISynt(_rUsd);
            synter.address, // ISynter(_synter);
            oracle.address, // IOracle(_oracle);
            treasury.address // ITreasury(_treasury);
        );

        await raw.initialize(
            insurance.address // _insurance
        );

        // set datafeed for RAW with price 10$
        dataFeed = await deployMockDataFeed("RAW", ethers.utils.parseEther("10"));
        await oracle.changeFeed(raw.address, dataFeed.address);

        // set datafeed for wETH with price 1600$
        dataFeed = await deployMockDataFeed("WETH", ethers.utils.parseEther("1600"));
        await oracle.changeFeed(wEth.address, dataFeed.address);
    });

    describe("Basic tests", function () {
        it("Should borrow correctly", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ethers.utils.parseEther("100"));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(10000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(10000));
            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();

            borrowId = receipt.logs[3].topics[2];

            expect(await rUsd.balanceOf(deployer.address)).to.be.equal(ETH.mul(8000));
            expect(await rGld.balanceOf(deployer.address)).to.be.equal(ETH.mul(10));
            expect(await loan.totalShorts(rGld.address)).to.be.equal(ETH.mul(10));
            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e8);
        });
        it("Should able to withdraw until collateral ratio", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(2000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(2000));
            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();

            borrowId = receipt.logs[3].topics[2];

            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e8);

            await loan.withdraw(borrowId, ETH.mul(500));
            expect(await rUsd.balanceOf(deployer.address)).to.be.equal(ETH.mul(500));
            expect(await rGld.balanceOf(deployer.address)).to.be.equal(ETH.mul(10));
        });
        it("Should decrease CR", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(2000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(2000));
            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();

            borrowId = receipt.logs[3].topics[2];

            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e8);

            await dataFeed.changePrice(ETH.mul(1000)); // pump 10x

            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e7);
            // dont repay
            await expect(loan.withdraw(borrowId, ETH.mul(500))).to.be.revertedWith(
                "Result ration less than minCollateralRatio"
            );
        });

        it("Should repay correctly", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(2000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(2000));
            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();

            borrowId = receipt.logs[3].topics[2];

            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e8);

            await dataFeed.changePrice(ETH.mul(10)); // dump 10x

            expect(await loan.collateralRatio(borrowId)).to.be.equal(2e9);

            await loan.repay(borrowId, ETH.mul(10));

            await loan.withdraw(borrowId, ETH.mul(2000));

            expect(await rUsd.balanceOf(deployer.address)).to.be.equal(ETH.mul(2000));
            expect(await rGld.balanceOf(deployer.address)).to.be.equal(ETH.mul(0));
        });
        it("Should correctly predict CR after borrow on increase", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(6000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(6000));

            crPredict = await loan.predictCollateralRatio(
                ethers.constants.HashZero,
                rGld.address,
                ETH.mul(10),
                ETH.mul(2000),
                true
            );

            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();
            borrowId = receipt.logs[3].topics[2];

            expect(await loan.collateralRatio(borrowId)).to.be.equal(crPredict);

            crPredict = await loan.predictCollateralRatio(
                ethers.constants.HashZero,
                rGld.address,
                ETH.mul(10),
                ETH.mul(2000),
                true
            );

            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();
            borrowId = receipt.logs[3].topics[2];

            expect(await loan.collateralRatio(borrowId)).to.be.equal(crPredict);

            // on deposit
            crPredict = await loan.predictCollateralRatio(
                borrowId,
                rGld.address,
                0,
                ETH.mul(2000),
                true
            );

            await loan.deposit(borrowId, ETH.mul(2000));

            expect(await loan.collateralRatio(borrowId)).to.be.equal(crPredict);
        });

        it("Should correctly predict CR after borrow on decrease", async function () {
            // set datafeed for rGLD with price 100$
            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);

            // add rGld
            await synter.addSynt(rGld.address, true);

            expect(await synter.syntList(0)).to.be.equal(rGld.address);

            await rUsd.mint(deployer.address, ETH.mul(6000)); // mint mock synt
            await rUsd.approve(loan.address, ETH.mul(6000));

            tx = await loan.borrow(rGld.address, ETH.mul(10), ETH.mul(2000)); // x2 overcollateral
            receipt = await tx.wait();
            borrowId = receipt.logs[3].topics[2];

            crPredict = await loan.predictCollateralRatio(
                borrowId,
                rGld.address,
                ETH.mul(10),
                0,
                false
            );
            await loan.repay(borrowId, ETH.mul(10));
            expect(await loan.collateralRatio(borrowId)).to.be.equal(crPredict);

            // ============

            tx = await loan.borrow(rGld.address, ETH.mul(5), ETH.mul(1000)); // x2 overcollateral
            receipt = await tx.wait();
            borrowId = receipt.logs[3].topics[2];
            await dataFeed.changePrice(ETH.mul(10)); // dump 10x
            crPredict = await loan.predictCollateralRatio(
                borrowId,
                rGld.address,
                ETH.mul(5),
                0,
                false
            );
            await loan.repay(borrowId, ETH.mul(5));
            expect(await loan.collateralRatio(borrowId)).to.be.equal(crPredict);

            // on withdraw
            crPredict = await loan.predictCollateralRatio(
                borrowId,
                rGld.address,
                0,
                ETH.mul(1000),
                false
            );
            await loan.withdraw(borrowId, ETH.mul(1000));
            await expect(loan.collateralRatio(borrowId)).to.be.revertedWith("Loan doesn't exist");
            expect(crPredict).to.be.equal(0);
        });
    });
});
