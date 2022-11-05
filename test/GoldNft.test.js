const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deployTreasury() {
    const owner = await ethers.getSigner();
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.deployed();
    return treasury;
}

async function deployGoldNft() {
    GoldNft = await ethers.getContractFactory("GoldNft");
    goldNft = await GoldNft.deploy(
        ethers.utils.parseEther("1").div(100) // 1% fee
    );
    return goldNft;
}

describe("NFT", function () {
    let deployer, alice, bob, carol;

    const ETH = ethers.utils.parseEther("1.0");

    beforeEach(async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        treasury = await deployTreasury();

        Synt = await ethers.getContractFactory("MockSynt");
        rGld = await Synt.deploy("GOLD", "rGLD", ethers.utils.parseEther("10000000000"));

        goldNft = await deployGoldNft();
        await goldNft.initialize(rGld.address, treasury.address);
    });

    describe("Basic tests", function () {
        it("Should correctly mint", async function () {
            await rGld.mint(deployer.address, ETH.mul(1100));
            await rGld.approve(goldNft.address, ETH.mul(1100));

            await goldNft.mintCard(ETH.mul(1));
            await goldNft.mintCard(ETH.mul(5));
            await goldNft.mintCard(ETH.mul(10));
            await expect(goldNft.mintCard(ETH.mul(11))).to.be.revertedWith(
                "Only 1 or 5 or 10 or 1000+ unce cards available"
            );
            await goldNft.mintCard(ETH.mul(1050));

            expect(await goldNft.goldEquivalent(0)).to.be.equal(ETH.mul(1));
            expect(await goldNft.goldEquivalent(1)).to.be.equal(ETH.mul(5));
            expect(await goldNft.goldEquivalent(2)).to.be.equal(ETH.mul(10));
            expect(await goldNft.goldEquivalent(3)).to.be.equal(ETH.mul(1050));

            fee = (await goldNft.mintFee()).mul(ETH.mul(1066)).div(ETH.mul(1));

            expect(await rGld.balanceOf(deployer.address)).to.be.equal(
                ETH.mul(1100).sub(ETH.mul(1066).add(fee))
            );

            await goldNft.burnCard(0);
            await goldNft.burnCard(1);
            await goldNft.burnCard(2);
            await goldNft.burnCard(3);

            expect(await rGld.balanceOf(deployer.address)).to.be.equal(ETH.mul(1100).sub(fee));
        });
    });
});
