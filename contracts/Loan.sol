// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/ISynt.sol";
import "./interfaces/ILoan.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/ISynter.sol";
import "./interfaces/IOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Loan is the contract to borrow synts for shorts or other purposes
 */
contract Loan is Ownable {
    event Borrowed(address indexed synt, bytes32 indexed borrowId, uint256 amountBorrowed, uint256 amountPledged);
    event Deposited(bytes32 indexed borrowId, uint256 amount);
    event Repayed(bytes32 indexed borrowId, uint256 amount);
    event Withdrawed(bytes32 indexed borrowId, uint256 amount);
    event LoanClosed(bytes32 indexed borrowId);
    event Liquidated(address indexed user, bytes32 indexed borrowId, uint256 syntAmount);

    ISynt public rUsd; // rUsd address
    ISynter public synter; // address of the Synter contract
    IOracle public oracle; // oracle to get synt prices
    ITreasury public treasury; // treasury address to collect rewards
    uint32 public minCollateralRatio; // min collateral ration e.g. 1.2 (8 decimals)
    uint32 public liquidationCollateralRatio; // collateral ratio to enough to liquidate e.g. 1.2 (8 decimals)
    uint32 public liquidationPenalty; // rewards for liquidation e.g 0.1 (8 decimals)
    uint32 public treasuryFee; // treasury liquidation fee e.g. 0.2 (8 decimals)
    mapping(bytes32 => UserLoan) public loans;
    mapping(address => bytes32[]) public userLoans;

    constructor(
        uint32 _minCollateralRatio,
        uint32 _liquidationCollateralRatio,
        uint32 _liquidationPenalty,
        uint32 _treasuryFee
    ) {
        require(
            _liquidationCollateralRatio <= _minCollateralRatio,
            "liquidationCollateralRatio should be <= minCollateralRatio"
        );
        require(
            1e8 + _liquidationPenalty + _treasuryFee <= _liquidationCollateralRatio,
            "1 + liquidationPenalty + treasuryFee should be <= liquidationCollateralRatio"
        );
        minCollateralRatio = _minCollateralRatio;
        liquidationCollateralRatio = _liquidationCollateralRatio;
        liquidationPenalty = _liquidationPenalty;
        treasuryFee = _treasuryFee;
    }

    /* ================= INITIALIZATION ================= */
    /**
     * @dev Reinitialization available only for test purposes to spare goerli ETH
     */
    function initialize(address _rUsd, address _synter, address _oracle, address _treasury) external onlyOwner {
        // require(_rUsd != address(0) && address(rUsd) == address(0), "Inicialize only once");
        // require(_synter != address(0) && address(synter) == address(0), "Inicialize only once");
        // require(_treasury != address(0) && address(treasury) == address(0), "Inicialize only once");
        // require(_oracle != address(0) && address(oracle) == address(0), "Inicialize only once");

        rUsd = ISynt(_rUsd);
        synter = ISynter(_synter);
        oracle = IOracle(_oracle);
        treasury = ITreasury(_treasury);
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice Borrow synt and pay rUSD as a collateral
     * @param _syntAddress address of synt to borrow
     * @param _amountToBorrow amount of synt to borrow
     * @param _amountToPledge amount of rUSD to leave as a collateral
     */
    function borrow(address _syntAddress, uint256 _amountToBorrow, uint256 _amountToPledge) external {
        require(synter.syntInfo(_syntAddress).shortsEnabled, "Shorts for the synt should be turned on");
        require(_amountToBorrow != 0, "Borrow ammount cannot be zero");

        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
        (uint256 syntPrice_, uint8 syntDecimals_) = oracle.getPrice(address(_syntAddress));
        require(syntPrice_ != 0, "Synt price cannot be zero");

        uint32 collateralRatio_ = uint32(
            rUsdPrice_ * _amountToPledge * 10 ** (8 + syntDecimals_ - rUsdDecimals_) / (syntPrice_ * _amountToBorrow)
        );
        require(collateralRatio_ >= minCollateralRatio, "Collateral ration less than minCollateralRatio");

        bytes32 borrowId_ = keccak256(abi.encode(msg.sender, msg.data, block.number, userLoans[msg.sender].length));
        require(loans[borrowId_].user == address(0), "Cannot duplicate loans");

        userLoans[msg.sender].push(borrowId_);
        loans[borrowId_] = UserLoan({
            user: msg.sender,
            syntAddress: _syntAddress,
            borrowed: _amountToBorrow,
            collateral: _amountToPledge,
            minCollateralRatio: minCollateralRatio,
            liquidationCollateralRatio: liquidationCollateralRatio,
            liquidationPenalty: liquidationPenalty,
            treasuryFee: treasuryFee,
            loanIndex: uint32(userLoans[msg.sender].length - 1)
        });

        rUsd.transferFrom(msg.sender, address(this), _amountToPledge);
        synter.increaseShorts(_syntAddress, _amountToBorrow);
        synter.mintSynt(_syntAddress, msg.sender, _amountToBorrow);

        emit Borrowed(_syntAddress, borrowId_, _amountToBorrow, _amountToPledge);
    }

    /**
     * @notice Deposit rUSD to collateral by borrowId to increase collateral rate and escape liquidation
     * @param _borrowId uniquie id of the loan
     * @param _amount amoount of rUSD to deposit
     */
    function deposit(bytes32 _borrowId, uint256 _amount) external {
        UserLoan storage loan = loans[_borrowId];

        require(loan.user == msg.sender, "Cannot deposit to someone else's loan");

        loan.collateral += _amount;
        rUsd.transferFrom(msg.sender, address(this), _amount);

        emit Deposited(_borrowId, _amount);
    }

    /**
     * @notice Repay debt and return collateral
     * @param _borrowId uniquie id of the loan
     * @param _amountToRepay amount of synt to repay
     */
    function repay(bytes32 _borrowId, uint256 _amountToRepay) external {
        UserLoan storage loan = loans[_borrowId];

        require(loan.user == msg.sender, "Cannot repay someone else's loan");

        loan.borrowed -= _amountToRepay;
        synter.decreaseShorts(loan.syntAddress, _amountToRepay);
        synter.burnSynt(loan.syntAddress, msg.sender, _amountToRepay);

        emit Repayed(_borrowId, _amountToRepay);
    }

    /**
     * @notice Withdraw rUSD from collateral
     * @param _borrowId uniquie id of the loan
     * @param _amount amount of rUSD to withdraw
     */
    function withdraw(bytes32 _borrowId, uint256 _amount) external {
        UserLoan storage loan = loans[_borrowId];

        require(loan.user == msg.sender, "Cannot withdraw from someone else's loan");
        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
        (uint256 syntPrice_, uint8 syntDecimals_) = oracle.getPrice(address(loan.syntAddress));

        require(loan.collateral >= _amount, "Cannot withdraw more than pledged");
        uint256 collateralAfterWithdraw_ = loan.collateral - _amount;

        uint32 collateralRatio_;
        if (syntPrice_ * loan.borrowed != 0) {
            collateralRatio_ = uint32(
                rUsdPrice_ * collateralAfterWithdraw_ * 10 ** (8 + syntDecimals_ - rUsdDecimals_)
                    / (syntPrice_ * loan.borrowed)
            );
        } else {
            collateralRatio_ = type(uint32).max;
        }

        require(collateralRatio_ >= loan.minCollateralRatio, "Result ration less than minCollateralRatio");

        loan.collateral -= _amount;
        rUsd.transfer(msg.sender, _amount);

        emit Withdrawed(_borrowId, _amount);

        if (loan.collateral == 0 && loan.borrowed == 0) {
            // close loan
            uint32 loanIndex_ = loan.loanIndex;
            uint256 totalLoans_ = userLoans[msg.sender].length;
            userLoans[msg.sender][loanIndex_] = userLoans[msg.sender][totalLoans_ - 1];
            userLoans[msg.sender].pop();
            // change index of the last collateral which was moved
            loans[userLoans[msg.sender][loanIndex_]].loanIndex = loanIndex_;
            delete loans[_borrowId];

            emit LoanClosed(_borrowId);
        }
    }

    /**
     * @notice Function to liquidate under-collaterized positions
     * @dev This function has no UI in the protocol app
     * @param _borrowId unique borrow id
     */
    function liquidate(bytes32 _borrowId) external {
        UserLoan storage loan = loans[_borrowId];
        require(loan.user != address(0), "Loan doesn't exist");
        require(collateralRatio(_borrowId) < loan.liquidationCollateralRatio, "Cannot liquidate yet");

        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
        (uint256 syntPrice_, uint8 syntDecimals_) = oracle.getPrice(address(loan.syntAddress));

        uint256 neededSynt_ = (
            loan.minCollateralRatio * loan.borrowed * syntPrice_ * 10 ** rUsdDecimals_
                - loan.collateral * rUsdPrice_ * 10 ** (8 + syntDecimals_)
        )
            / (
                syntPrice_ * 10 ** rUsdDecimals_
                    * (loan.minCollateralRatio - (1e8 + loan.liquidationPenalty + loan.treasuryFee))
            );

        uint256 liquidatedRusd_ = (
            neededSynt_ * syntPrice_ * (1e8 + loan.liquidationPenalty + loan.treasuryFee) * 10 ** rUsdDecimals_
        ) / (rUsdPrice_ * 10 ** (8 + syntDecimals_));

        uint256 liquidatorReward_ =
            liquidatedRusd_ * (1e8 + loan.liquidationPenalty) / (1e8 + loan.liquidationPenalty + loan.treasuryFee);

        uint256 treasuryReward_ =
            liquidatedRusd_ * loan.treasuryFee / (1e8 + loan.liquidationPenalty + loan.treasuryFee);

        // if CR dropped too low
        // we pay the liquidator at the expense of other people's collateral
        // and reimburse the losses at the expense of the treasury manually

        if (liquidatorReward_ + treasuryReward_ <= loan.collateral) {
            unchecked {
                loan.collateral -= liquidatorReward_ + treasuryReward_;
            }
        } else {
            loan.collateral = 0;
        }
        if (neededSynt_ <= loan.borrowed) {
            unchecked {
                loan.borrowed -= neededSynt_;
            }
        } else {
            loan.borrowed = 0;
        }

        synter.burnSynt(loan.syntAddress, msg.sender, neededSynt_);
        rUsd.transfer(address(treasury), treasuryReward_);
        rUsd.transfer(msg.sender, liquidatorReward_);

        emit Liquidated(loan.user, _borrowId, neededSynt_);

        if (loan.collateral == 0 && loan.borrowed == 0) {
            // close loan
            uint32 loanIndex_ = loan.loanIndex;
            uint256 totalLoans_ = userLoans[msg.sender].length;
            userLoans[msg.sender][loanIndex_] = userLoans[msg.sender][totalLoans_ - 1];
            userLoans[msg.sender].pop();
            // change index of the last collateral which was moved
            loans[userLoans[msg.sender][loanIndex_]].loanIndex = loanIndex_;
            delete loans[_borrowId];

            emit LoanClosed(_borrowId);
        }
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    /**
     * @notice Calculate collateral ratio for given borrowId
     * @dev returns 18 decimal
     * @param _borrowId uniquie id of the loan
     * @return collateralRatio_ collateral ratio
     */
    function collateralRatio(bytes32 _borrowId) public view returns (uint32 collateralRatio_) {
        UserLoan storage loan = loans[_borrowId];
        require(loan.user != address(0), "Loan doesn't exist");

        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
        (uint256 syntPrice_, uint8 syntDecimals_) = oracle.getPrice(address(loan.syntAddress));

        if (syntPrice_ * loan.borrowed != 0) {
            collateralRatio_ = uint32(
                rUsdPrice_ * loan.collateral * 10 ** (8 + syntDecimals_ - rUsdDecimals_) / (syntPrice_ * loan.borrowed)
            );
        } else {
            collateralRatio_ = type(uint32).max;
        }
    }

    /**
     * @notice Get total shorts for the synt
     * @param _syntAddress synt address
     * @return uint256
     */
    function totalShorts(address _syntAddress) public view returns (uint256) {
        require(synter.syntInfo(_syntAddress).syntId != 0, "Synt doesn't exist");
        return synter.syntInfo(_syntAddress).totalShorts;
    }

    /**
     * @notice Get total longs for the synt
     * @param _syntAddress synt address
     * @return uint256
     */
    function totalLongs(address _syntAddress) public view returns (uint256) {
        require(synter.syntInfo(_syntAddress).syntId != 0, "Synt doesn't exist");
        return ISynt(_syntAddress).totalSupply();
    }

    /**
     * @notice Can shorts be created for the synt or not
     * @param _syntAddress synt address
     * @return bool
     */
    function shortsEnabled(address _syntAddress) public view returns (bool) {
        require(synter.syntInfo(_syntAddress).syntId != 0, "Synt doesn't exist");
        return synter.syntInfo(_syntAddress).shortsEnabled;
    }

    /* ================= OWNER FUNCTIONS ================= */

    function setMinCollateralRatio(uint32 _minCollateralRatio) external onlyOwner {
        require(
            liquidationCollateralRatio <= _minCollateralRatio,
            "liquidationCollateralRatio should be <= minCollateralRatio"
        );
        minCollateralRatio = _minCollateralRatio;
    }

    function setLiquidationCollateralRatio(uint32 _liquidationCollateralRatio) external onlyOwner {
        require(
            _liquidationCollateralRatio <= minCollateralRatio,
            "liquidationCollateralRatio should be <= minCollateralRatio"
        );
        require(
            1e8 + liquidationPenalty + treasuryFee <= _liquidationCollateralRatio,
            "1 + liquidationPenalty + treasuryFee should be <= liquidationCollateralRatio"
        );
        liquidationCollateralRatio = _liquidationCollateralRatio;
    }

    function setLiquidationPenalty(uint32 _liquidationPenalty) external onlyOwner {
        require(
            1e8 + _liquidationPenalty + treasuryFee <= liquidationCollateralRatio,
            "1 + liquidationPenalty + treasuryFee should be <= liquidationCollateralRatio"
        );
        liquidationPenalty = _liquidationPenalty;
    }

    function setTreasuryFee(uint32 _treasuryFee) external onlyOwner {
        require(
            1e8 + liquidationPenalty + _treasuryFee <= liquidationCollateralRatio,
            "1 + liquidationPenalty + treasuryFee should be <= liquidationCollateralRatio"
        );
        treasuryFee = _treasuryFee;
    }
}
