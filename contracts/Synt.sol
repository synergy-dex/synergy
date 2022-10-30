// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Synt is ERC20 {
    address public immutable synter; // address of the Synter contract
    uint256 public maxSupply;

    constructor(string memory _name, string memory _symbol, address _synter) ERC20(_name, _symbol) {
        synter = _synter;
    }

    function mint(address _to, uint256 _amount) external {
        require(msg.sender == synter, "Only Synter");
        require(totalSupply() + _amount <= maxSupply);
        _mint(_to, _amount);
    }

    function burnFrom(address _user, uint256 _amount) external {
        require(msg.sender == synter, "Only Synter");
        _burn(_user, _amount);
    }

    function setMaxSupply(uint256 _newMaxSupply) external {
        require(msg.sender == synter, "Only Synter");
        maxSupply = _newMaxSupply;
    }
}
