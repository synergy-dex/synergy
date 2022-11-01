const hre = require("hardhat");
const ethers = hre.ethers;

async function deploySynter() {
    const owner = await ethers.getSigner();
    const Synter = await ethers.getContractFactory("Synter");
    const synter = await ethers.deploy(
        address, // _rUsdAddress,
        address, // _synergyAddress,
        address, // _loanAddress,
        address, // _oracle,
        address, // _treasury,
        uint32 // _swapFee
    );
    await synter.deployed();
    return synter.address;
}

async function deployRusd() {
    const owner = await ethers.getSigner();
    const Synt = await ethers.getContractFactory("Synt");
    const synt = await ethers.deploy(
        "Raw USD", // name
        "rUSD", // symbol
        address // synter
    );
    await synt.deployed();
    return synt.address;
}

async function main() {
    const owner = await ethers.getSigner();
    const Synergy = await ethers.getContractFactory("Synergy");
    const synergy = await Synergy.deploy(
        address, // _rUsd,
        address, // _wEth,
        address, // _raw,
        address, // _synter,
        address, // _oracle,
        address, // _treasury,
        address, // _loan,
        address, // _insurance,
        uint32, // _minCollateralRatio,
        uint32, // _liquidationCollateralRatio,
        uint32, // _liquidationPenalty,
        uint32 // _treasuryFee
    );
    await synergy.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
