// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/IInsurance.sol";
import "./interfaces/IRaw.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Insurance is Ownable {
    event CreatedInsurance(address indexed user, bytes32 indexed insId, uint256 amount, uint256 lockTime);
    event RemovedInsurance(address indexed user, bytes32 indexed insId);
    event Compensated(address indexed user, bytes32 indexed insId, uint256 amount);

    IRaw public immutable raw; // RAW token contract
    address public immutable synergy; // Synergy contract address

    uint256 public maxLockTime; // after this time compensation = 100%. If 0 => compensations are turned off
    uint256 public minLockTime; // min insurance lock time
    mapping(bytes32 => UserInsurance) public insurances; // every insurance has unique id
    mapping(address => bytes32[]) public userInsurances; // list of user's insurances

    constructor(address _rawAddress, uint256 _maxLockTime, address _synergy) {
        raw = IRaw(_rawAddress);
        maxLockTime = _maxLockTime;
        synergy = _synergy;
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice stake RAW tokens to insure against global debt losses
     * @param _lockTime time to lock the insurance
     * @param _amount amount of RAW to lock for insurance
     * @return insId_ Unique id of the insurance
     */
    function stakeRaw(uint256 _lockTime, uint256 _amount) external returns (bytes32 insId_) {
        require(_lockTime >= minLockTime, "Lock time is too low");
        require(_amount != 0, "Lock amount is zero");

        bool success_ = raw.transferFrom(msg.sender, address(this), _amount);
        require(success_, "Cannot transfer RAW token");

        insId_ = keccak256(abi.encode(msg.sender, msg.data, block.number, userInsurances[msg.sender].length));
        require(insurances[insId_].user == address(0), "Cannot duplicate insurances");

        insurances[insId_] = UserInsurance({
            user: msg.sender,
            stakedRaw: _amount,
            repaidRaw: 0,
            startTime: block.timestamp,
            lockTime: _lockTime
        });

        userInsurances[msg.sender].push(insId_);

        emit CreatedInsurance(msg.sender, insId_, _amount, _lockTime);
    }

    /**
     * @notice Unstake unlocked insurance position
     * @param _insId unique insurance id
     */
    function unstakeRaw(bytes32 _insId) external {
        require(insurances[_insId].user == msg.sender, "Wrong user");
        require(getUnlockTime(_insId) <= block.timestamp, "Insurance is locked up");

        raw.transfer(msg.sender, insurances[_insId].stakedRaw);
        delete insurances[_insId];

        emit RemovedInsurance(msg.sender, _insId);
    }

    /* ================= SYNERGY FUNCTIONS ================= */

    /**
     * @notice Function to mint compensation
     * @dev Callable only by synergy contract
     * @param _insId unique insurance id
     * @param _amount amount of RAW to mint
     */
    function compensate(bytes32 _insId, uint256 _amount) external {
        require(msg.sender == address(synergy), "Callable only by the Synergy contract");

        uint256 compensation_ = availableCompensation(_insId);
        require(compensation_ >= _amount, "Not enough compensation");
        require(compensation_ != 0, "No available compensation");

        UserInsurance storage insur = insurances[_insId];
        insur.repaidRaw += _amount;
        raw.mint(insur.user, _amount);

        emit Compensated(insur.user, _insId, _amount);
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    /**
     * @notice Get insurance deposit unlock time
     * @param _insId unique insurance id
     * @return unlock timestamp
     */
    function getUnlockTime(bytes32 _insId) public view returns (uint256) {
        return insurances[_insId].lockTime - insurances[_insId].startTime;
    }

    /**
     * @notice Available compensation amount of the insurance
     * @param _insId unique insurance id
     * @return amount of RAW
     */
    function availableCompensation(bytes32 _insId) public view returns (uint256) {
        if (maxLockTime == 0) {
            return 0;
        } // compensations are turned off

        UserInsurance storage insur = insurances[_insId];

        uint256 totalCompensation_;
        if (insur.lockTime >= maxLockTime) {
            totalCompensation_ = insur.stakedRaw;
        } else {
            totalCompensation_ = (insur.stakedRaw * insur.lockTime) / maxLockTime;
        }

        return totalCompensation_ == 0 ? 0 : totalCompensation_ - insur.repaidRaw;
    }

    /* ================= OWNER FUNCTIONS ================= */

    function setMaxLockTime(uint256 _newTime) external onlyOwner {
        maxLockTime = _newTime;
    }

    function setMinLockTime(uint256 _newTime) external onlyOwner {
        minLockTime = _newTime;
    }
}
