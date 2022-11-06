const hre = require("hardhat");
const ethers = hre.ethers;
const config = require("./contracts.json");

async function main() {
    GoldNft = await ethers.getContractFactory("GoldNft");
    goldNft = await GoldNft.deploy(
        ethers.utils.parseEther("1").div(100) // 1% fee
    );

    await goldNft.initialize(config.RGLD, config.TREASURY);

    await goldNft.setCardUri(0, "ipfs://QmcwJeiVieJFe5GCn1KwmxPYu2MEcH8RSZDGpHs4z4Ng2L/coin.json");
    await goldNft.setCardUri(
        1,
        "ipfs://QmcwJeiVieJFe5GCn1KwmxPYu2MEcH8RSZDGpHs4z4Ng2L/nugget.json"
    );
    await goldNft.setCardUri(2, "ipfs://QmcwJeiVieJFe5GCn1KwmxPYu2MEcH8RSZDGpHs4z4Ng2L/ingot.json");
    await goldNft.setCardUri(3, "ipfs://QmcwJeiVieJFe5GCn1KwmxPYu2MEcH8RSZDGpHs4z4Ng2L/cube.json");
    await goldNft.setContractUri("ipfs://QmQrhZMiJq6xcGwJft9jD2WUvM8v4AtP1diZL8Z3aP8ypo");

    console.log("Gold NFT deployed at { %s }", goldNft.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
