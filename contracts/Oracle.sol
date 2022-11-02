// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Contract to interact with chainlink oracles and get asset prices
 */
contract Oracle is Ownable {
    // todo: add uniswap price feeds to combine with chainlinks
    mapping(address => AggregatorV3Interface) public chainlinkPriceFeeds;
    address public rUsd; // rUSD address
    uint256 constant RUSD_PRICE = 1e18; // rUSD price always = 1$ (18 decimals)

    constructor() {}

    /**
     * @dev Reinitialization available only for test purposes to spare goerli ETH
     */
    function initialize(address _rUsd) external onlyOwner {
        // require(_rUsd != address(0) && address(rUsd) == address(0), "Inicialize only once");
        rUsd = _rUsd;
    }

    function getPrice(address _address) external view returns (uint256, uint8) {
        if (_address == rUsd) {
            return (RUSD_PRICE, 18);
        } else {
            require(address(chainlinkPriceFeeds[_address]) != address(0), "Price feed is not set");
            (, int256 price_,,,) = chainlinkPriceFeeds[_address].latestRoundData();
            uint8 decimals_ = chainlinkPriceFeeds[_address].decimals();
            return (uint256(price_), decimals_);
        }
    }

    function changeFeed(address _address, address _priceFeed) external onlyOwner {
        chainlinkPriceFeeds[_address] = AggregatorV3Interface(_priceFeed);
    }

    function changeRusdAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "rUSD cannot be zero address");
        rUsd = _newAddress;
    }
}
