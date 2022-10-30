// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IOracle {
    function getSyntPrice(address _syntAddress) external view returns(uint256, uint8);
    function changeSyntFeed(address _syntAddress, address _priceFeed) external;
    function changeRusdAddress(address _newAddress) external;
}