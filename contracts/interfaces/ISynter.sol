// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct SyntInfo {
    uint256 syntId; // unique synt id
    uint256 totalShorts; // total synts in shorts
    bool shortsEnabled; // synt can(not) be shorted (default = false)
}

interface ISynter {
    function mintSynt(address syntAddress, address to, uint256 amount) external;
    function burnSynt(address syntAddress, address from, uint256 amount) external;
    function addSynt(string calldata name, string calldata symbol) external returns (address syntAddress);
    function removeSynt(address syntAddress) external;
    function setSyntMaxSupply(address syntAddress, uint256 amount) external;
    function changeShortsAvailability(address syntAddress, bool val) external;
    function increaseShorts(address _syntAddress, uint256 _amount) external;
    function decreaseShorts(address _syntAddress, uint256 _amount) external;

    function swapFrom(address fromSynt, address toSynt, uint256 amountFrom) external;
    function swapTo(address fromSynt, address toSynt, uint256 amountTo) external;

    function syntList(uint256 syntId) external view returns (address syntAddress);
    function syntInfo(address syntAddress) external view returns (SyntInfo memory);
    function getSyntInd(address _syntAddress) external view returns (uint256);
}
