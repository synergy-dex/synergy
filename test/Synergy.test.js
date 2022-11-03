const { expect } = require("chai");
const { ethers } = require("hardhat");

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

describe("Synergy", function () {
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

        // set datafeed for wETH with price 1000$
        dataFeed = await deployMockDataFeed("WETH", ethers.utils.parseEther("1000"));
        await oracle.changeFeed(wEth.address, dataFeed.address);
    });

    describe("Basic tests", function () {
        it("Should mint correctly", async function () {
            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.approve(synergy.address, ETH.mul(100));

            await synergy.mint(ETH.mul(20000), ETH.mul(100));
            expect(await rUsd.balanceOf(deployer.address)).to.be.equal(ETH.mul(20000));
            expect(await wEth.balanceOf(synergy.address)).to.be.equal(ETH.mul(100));
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(20000));
            expect(await synergy.collateralRatio(deployer.address)).to.be.equal(5e8);
        });
        it("Should compute shares correctly", async function () {
            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.mint(alice.address, ETH.mul(10));
            await wEth.approve(synergy.address, ETH.mul(100));
            await wEth.connect(alice).approve(synergy.address, ETH.mul(100));

            await synergy.mint(ETH.mul(20000), ETH.mul(100));
            await synergy.connect(alice).mint(ETH.mul(2000), ETH.mul(10));

            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(22000));
            expect(await synergy.collateralRatio(deployer.address)).to.be.equal(5e8);
            expect(await synergy.collateralRatio(alice.address)).to.be.equal(5e8);
            expect(await synergy.totalShares()).to.be.equal(ETH.mul(11).div(10));
        });
        it("Should increase global debt after synt pump", async function () {
            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.mint(alice.address, ETH.mul(10));
            await wEth.approve(synergy.address, ETH.mul(100));
            await wEth.connect(alice).approve(synergy.address, ETH.mul(100));

            await synergy.mint(ETH.mul(20000), ETH.mul(100));
            await synergy.connect(alice).mint(ETH.mul(2000), ETH.mul(10));

            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);
            await synter.addSynt(rGld.address, true); // add rGld

            await synter.connect(alice).swapFrom(rUsd.address, rGld.address, ETH.mul(2000));
            swapFee = await synter.swapFee();
            fee = ETH.mul(20).mul(swapFee).div(1e8);
            expect(await rGld.balanceOf(alice.address)).to.be.equal(ETH.mul(20).sub(fee));
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(22000));

            await dataFeed.changePrice(ETH.mul(1000)); // pump x10
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(40000));
            expect(await synergy.totalShares()).to.be.equal(ETH.mul(11).div(10));
        });

        it("Should increase global debt after synt pump", async function () {
            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.mint(alice.address, ETH.mul(10));
            await wEth.approve(synergy.address, ETH.mul(100));
            await wEth.connect(alice).approve(synergy.address, ETH.mul(100));

            await synergy.mint(ETH.mul(20000), ETH.mul(100));
            await synergy.connect(alice).mint(ETH.mul(2000), ETH.mul(10));

            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);
            await synter.addSynt(rGld.address, true); // add rGld

            await synter.connect(alice).swapFrom(rUsd.address, rGld.address, ETH.mul(2000));
            swapFee = await synter.swapFee();
            fee = ETH.mul(20).mul(swapFee).div(1e8);
            expect(await rGld.balanceOf(alice.address)).to.be.equal(ETH.mul(20).sub(fee));
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(22000));

            await dataFeed.changePrice(ETH.mul(1000)); // pump x10
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(40000));
            expect(await synergy.totalShares()).to.be.equal(ETH.mul(11).div(10));
        });
        it("Should withdraw correctly", async function () {
            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.mint(alice.address, ETH.mul(10));
            await wEth.approve(synergy.address, ETH.mul(100));
            await wEth.connect(alice).approve(synergy.address, ETH.mul(100));

            await synergy.mint(ETH.mul(20000), ETH.mul(100));
            await synergy.connect(alice).mint(ETH.mul(2000), ETH.mul(10));

            dataFeed = await deployMockDataFeed("GOLD", ETH.mul(100));
            await oracle.changeFeed(rGld.address, dataFeed.address);
            await synter.addSynt(rGld.address, true); // add rGld

            await synter.connect(alice).swapFrom(rUsd.address, rGld.address, ETH.mul(2000));
            swapFee = await synter.swapFee();
            fee = ETH.mul(20).mul(swapFee).div(1e8);
            expect(await rGld.balanceOf(alice.address)).to.be.equal(ETH.mul(20).sub(fee));
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(22000));

            await dataFeed.changePrice(ETH.mul(1000)); // pump x10
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(40000));
            expect(await synergy.totalShares()).to.be.equal(ETH.mul(11).div(10));

            // spaw rGld back
            aliceBalance = await rGld.balanceOf(alice.address);
            await synter.connect(alice).swapFrom(rGld.address, rUsd.address, aliceBalance);
            aliceDebt = await synergy.userDebt(alice.address);
            await synergy.connect(alice).burn(aliceDebt, ethers.constants.HashZero);
            expect(await synergy.globalDebt()).to.be.equal(ETH.mul(40000).sub(aliceDebt));

            expect(await synergy.totalShares()).to.be.equal(ETH.mul(1));

            expect(await synergy.collateralRatio(alice.address)).to.be.equal(4294967295);
        });
        it("Should correct calculate collateral ratio", async function () {
            expect(await synergy.totalShares()).to.be.equal(0);
            expect(await synergy.collateralRatio(deployer.address)).to.be.equal(0);

            await wEth.mint(deployer.address, ETH.mul(100));
            await wEth.approve(synergy.address, ETH.mul(100));
            await synergy.mint(ETH.mul(20000), ETH.mul(100));

            expect(await synergy.totalShares()).to.be.equal(ETH.mul(1));
            expect(await synergy.collateralRatio(deployer.address)).to.be.equal(5e8);
        });
    });
});
