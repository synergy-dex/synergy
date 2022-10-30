// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ILoan {
    function deposit(uint256 amount) external; // deposit rUSD
    function borrow(address syntAddress, uint256 amount) external returns (bytes32 borrowId);
    function repay(bytes32 borrowId, address syntAddress, uint256 amount) external;
    function withdraw(bytes32 borrowId, uint256 amount) external; // withdraw rUSD
    function collateralRatio(bytes32 borrowId) external view returns (uint256);
    function minCollateralRatio(address syntAddress) external view returns (uint256);
    function totalShorts(address syntAddress) external view returns (uint256);
    function setMinCollateralRatio(address syntAddress, uint256 newRatio) external;
    function liquidate(bytes32 borrowId, uint256 amount) external;
}
