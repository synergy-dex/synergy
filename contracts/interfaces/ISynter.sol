// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ISynter {
    function mintSynt(address syntAddress, address to, uint256 amount) external;
    function burnSynt(address syntAddress, address from, uint256 amount) external;
    function addSynt(string calldata name, string calldata symbol) external returns (address syntAddress);
    function removeSynt(address syntAddress) external;
    function setSyntMaxSupply(address syntAddress, uint256 amount) external;

    function swapFrom(address fromSynt, address toSynt, uint256 amountFrom) external;
    function swapTo(address fromSynt, address toSynt, uint256 amountTo) external;

    function syntList(uint256 syntId) external view returns (address syntAddress);
    function syntIds(address syntAddress) external view returns (uint256 syntId);
    function getSyntInd(address _syntAddress) external view returns (uint256); 
}
