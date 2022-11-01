// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct UserInsurance {
    address user;
    uint256 stakedRaw;
    uint256 repaidRaw;
    uint256 startTime;
    uint256 lockTime;
}

interface IInsurance {
    function stakeRaw(uint256 lockTime, uint256 amount) external returns (bytes32 insId);
    function unstakeRaw(bytes32 insId) external; // cancel all insurance
    function compensate(bytes32 insId, uint256 amount) external returns (uint256);
    function userInsurances(address user) external view returns (uint256);
    function insurances(bytes32 insId) external view returns (UserInsurance memory);
    function availableCompensation(bytes32 insId) external view returns (uint256);
}
