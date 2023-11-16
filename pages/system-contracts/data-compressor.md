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

## Pool data 
