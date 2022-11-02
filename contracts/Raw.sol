// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RAW token
contract Raw is ERC20, Ownable {
    address public insurance; // Insurance contract

    constructor() ERC20("Raw Token", "RAW") {}

    /**
     * @dev Reinitialization available only for test purposes to spare goerli ETH
     */
    function initialize(address _insurance) external onlyOwner {
        // require(_insurance != address(0) && address(insurance) == address(0), "Inicialize only once");
        insurance = _insurance;
    }

    function mint(address _to, uint256 _amount) external {
        require(msg.sender == insurance, "Only Insurance contract");
        _mint(_to, _amount);
    }

    /**
     * @dev function just for testnet
     */
    function mintTest(uint256 _amount) external onlyOwner {
        _mint(msg.sender, _amount);
    }
}
