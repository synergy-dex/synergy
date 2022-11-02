// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Synt is ERC20, Ownable {
    address public synter; // address of the Synter contract
    uint256 public maxSupply;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    /**
     * @dev Reinitialization available only for test purposes to spare goerli ETH
     */
    function initialize(address _synter) external onlyOwner {
        // require(_synter != address(0) && address(synter) == address(0), "Inicialize only once");
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
