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
    const Synt = await ethers.getContractFactory("Synt");
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

describe("Insurance", function () {
    let deployer, alice, bob, carol;
    let insurance;

    const ETH = ethers.utils.parseEther("1.0");

    beforeEach(async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        treasury = await deployTreasury();
        synter = await deploySynter(); // need init
        rUsd = await deploySynt("Raw USD", "rUSD"); // need init
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
            treasury.address, // ITreasury(_treasury);
            oracle.address // IOracle(_oracle);
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

    describe("StakeRaw", function () {
        it("Should substract RAW", async function () {
            await raw.mintTest(ETH.mul(1000));
            await raw.approve(insurance.address, ETH.mul(1000));
            await insurance.stakeRaw(2628000, ETH.mul(1000));

            expect(await raw.balanceOf(deployer.address)).to.be.equal(0);
            expect(await raw.balanceOf(insurance.address)).to.be.equal(ETH.mul(1000));
        });
        it("Should be right insurance", async function () {
            await raw.mintTest(ETH.mul(1000));
            await raw.approve(insurance.address, ETH.mul(1000));
            tx = await insurance.stakeRaw(2628000, ETH.mul(1000));
            receipt = await tx.wait();

            insId = receipt.logs[2].topics[2];

            expect(await insurance.availableCompensation(insId)).to.be.equal(
                ETH.mul(2628000).mul(1000).div(63070000)
            );
        });
        it("Should unstake after lock time", async function () {
            await raw.mintTest(ETH.mul(1000));
            await raw.approve(insurance.address, ETH.mul(1000));
            tx = await insurance.stakeRaw(2628000, ETH.mul(1000));
            receipt = await tx.wait();

            insId = receipt.logs[2].topics[2];

            await expect(insurance.unstakeRaw(insId)).to.be.reverted;

            await ethers.provider.send("evm_increaseTime", [63070000 + 1]);
            await ethers.provider.send("evm_mine");

            await insurance.unstakeRaw(insId);
            expect(await raw.balanceOf(deployer.address)).to.be.equal(ETH.mul(1000));
        });
    });
});
