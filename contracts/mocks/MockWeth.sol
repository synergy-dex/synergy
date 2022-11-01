// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWeth is ERC20 {
    constructor() ERC20("Mock WETH", "mwETH") {}

    function mint(address _who, uint256 _amount) external {
        _mint(_who, _amount);
    }
}
