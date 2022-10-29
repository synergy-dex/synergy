// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ISynergy {
    function deposit(uint256 amount) external; // deposit wETH
    function mint(uint256 amount) external;
    function burn(uint256 amount) external;
    function withdraw(uint256 amount) external; // withdraw wETH
    function collateralRatio(address user) external view returns (uint256);
    function minCollateralRatio() external view returns (uint256);
    function setMinCollateralRatio(uint256 newRatio) external;
    function totalDebt() external view returns (uint256);
    function userShares(address user) external returns (uint256);
    function userDebt(address user) external returns (uint256);
    function liquidate(address user, uint256 amount) external;
}
