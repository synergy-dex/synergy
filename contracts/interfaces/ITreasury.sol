// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ITreasury {
    function withdrawEth(uint256 amount) external;
    function withdrawTokens(address tokenAddress, uint256 amount) external;
}
