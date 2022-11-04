// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct UserDebt {
    uint256 minted; // total rUSD minted
    uint256 collateral; // collateral in wETH
    uint256 shares; // share of global debt (18 decimals)
}

interface ISynergy {
    function mint(uint256 amount) external;
    function deposit(uint256 amount) external; // deposit wETH
    function burn(uint256 amount) external;
    function withdraw(uint256 amount) external; // withdraw wETH
    function globalDebt() external view returns (uint256);
    function collateralRatio(address user) external view returns (uint32);
    function userDebt(address user) external returns (uint256);
    function predictCollateralRatio(address user, uint256 amountToMint, uint256 amountToPledge, bool increase)
        external
        view
        returns (uint256);
    function minCollateralRatio() external view returns (uint32);
    function liquidationCollateralRatio() external view returns (uint32);
    function liquidationPenalty() external view returns (uint32);
    function treasuryFee() external view returns (uint32);
    function setMinCollateralRatio(uint32 _minCollateralRatio) external;
    function setLiquidationCollateralRatio(uint32 _liquidationCollateralRatio) external;
    function setLiquidationPenalty(uint32 _liquidationPenalty) external;
    function setTreasuryFee(uint32 _treasuryFee) external;
    function liquidate(address user) external;
}
