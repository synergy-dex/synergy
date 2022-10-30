// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Simple treasury contract to fee collection
 */
contract Treasury is Ownable {
    receive() external payable {}

    function withdrawEth(uint256 _amount) external onlyOwner {
        payable(msg.sender).transfer(_amount);
    }

    function withdrawTokens(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20(_tokenAddress).transfer(msg.sender, _amount);
    }
}
