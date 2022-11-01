// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract MockDataFeed {
    string public assetName;
    int256 public assetPrice;

    constructor(string memory _assetName, int256 _assetPrice) {
        assetName = _assetName;
        assetPrice = _assetPrice;
    }

    function changePrice(int256 _price) external {
        assetPrice = _price;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function description() external view returns (string memory) {
        return string.concat("Mock data feed for ", assetName);
    }

    function version() external pure returns (uint256) {
        return 0;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {}

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        answer = assetPrice;
    }
}
