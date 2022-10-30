// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/ISynt.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Synter is the contract to operate with different types of synth (create, mint, burn, etc.)
 */
contract Synter is Ownable {
    address public immutable rUsd;
    address[] public syntList;
    mapping(address => uint256) public syntIds;
    address public immutable synergy;

    /**
     * @param _rUsdAddress rUSD should always exist
     */
    constructor(address _rUsdAddress, address _synergyAddress) {
        rUsd = _rUsdAddress;
        synergy = _synergyAddress;
    }

    /* ================= SYNERGY FUNCTIONS ================= */

    function mintSynt(address _syntAddress, address _to, uint256 _amount) external {
        require(msg.sender == synergy, "Only Synergy contract");
        ISynt(_syntAddress).mint(_to, _amount);
    }

    function burnSynt(address _syntAddress, address _from, uint256 _amount) external {
        require(msg.sender == synergy, "Only Synergy contract");
        ISynt(_syntAddress).burnFrom(_from, _amount);
    }

    /* ================= OWNER FUNCTIONS ================= */

    function addSynt(address _syntAddress) external onlyOwner {
        syntIds[_syntAddress] = syntList.length + 1;
        syntList.push(_syntAddress);
    }

    function removeSynt(address _syntAddress) external onlyOwner {
        uint256 syntInd_ = getSyntInd(_syntAddress);
        syntList[syntInd_] = syntList[syntList.length - 1];
        syntList.pop();
        syntIds[syntList[syntInd_]] = syntInd_ + 1;
        delete syntIds[_syntAddress];
    }

    function setSyntMaxSupply(address _syntAddress, uint256 _amount) external onlyOwner {
        ISynt(_syntAddress).setMaxSupply(_amount);
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice Swap from exact amount of synt-1 to calculated amount of synt-2 at the oracule price
     * @param _fromSynt address of synt to swap from
     * @param _toSynt address of synt to swap to
     * @param _amountFrom amount to spend
     */
    function swapFrom(address _fromSynt, address _toSynt, uint256 _amountFrom) external {
        // @todo 
    }

    /**
     * @notice Swap from calculated amount of synt-1 to exact amount of synt-2 at the oracule price
     * @param _fromSynt address of synt to swap from
     * @param _toSynt address of synt to swap to
     * @param _amountTo amount to get
     */
    function swapTo(address _fromSynt, address _toSynt, uint256 _amountTo) external {
        // @todo
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    function getSyntInd(address _syntAddress) public view returns(uint256) {
        uint256 syntId_ = syntIds[_syntAddress];
        require(syntId_ != 0, "Synt doesn't exist");
        return syntId_ - 1;
    }

}
