// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title RAW token
contract Raw is ERC20 {
    address public immutable insurance; // Insurance contract

    constructor(string memory _name, string memory _symbol, address _insurance) ERC20(_name, _symbol) {
        insurance = _insurance;
    }

    function mint(address _to, uint256 _amount) external {
        require(msg.sender == insurance, "Only Insurance contract");
        _mint(_to, _amount);
    }
}
