# DataCompressor

The [`DataCompressor`](https://github.com/Gearbox-protocol/periphery-v3/blob/main/contracts/data/DataCompressor_3_0.sol) is a contract that returns a large amount of data on a specified Pool, Credit Manager or Credit Account (or all Pools / Credit Managers / Accounts).

## Credit Account data

There are four functions that return data on Credit Accounts:

```solidity
    /// @dev Returns CreditAccountData for all opened accounts for particular borrower
    /// @param borrower Borrower address
    /// @param priceUpdates Price updates for price on demand oracles
    function getCreditAccountsByBorrower(address borrower, PriceOnDemand[] memory priceUpdates)
        external
        returns (CreditAccountData[] memory);

    /// @dev Returns CreditAccountData for all opened accounts for particular borrower
    /// @param creditManager Address
    /// @param priceUpdates Price updates for price on demand oracles
    function getCreditAccountsByCreditManager(address creditManager, PriceOnDemand[] memory priceUpdates)
        external
        returns (CreditAccountData[] memory);

    /// @dev Returns CreditAccountData for all accounts with hf <1
    /// @param priceUpdates Price updates for price on demand oracles
    function getLiquidatableCreditAccounts(PriceOnDemand[] memory priceUpdates)
        external
        returns (CreditAccountData[] memory result);

    /// @dev Returns CreditAccountData for a particular Credit Account account, based on creditManager and borrower
    /// @param creditAccount Address of credit account
    /// @param priceUpdates Price updates for price on demand oracles
    function getCreditAccountData(address creditAccount, PriceOnDemand[] memory priceUpdates)
        external
        returns (CreditAccountData memory);
```

1. `getCreditAccountsByBorrower` returns data for Credit Accounts that belong to a certain borrower;
2. `getCreditAccountsByCreditManager` returns data for Credit Accounts opened in a certain Credit Manager;
3. `getLiquidatableCreditAccounts` returns data for Credit Accounts that can currently be liquidated;
4. `getCreditAccountData` returns data for a particular Credit Account;

As a result, an array of (or a single) `CreditAccountData` is returned.

```solidity
struct CreditAccountData {
    bool isSuccessful;
    address[] priceFeedsNeeded;
    address addr;
    address borrower;
    address creditManager;
    string cmName;
    address creditFacade;
    address underlying;
    uint256 debt;
    uint256 cumulativeIndexLastUpdate;
    uint128 cumulativeQuotaInterest;
    uint256 accruedInterest;
    uint256 accruedFees;
    uint256 totalDebtUSD;
    uint256 totalValue;
    uint256 totalValueUSD;
    uint256 twvUSD;
    uint256 enabledTokensMask;
    ///
    uint256 healthFactor;
    uint256 baseBorrowRate;
    uint256 aggregatedBorrowRate;
    TokenBalance[] balances;
    uint64 since;
    uint256 cfVersion;
    // V3 features
    uint40 expirationDate;
    address[] activeBots;
    uint256 maxApprovedBots;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| isSuccessful | Whether the data was successfully retrieved. The retrieval can fail if the price feeds for some of the account's assets need to be updated. |
| priceFeedsNeeded | The list of tokens that need their price feeds updated. Empty if `isSuccessful` is true. |
| addr | Address of the Credit Account. |
| borrower | Address of the Credit Account owner. |
| creditManager | Address of the Credit Manager that the Credit Account is connected to. |
| cmName | Descriptor for the Credit Manager the account is connected to. |
| creditFacade | Address of the Credit Facade connected to the manager. |
| underlying | The underlying of the Credit Manager. |
| debt | The debt principal of the account. |
| cumulativeIndexLastUpdate | The interest index of the Credit Account at last debt update. |
| cumulativeQuotaInterest | The total unpaid quota interest of the Credit Account. |
| accruedInterest | The total unpaid interest on principal of the Credit Account. |
| accruedFees | The total unpaid fees of the Credit Account. |
| totalDebtUSD | The total debt of the Credit Account, in USD (10**8 precision). |
| totalValue | The total value of collateral on the Credit Account, in underlying. |
| totalValueUSD | The total value of collateral on the Credit Account, in USD (10**8 precision). |
| twvUSD | The total weighted value of collateral on the Credit Account, in USD (10\*\*8 precision). |
| enabledTokensMask | The mask of enabled collateral tokens on the account. |
| healthFactor | The ratio of total weighted value to debt of the Credit Account. |
| baseBorrowRate | The base borrow rate that is paid by the Credit Account based on pool utilization. |
| aggregatedBorrowRate | The total borrow rate (including quota rates) that is paid by the Credit Account. |
| balances | The list of `TokenBalance` (see below) structs for each collateral token with non-zero balance (even if disabled). |
| since | The block of the last debt update (V3) or account opening (V2). |
| cfVersion | Version of the Credit Facade connected to the Credit Account. |
| expirationDate | Date of Credit Facade expiration (0 if none). |
| activeBots | Bots with non-zero permissions from the Credit Account. |
| maxApprovedBots | The maximum number of connected bots. |

Each `TokenBalance` struct has the following fields:

```solidity
struct TokenBalance {
    address token;
    uint256 balance;
    bool isForbidden;
    bool isEnabled;
    bool isQuoted;
    uint256 quota;
    uint16 quotaRate;
    uint256 quotaCumulativeIndexLU;
}
```

| Parameter              | Description                                       |
| ---------------------- | ------------------------------------------------- |
| token                  | Address of the token.                             |
| balance                | The asset balance of the Credit Account.          |
| isForbidden            | Whether the asset is forbidden.                   |
| isEnabled              | Whether the asset is enabled.                     |
| isQuoted               | Whether the asset is quoted.                      |
| quota                  | The quota amount for the asset.                   |
| quotaRate              | The quota rate currently paid by the account.     |
| quotaCumulativeIndexLU | The value of quota interest index at last update. |

## Credit Manager data

To retrieve the list of V3 Credit Managers:

```solidity
/// @dev Returns CreditManagerData for all Credit Managers
function getCreditManagersV3List() external view returns (CreditManagerData[] memory);
```

Then, data on each individual Credit Manager can be retrieved with:

```solidity
/// @dev Returns CreditManagerData for a particular _creditManager
/// @param creditManager CreditManager address
function getCreditManagerData(address creditManager) external view returns (CreditManagerData memory);
```

The `CreditManagerData` struct is returned as a result:

```solidity
struct CreditManagerData {
    address addr;
    string name;
    uint256 cfVersion;
    address creditFacade;
    address creditConfigurator;
    address underlying;
    address pool;
    uint256 totalDebt;
    uint256 totalDebtLimit;
    uint256 baseBorrowRate;
    uint256 minDebt;
    uint256 maxDebt;
    uint256 availableToBorrow;
    address[] collateralTokens;
    ContractAdapter[] adapters;
    uint256[] liquidationThresholds;
    bool isDegenMode;
    address degenNFT;
    uint256 forbiddenTokenMask;
    uint8 maxEnabledTokensLength;
    uint16 feeInterest;
    uint16 feeLiquidation;
    uint16 liquidationDiscount;
    uint16 feeLiquidationExpired;
    uint16 liquidationDiscountExpired;
    // V3 Fileds
    QuotaInfo[] quotas;
    LinearModel lirm;
    bool isPaused;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| addr | Address of the Credit Manager. |
| name | String descriptor of the Credit Manager. |
| cfVersion | Version of the connected Credit Facade. |
| creditFacade | Address of the connected Credit Facade. |
| creditConfigurator | Address of the connected Credit Configurator. |
| underlying | Address of the CM's underlying token. |
| pool | Address of the pool the Credit Manager is borrowing from. |
| totalDebt | The total debt across the Credit Manager, in underlying. |
| totalDebtLimit | The cap on the total debt for the Credit Manager. |
| baseBorrowRate | The base borrow rate paid to the pool. |
| minDebt | Minimal debt principal per-account. |
| maxDebt | Maximal debt principal per-account. |
| availableToBorrow | The amount that is currently available to borrow from the pool. |
| collateralTokens | List of collateral tokens supported by the Credit Manager. |
| adapters | The list of (contract, adapter) pairs supported by the protocol. |
| liquidationThresholds | List of collateral liquidation thresholds (in the same order as `collateralTokens`). |
| isDegenMode | Whether a DegenNFT is required to open an account. |
| forbiddenTokenMask | Mask of tokens forbidden in the CM. |
| maxEnabledTokensLength | The max number of tokens that can be enabled as collateral on a Credit Account. |
| feeInterest | The rate of DAO fees paid on debt interest. |
| feeLiquidation | The rate of DAO fees paid on the liquidation premium. |
| liquidationDiscount | The discount applied to total funds on liquidation (1 - liquidationPremium) |
| feeLiquidationExpired | The rate of DAO fees paid on the liquidation premium, when liquidating due to expiration. |
| liquidationDiscountExpired | The discount applied to total funds on liquidation (1 - liquidationPremium), when liquidating due to expiration. |
| quotas | Array of `QuotaInfo` (see below) objects for each quoted token in the Credit Manager. |
| lirm | The address of the interest rate model for the pool. |
| isPaused | Whether the Credit Manager is paused. |

`QuotaInfo` structs encode data specific to quoted tokens:

```solidity
struct QuotaInfo {
    address token;
    uint16 rate;
    uint16 quotaIncreaseFee;
    uint96 totalQuoted;
    uint96 limit;
    bool isActive;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| token | Address of the token. |
| rate | The rate paid on quotas. |
| quotaIncreaseFee | Fees paid on each quota increase. |
| totalQuoted | The total sum of quotas for the token. |
| limit | The limit on total quotas. |
| isActive | Whether the quoted token is active and the quota can be increased. |

## Pool data

To retrieve the list of all pools:

```solidity
/// @dev Returns PoolData for all registered pools
function getPoolsV3List() external view returns (PoolData[] memory);
```

Then, data on individual pools can be retrieved with:

```solidity
/// @dev Returns PoolData for a particular pool
/// @param _pool Pool address
function getPoolData(address _pool) external view returns (PoolData memory);
```

This will return a `PoolData` struct:

```solidity
struct PoolData {
    address addr;
    address underlying;
    address dieselToken;
    string symbol;
    string name;
    ///
    uint256 baseInterestIndex;
    uint256 availableLiquidity;
    uint256 expectedLiquidity;
    //
    uint256 totalBorrowed;
    uint256 totalDebtLimit;
    CreditManagerDebtParams[] creditManagerDebtParams;
    uint256 totalAssets;
    uint256 totalSupply;
    uint256 supplyRate;
    uint256 baseInterestRate;
    uint256 dieselRate_RAY;
    uint256 withdrawFee;
    uint256 lastBaseInterestUpdate;
    uint256 baseInterestIndexLU;
    uint256 version;
    address poolQuotaKeeper;
    address gauge;
    QuotaInfo[] quotas;
    ZapperInfo[] zappers;
    LinearModel lirm;
    bool isPaused;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| addr | Address of the Pool. |
| underlying | Address of the pool's underlying. |
| dieselToken | The address of the pool's LP token. |
| symbol | Symbol of the pool's LP token. |
| name | Name of the pool's LP token. |
| baseInterestIndex | Interest index of the utilization-based interest. |
| availableLiquidity | Liquidity available for borrowing. |
| expectedLiquidity | Expected liquidity after repaying all debt. |
| totalBorrowed | Total amount borrowed from the pool. |
| totalDebtLimit | The limit on the total amount borrowed from the pool. |
| creditManagerDebtParams | An array of `CreditManagerDebtParams` structs with per-CM borrowing data. |
| totalAssets | Same as `expectedLiquidity`. |
| totalSupply | The total supply of the pool's LP token. |
| supplyRate | Annualized rate of return for LPs (in 10**27 format). |
| baseInterestRate | Rate of utilization-based interest. |
| dieselRate_RAY | Conversion rate between pool LP and underlying (in 10**27 format). |
| withdrawFee | Pool withdrawal fee in basis points. |
| lastBaseInterestUpdate | Timestamp at which the borrow rate was last updated. |
| baseInterestIndexLU | Base interest index at last update. |
| version | Pool version. |
| poolQuotaKeeper | Address of the connected PoolQuotaKeeper. |
| gauge | Address of the associated Gauge. |
| quotas | Array of `QuotaInfo` (see previous section) objects for each quoted token in the pool. |
| zappers | Array of `ZapperInfo` (see below) objects for each zapper connected to the pool. |
| lirm | The address of the interest rate model for the pool. |
| isPaused | Whether the pool is paused. |

`CreditManagerDebtParams` structs contain information on per-CM debt metrics:

```solidity
struct CreditManagerDebtParams {
    address creditManager;
    uint256 borrowed;
    uint256 limit;
    uint256 availableToBorrow;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| creditManager | Address of the Credit Manager. |
| borrowed | Total amount borrowed by the Credit Manager. |
| limit | The limit on the total amount borrowed. |
| availableToBorrow | How much more the Credit Manager can borrow. |

`LinearModel` struct contains information on the borrow rate model:

```solidity
struct LinearModel {
    address interestModel;
    uint256 version;
    uint16 U_1;
    uint16 U_2;
    uint16 R_base;
    uint16 R_slope1;
    uint16 R_slope2;
    uint16 R_slope3;
    bool isBorrowingMoreU2Forbidden;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| interestModel | Address of the interest rate model. |
| version | Version of the interest rate model. |
| U_1 | The first kink point. |
| U_2 | The second kink point. |
| R_base | The base rate. |
| R_slope1 | The slope of the [0; U_1] segment. |
| R_slope2 | The slope of the [U_1; U_2] segment. |
| R_slope3 | The slope of the [U_2; 1] segment. |
| isBorrowingMoreU2Forbidden | Whether it is forbidden to borrow more than U_2 |

`ZapperInfo` structs carry information on zappers connected to pool:

```solidity
struct ZapperInfo {
    address zapper;
    address tokenIn;
    address tokenOut;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| zapper | Address of the zapper. |
| tokenIn | The input token of the zapper. |
| tokenOut | The output token of the zapper. |
