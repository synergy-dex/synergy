// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/ISynt.sol";
import "./interfaces/ILoan.sol";
import "./interfaces/ISynter.sol";
import "./interfaces/ISynergy.sol";
import "./interfaces/IInsurance.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/ITreasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Synergy is the main contract. It serves to mint and burn rUSD
 */
contract Synergy is Ownable {
    event Minted(uint256 amountMinted, uint256 amountPledged);
    event Deposited(uint256 amount);
    event Burned(uint256 amount);
    event Withdrawed(uint256 amount);
    event Liquidated(address indexed user, uint256 rUsdAmount);

    ISynt public rUsd; // rUsd address
    IERC20 public wEth; // wEth address
    IERC20 public raw; // RAW token
    ISynter public synter; // address of the Synter contract
    IOracle public oracle; // oracle to get synt prices
    ITreasury public treasury; // treasury address to collect rewards
    ILoan public loan; // Loan contract which contains shorts
    IInsurance insurance; // Insurance contract
    uint32 public minCollateralRatio; // min collateral ration e.g. 1.2 (8 decimals)
    uint32 public liquidationCollateralRatio; // collateral ratio to enough to liquidate e.g. 1.2 (8 decimals)
    uint32 public liquidationPenalty; // rewards for liquidation e.g 0.1 (8 decimals)
    uint32 public treasuryFee; // treasury liquidation fee e.g. 0.2 (8 decimals)

    uint256 public totalShares; // total shares of global debt
    mapping(address => UserDebt) public userDebts; // user debts info

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
    function initialize(
        address _rUsd,
        address _wEth,
        address _raw,
        address _synter,
        address _oracle,
        address _treasury,
        address _loan,
        address _insurance
    )
        external
        onlyOwner
    {
        // require(_rUsd != address(0) && address(rUsd) == address(0), "Inicialize only once");
        // require(_wEth != address(0) && address(wEth) == address(0), "Inicialize only once");
        // require(_raw != address(0) && address(raw) == address(0), "Inicialize only once");
        // require(_synter != address(0) && address(synter) == address(0), "Inicialize only once");
        // require(_treasury != address(0) && address(treasury) == address(0), "Inicialize only once");
        // require(_insurance != address(0) && address(insurance) == address(0), "Inicialize only once");
        // require(_loan != address(0) && address(loan) == address(0), "Inicialize only once");
        // require(_oracle != address(0) && address(oracle) == address(0), "Inicialize only once");

        rUsd = ISynt(_rUsd);
        wEth = IERC20(_wEth);
        raw = IERC20(_raw);
        synter = ISynter(_synter);
        oracle = IOracle(_oracle);
        treasury = ITreasury(_treasury);
        loan = ILoan(_loan);
        insurance = IInsurance(_insurance);
    }

    /* ================= USER FUNCTIONS ================= */

    /**
     * @notice Pledge wETH as a collateral and mint rUSD
     * @param _amountToMint Amount of rUSD to mint
     * @param _amountToPledge Amount of wETH to pledge
     */
    function mint(uint256 _amountToMint, uint256 _amountToPledge) external {
        UserDebt storage debt = userDebts[msg.sender];

        require(_amountToMint != 0, "Mint amount cannot be zero");
        (uint256 wEthPrice_, uint8 wEthDecimals_) = oracle.getPrice(address(wEth));
        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
        require(rUsdPrice_ != 0, "rUSD price cannot be zero");

        uint32 collateralRatio_ = uint32(
            wEthPrice_ * _amountToPledge * 10 ** (8 + rUsdDecimals_)
                / (rUsdPrice_ * _amountToMint * 10 ** wEthDecimals_)
        );
        require(collateralRatio_ >= minCollateralRatio, "Collateral ration less than minCollateralRatio");

        uint256 globalDebt_ = globalDebt();
        uint256 shares_ = globalDebt_ == 0 ? 1e18 : (totalShares * _amountToMint) / globalDebt_;
        totalShares += shares_;

        debt.minted += _amountToMint;
        debt.collateral += _amountToPledge;
        debt.shares += shares_;

        wEth.transferFrom(msg.sender, address(this), _amountToPledge);
        synter.mintSynt(address(rUsd), msg.sender, _amountToMint);

        emit Minted(_amountToMint, _amountToPledge);
    }

    /**
     * @notice Deposit wETH to collateral to increase collateral rate and escape liquidation
     * @param _amount amoount of wETH to deposit
     */
    function deposit(uint256 _amount) external {
        UserDebt storage debt = userDebts[msg.sender];

        debt.collateral += _amount;
        rUsd.transferFrom(msg.sender, address(this), _amount);

        emit Deposited(_amount);
    }

    /**
     * @notice Burn rUSD and return collateral
     * @param _amount amount of rUSD to burn
     * @param _insId unique id of the insurance to get compensation from
     */
    function burn(uint256 _amount, bytes32 _insId) external {
        UserDebt storage debt = userDebts[msg.sender];

        uint256 globalDebt_ = globalDebt();
        uint256 userDebt_ = (globalDebt_ * debt.shares) / totalShares;

        // min(_amount, userDebt_)
        uint256 amountToBurn_ = userDebt_ >= _amount ? _amount : userDebt_;
        uint256 sharesToBurn_ = (amountToBurn_ * totalShares) / globalDebt_;

        // get rid of round
        if (userDebt_ == amountToBurn_) {
            totalShares -= debt.shares;
            debt.shares = 0;
        } else {
            debt.shares -= sharesToBurn_;
            totalShares -= sharesToBurn_;
        }

        synter.burnSynt(address(rUsd), msg.sender, amountToBurn_);

        // compensation
        if (_insId != 0) {
            require(msg.sender == insurance.insurances(_insId).user, "Insurance do not belong to the msg.sender");

            uint256 overpayed_ = amountToBurn_ > debt.minted ? amountToBurn_ - debt.minted : 0;

            insurance.compensate(_insId, overpayed_);
        }

        if (debt.minted > amountToBurn_) {
            unchecked {
                debt.minted -= amountToBurn_;
            }
        } else {
            debt.minted = 0;
        }

        emit Burned(amountToBurn_);
    }

    /**
     * @notice Withdraw wETH from collateral
     * @param _amount amount of wETH to withdraw
     */
    function withdraw(uint256 _amount) external {
        UserDebt storage debt = userDebts[msg.sender];
        require(_amount != 0, "Withdraw amount cannot be zero");

        (uint256 wEthPrice_, uint8 wEthDecimals_) = oracle.getPrice(address(wEth));
        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));

        require(rUsdPrice_ != 0, "rUSD price cannot be zero");

        // min(debt.collateral, _amount)
        uint256 amountToWithdraw_ = debt.collateral > _amount ? _amount : debt.collateral;

        uint256 globalDebt_ = globalDebt();
        uint256 userDebt_ = (globalDebt_ * debt.shares) / totalShares;

        uint256 collateralAfterWithdraw_ = debt.collateral - amountToWithdraw_;

        uint32 collateralRatio_;
        if (userDebt_ != 0) {
            collateralRatio_ = uint32(
                wEthPrice_ * collateralAfterWithdraw_ * 10 ** (8 + rUsdDecimals_)
                    / (rUsdPrice_ * userDebt_ * 10 ** wEthDecimals_)
            );
        } else {
            collateralRatio_ = type(uint32).max;
        }

        require(collateralRatio_ >= minCollateralRatio, "Result ration less than minCollateralRatio");

        debt.collateral -= amountToWithdraw_;
        wEth.transfer(msg.sender, amountToWithdraw_);

        emit Withdrawed(amountToWithdraw_);
    }

    /**
     * @notice Function to liquidate under-collaterized positions
     * @dev This function has no UI in the protocol app
     * @param _user user address to liquidate
     */
    function liquidate(address _user) external {
        UserDebt storage debt = userDebts[_user];

        require(debt.minted != 0, "Position doesn't exist");

        uint256 globalDebt_ = globalDebt();
        uint256 userDebt_ = (globalDebt_ * debt.shares) / totalShares;

        require(collateralRatio(_user) < liquidationCollateralRatio, "Cannot liquidate yet");

        (uint256 wEthPrice_, uint8 wEthDecimals_) = oracle.getPrice(address(wEth));
        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));

        uint256 neededRusd_ = (
            minCollateralRatio * userDebt_ * rUsdPrice_ * 10 ** wEthDecimals_
                - debt.collateral * wEthPrice_ * 10 ** (8 + rUsdDecimals_)
        ) / (rUsdPrice_ * 10 ** wEthDecimals_ * (minCollateralRatio - (1e8 + liquidationPenalty + treasuryFee)));

        uint256 liquidatedWeth_ = (
            neededRusd_ * rUsdPrice_ * (1e8 + liquidationPenalty + treasuryFee) * 10 ** wEthDecimals_
        ) / (wEthPrice_ * 10 ** (8 + rUsdDecimals_));

        uint256 liquidatorReward_ =
            liquidatedWeth_ * (1e8 + liquidationPenalty) / (1e8 + liquidationPenalty + treasuryFee);

        uint256 treasuryReward_ = liquidatedWeth_ * treasuryFee / (1e8 + liquidationPenalty + treasuryFee);

        uint256 sharesToBurn_ = (neededRusd_ * totalShares) / globalDebt_;

        // if CR dropped too low
        // we pay the liquidator at the expense of other people's collateral
        // and reimburse the losses at the expense of the treasury manually

        if (liquidatorReward_ + treasuryReward_ <= debt.collateral) {
            unchecked {
                debt.collateral -= liquidatorReward_ + treasuryReward_;
            }
        } else {
            debt.collateral = 0;
        }

        if (sharesToBurn_ <= debt.shares) {
            unchecked {
                debt.shares -= sharesToBurn_;
                totalShares -= sharesToBurn_;
            }
        } else {
            totalShares -= debt.shares;
            debt.shares = 0;
        }

        synter.burnSynt(address(rUsd), msg.sender, neededRusd_);
        wEth.transfer(address(treasury), treasuryReward_);
        wEth.transfer(msg.sender, liquidatorReward_);

        emit Liquidated(_user, neededRusd_);
    }

    /* ================= PUBLIC FUNCTIONS ================= */

    function globalDebt() public view returns (uint256 globalDebt_) {
        globalDebt_ = rUsd.totalSupply();
        (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));

        for (uint256 i = 0; i < synter.totalSynts(); ++i) {
            address syntAddress_ = synter.syntList(i);
            (uint256 syntPrice_, uint8 syntDecimals_) = oracle.getPrice(syntAddress_);
            globalDebt_ +=
                loan.totalLongs(syntAddress_) * syntPrice_ * 10 ** rUsdDecimals_ / (rUsdPrice_ * 10 ** syntDecimals_);
            globalDebt_ -=
                loan.totalShorts(syntAddress_) * syntPrice_ * 10 ** rUsdDecimals_ / (rUsdPrice_ * 10 ** syntDecimals_);
        }
    }

    /**
     * @notice Calculate collateral ratio for given user
     * @dev returns 18 decimal
     * @param _user user address
     * @return collateralRatio_ collateral ratio
     */
    function collateralRatio(address _user) public view returns (uint32 collateralRatio_) {
        UserDebt storage debt = userDebts[_user];

        if (totalShares == 0) {
            collateralRatio_ = 0;
        } else {
            (uint256 wEthPrice_, uint8 wEthDecimals_) = oracle.getPrice(address(wEth));
            (uint256 rUsdPrice_, uint8 rUsdDecimals_) = oracle.getPrice(address(rUsd));
            require(rUsdPrice_ != 0, "rUSD price cannot be zero");

            uint256 globalDebt_ = globalDebt();
            uint256 userDebt_ = (globalDebt_ * debt.shares) / totalShares;

            if (userDebt_ != 0) {
                collateralRatio_ = uint32(
                    wEthPrice_ * debt.collateral * 10 ** (8 + rUsdDecimals_)
                        / (rUsdPrice_ * userDebt_ * 10 ** wEthDecimals_)
                );
            } else {
                collateralRatio_ = type(uint32).max;
            }
        }
    }

    function userDebt(address _user) public view returns (uint256 userDebt_) {
        UserDebt storage debt = userDebts[_user];
        uint256 globalDebt_ = globalDebt();
        userDebt_ = (globalDebt_ * debt.shares) / totalShares;
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
