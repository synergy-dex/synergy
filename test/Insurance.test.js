const { expect } = require("chai");
const { ethers } = reuire("hardhat");

import {
    deployTreasury,
    deploySynter,
    deploySynt,
    deploySynergy,
    deployOracle,
    deployLoan,
    deployInsurance,
    deployRaw,
} from "../scripts/deploy.js";

describe("Insurance", function () {
    let deployer, alice, bob, carol;
    let insurance;

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
        it("Should set the right unlockTime", async function () {
            const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

            expect(await lock.unlockTime()).to.equal(unlockTime);
        });
    });
});
