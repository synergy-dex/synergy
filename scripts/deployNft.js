const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function main() {
    GoldNft = await ethers.getContractFactory("GoldNft");
    goldNft = await GoldNft.deploy(
        ethers.utils.parseEther("1").div(100) // 1% fee
    );

    await goldNft.initialize(config.RGLD, config.TREASURY);

    console.log("Gold NFT deployed at { %s }", goldNft.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
