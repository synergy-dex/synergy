// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct UserLoan {
    address user; // user address
    address syntAddress; // address of borrowed synt
    uint256 borrowed; // total synt borrowed
    uint256 collateral; // collateral in rUSD
    uint32 minCollateralRatio; // minCollateralRation at the moment of borrowing (8 decimals)
    uint32 liquidationCollateralRatio; // liquidationCollateralRation at the moment of borrowing (8 decimals)
    uint32 liquidationPenalty; // liquidationPenalty at the moment of borrowing (8 decimals)
    uint32 treasuryFee; // treasury fee for liquidation at the moment of borrowing (8 decimals)
    uint32 loanIndex; // index of the loan in user's loans list
}

interface ILoan {
    function borrow(address _syntAddress, uint256 _amountToBorrow, uint256 _amountToPledge) external;
    function deposit(bytes32 borrowId, uint256 amount) external; // add rUSD to collateral to escape liquidation
    function repay(bytes32 borrowId, uint256 amount) external;
    function withdraw(bytes32 borrowId, uint256 amount) external; // withdraw rUSD
    function collateralRatio(bytes32 borrowId) external view returns (uint256);
    function minCollateralRatio(address syntAddress) external view returns (uint256);
    function totalShorts(address syntAddress) external view returns (uint256);
    function totalLongs(address syntAddress) external view returns (uint256);
    function shortsEnabled(address syntAddress) external view returns (bool);
    function setMinCollateralRatio(uint256 newRatio) external;
    function liquidate(bytes32 borrowId, uint256 amount) external;
}
