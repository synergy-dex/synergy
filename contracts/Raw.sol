// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title RAW token
contract Raw is ERC20 {
    address public immutable insurance; // Insurance contract

    constructor(address _insurance) ERC20("Raw Token", "RAW") {
        insurance = _insurance;
    }

    function mint(address _to, uint256 _amount) external {
        require(msg.sender == insurance, "Only Insurance contract");
        _mint(_to, _amount);
    }
}
