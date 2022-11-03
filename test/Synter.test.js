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

describe("Synter", function () {
    let deployer, alice, bob, carol, david;
    let loan;

    const ETH = ethers.utils.parseEther("1.0");

    beforeEach(async () => {
        [deployer, alice, bob, carol, david] = await ethers.getSigners();

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
        it("Add and remove synts correctly", async function () {
            // random addresses
            await synter.addSynt(alice.address, true);
            await synter.addSynt(bob.address, false);
            await synter.addSynt(carol.address, true);
            await synter.addSynt(david.address, false);

            // await expect(synter.addSynt(alice.address, true)).to.be.revertedWith("Synt exists");

            expect(await synter.totalSynts()).to.be.equal(4);
            expect((await synter.syntInfo(alice.address))[0]).to.be.equal(1);
            expect((await synter.syntInfo(bob.address))[0]).to.be.equal(2);
            expect((await synter.syntInfo(carol.address))[0]).to.be.equal(3);
            expect((await synter.syntInfo(david.address))[0]).to.be.equal(4);

            await synter.removeSynt(alice.address);

            expect(await synter.totalSynts()).to.be.equal(3);
            expect((await synter.syntInfo(alice.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(david.address))[0]).to.be.equal(1);
            expect((await synter.syntInfo(bob.address))[0]).to.be.equal(2);
            expect((await synter.syntInfo(carol.address))[0]).to.be.equal(3);

            await synter.removeSynt(bob.address);

            expect(await synter.totalSynts()).to.be.equal(2);
            expect((await synter.syntInfo(alice.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(bob.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(david.address))[0]).to.be.equal(1);
            expect((await synter.syntInfo(carol.address))[0]).to.be.equal(2);

            await synter.removeSynt(carol.address);

            expect(await synter.totalSynts()).to.be.equal(1);
            expect((await synter.syntInfo(alice.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(bob.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(david.address))[0]).to.be.equal(1);
            expect((await synter.syntInfo(carol.address))[0]).to.be.equal(0);

            await synter.removeSynt(david.address);

            expect(await synter.totalSynts()).to.be.equal(0);
            expect((await synter.syntInfo(alice.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(bob.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(carol.address))[0]).to.be.equal(0);
            expect((await synter.syntInfo(david.address))[0]).to.be.equal(0);
        });
        describe("Swaps", async function () {
            beforeEach(async () => {
                MockSynt = await ethers.getContractFactory("MockSynt");
                syntA = await MockSynt.deploy("A", "A", ETH.mul(1000));
                syntB = await MockSynt.deploy("B", "B", ETH.mul(1000));

                dataFeed = await deployMockDataFeed("A", ETH.mul(1));
                await oracle.changeFeed(syntA.address, dataFeed.address);

                dataFeed = await deployMockDataFeed("B", ETH.mul(2));
                await oracle.changeFeed(syntB.address, dataFeed.address);

                await synter.addSynt(syntA.address, true);
                await synter.addSynt(syntB.address, false);
            });
            it("Should correct swap From", async function () {
                await syntA.mint(deployer.address, ETH.mul(100));
                await synter.swapFrom(syntA.address, syntB.address, ETH.mul(100));
                swapFee = await synter.swapFee();
                fee = ETH.mul(50).mul(swapFee).div(1e8);
                expect(await syntB.balanceOf(deployer.address)).to.be.equal(ETH.mul(50).sub(fee));
                expect(await syntA.balanceOf(deployer.address)).to.be.equal(0);
            });
            it("Should correct swap To", async function () {
                await syntB.mint(deployer.address, ETH.mul(100));
                await synter.swapTo(syntB.address, syntA.address, ETH.mul(100));
                swapFee = await synter.swapFee();
                fee = ETH.mul(100).mul(swapFee).div(1e8);
                expect(await syntB.balanceOf(deployer.address)).to.be.equal(ETH.mul(50));
                expect(await syntA.balanceOf(deployer.address)).to.be.equal(ETH.mul(100).sub(fee));
            });
        });
    });
});
