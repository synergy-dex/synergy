// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/ISynt.sol";
import "./interfaces/ISynter.sol";
import "./interfaces/IOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Synter is the contract to operate with different types of synth (create, mint, burn, etc.)
 */
contract Synter is Ownable {
    address public immutable rUsd; // rUSD address (Synt.sol)
    address[] public syntList; // list of all synt addresses
    mapping(address => SyntInfo) public syntInfo; // synt info by address
    address public immutable synergy; // synergy contract (Synergy.sol)
    address public immutable loan; // loan contract to borrow synts e.g. for shorts
    IOracle public immutable oracle; // price oracle (Oracle.sol)
    address public immutable treasury; // treasury address to fee collection
    uint256 public swapFee; // swap fee (e.g. 0.03%), 18 decimals
    uint256 public constant MAX_SWAP_FEE = 1e17; // swap fee maximum is 0.1%

    /**
     * @param _rUsdAddress rUSD should always exist
     */
    constructor(
        address _rUsdAddress,
        address _synergyAddress,
        address _loanAddress,
        address _oracle,
        address _treasury,
        uint256 _swapFee
    ) {
        require(_swapFee <= MAX_SWAP_FEE, "Swap fee cannot exceed MAX_SWAP_FEE amount");
        rUsd = _rUsdAddress;
        synergy = _synergyAddress;
        loan = _loanAddress;
        oracle = IOracle(_oracle);
        treasury = _treasury;
        swapFee = _swapFee;
    }

    /* ================= SYNERGY AND LOAN FUNCTIONS ================= */

    function mintSynt(address _syntAddress, address _to, uint256 _amount) external {
        require(syntInfo[_syntAddress].syntId != 0 || _syntAddress == rUsd, "Synt doesn't exist");
        require(msg.sender == synergy || msg.sender == loan, "Only Synergy and Loan contracts");
        ISynt(_syntAddress).mint(_to, _amount);
    }

    function burnSynt(address _syntAddress, address _from, uint256 _amount) external {
        require(syntInfo[_syntAddress].syntId != 0 || _syntAddress == rUsd, "Synt doesn't exist");
        require(msg.sender == synergy || msg.sender == loan, "Only Synergy and Loan contracts");
        ISynt(_syntAddress).burnFrom(_from, _amount);
    }

    function increaseShorts(address _syntAddress, uint256 _amount) external {
        require(syntInfo[_syntAddress].syntId != 0, "Synt doesn't exist");
        require(msg.sender == synergy || msg.sender == loan, "Only Synergy and Loan contracts");
        syntInfo[_syntAddress].totalShorts += _amount;
    }

    function decreaseShorts(address _syntAddress, uint256 _amount) external {
        require(syntInfo[_syntAddress].syntId != 0, "Synt doesn't exist");
        require(msg.sender == synergy || msg.sender == loan, "Only Synergy and Loan contracts");
        syntInfo[_syntAddress].totalShorts -= _amount;
    }

    /* ================= OWNER FUNCTIONS ================= */

    function addSynt(address _syntAddress, bool _enableShorts) external onlyOwner {
        require(syntInfo[_syntAddress].syntId == 0, "Synt exists");
        syntInfo[_syntAddress].syntId = syntList.length + 1;
        syntInfo[_syntAddress].shortsEnabled = _enableShorts;

        syntList.push(_syntAddress);
    }

    function removeSynt(address _syntAddress) external onlyOwner {
        uint256 syntInd_ = getSyntInd(_syntAddress);
        syntList[syntInd_] = syntList[syntList.length - 1];
        syntList.pop();

        syntInfo[syntList[syntInd_]].syntId = syntInfo[_syntAddress].syntId;

        delete syntInfo[_syntAddress];
    }

    function changeSwapFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_SWAP_FEE, "Swap fee cannot exceed MAX_SWAP_FEE amount");
        swapFee = _newFee;
    }

    function setSyntMaxSupply(address _syntAddress, uint256 _amount) external onlyOwner {
        ISynt(_syntAddress).setMaxSupply(_amount);
    }

    function changeShortsAvailability(address _syntAddress, bool _val) external onlyOwner {
        require(syntInfo[_syntAddress].syntId != 0, "Synt doesn't exist");
        syntInfo[_syntAddress].shortsEnabled = _val;
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice Swap from exact amount of synt-1 to calculated amount of synt-2 at the oracule price
     * @param _fromSynt address of synt to swap from
     * @param _toSynt address of synt to swap to
     * @param _amountFrom amount to spend
     */
    function swapFrom(address _fromSynt, address _toSynt, uint256 _amountFrom) external {
        require(syntInfo[_fromSynt].syntId != 0 || _fromSynt == rUsd, "First synt does not exist");
        require(syntInfo[_toSynt].syntId != 0 || _toSynt == rUsd, "Second synt does not exist");
        require(_amountFrom > 0, "Amount cannot be zero");

        (uint256 fromPrice_, uint8 fromDecimals_) = oracle.getPrice(_fromSynt);
        (uint256 toPrice_, uint8 toDecimals_) = oracle.getPrice(_toSynt);

        uint256 amountTo_ = (fromPrice_ * _amountFrom * 10 ** toDecimals_) / (toPrice_ * 10 ** fromDecimals_);

        uint256 fee_ = (amountTo_ * swapFee) / 1e18;

        ISynt(_fromSynt).burnFrom(msg.sender, _amountFrom);
        ISynt(_toSynt).mint(msg.sender, amountTo_ - fee_);
        ISynt(_toSynt).mint(treasury, fee_);
    }

    /**
     * @notice Swap from calculated amount of synt-1 to exact amount of synt-2 at the oracule price
     * @param _fromSynt address of synt to swap from
     * @param _toSynt address of synt to swap to
     * @param _amountTo amount to get
     */
    function swapTo(address _fromSynt, address _toSynt, uint256 _amountTo) external {
        require(syntInfo[_fromSynt].syntId != 0 || _fromSynt == rUsd, "First synt does not exist");
        require(syntInfo[_toSynt].syntId != 0 || _toSynt == rUsd, "Second synt does not exist");
        require(_amountTo > 0, "Amount cannot be zero");

        (uint256 fromPrice_, uint8 fromDecimals_) = oracle.getPrice(_fromSynt);
        (uint256 toPrice_, uint8 toDecimals_) = oracle.getPrice(_toSynt);

        uint256 amountFrom_ = (toPrice_ * _amountTo * 10 ** fromDecimals_) / (fromPrice_ * 10 ** toDecimals_);

        uint256 fee_ = (_amountTo * swapFee) / 1e18;

        ISynt(_fromSynt).burnFrom(msg.sender, amountFrom_);
        ISynt(_toSynt).mint(msg.sender, _amountTo - fee_);
        ISynt(_toSynt).mint(treasury, fee_);
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    /**
     * @notice get synt index in syntList by id
     * @param _syntAddress address of the synt
     * @return index
     */
    function getSyntInd(address _syntAddress) public view returns (uint256) {
        uint256 syntId_ = syntInfo[_syntAddress].syntId;
        require(syntId_ != 0, "Synt doesn't exist");
        return syntId_ - 1;
    }

    /**
     * @notice get total number of synts except of rUSD
     * @return number of synts
     */
    function totalSynts() public view returns (uint256) {
        return syntList.length;
    }
}
