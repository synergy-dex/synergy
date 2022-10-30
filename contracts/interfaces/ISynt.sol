// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISynt is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address user, uint256 amount) external;
    function setMaxSupply(uint256 amount) external;
}
