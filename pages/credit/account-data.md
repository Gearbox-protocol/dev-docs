# Retrieving Credit Account data

The primary data related to health of the Credit Account (such as various debt amounts and collateral value) can be retrieved by calling a `CreditManager` function:

```solidity
function calcDebtAndCollateral(address creditAccount, CollateralCalcTask task)
    external
    view
    returns (CollateralDebtData memory cdd);
```

This return a structure `CollateralDebtData` with requested parameters:

```solidity
struct CollateralDebtData {
    uint256 debt;
    uint256 cumulativeIndexNow;
    uint256 cumulativeIndexLastUpdate;
    uint128 cumulativeQuotaInterest;
    uint256 accruedInterest;
    uint256 accruedFees;
    uint256 totalDebtUSD;
    uint256 totalValue;
    uint256 totalValueUSD;
    uint256 twvUSD;
    uint256 enabledTokensMask;
    uint256 quotedTokensMask;
    address[] quotedTokens;
    address _poolQuotaKeeper;
}
```

| Parameter                  | Description                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| debt                       | The Credit Account's debt principal denominated in underlying.                                                                                                    |
| cumulativeIndexNow         | The current value of the pool's interest index.                                                                                                                   |
| cumulativeIndexLastUpdated | The value of the pool's interest index after the account's last debt update.                                                                                      |
| cumulativeQuotaInterest    | The total accumulated unpaid interest from all quotas.                                                                                                            |
| accruedInterest            | The accumulated unpaid interest on principal. Computed as `debt * (cumulativeIndexNow/cumulativeIndexLastUpdate - 1)`.                                            |
| accruedFees                | Total amount of fees owed to the DAO.                                                                                                                             |
| totalDebtUSD               | Total debt of the account converted to USD (with 10 \*\* 8 precision).                                                                                            |
| totalValue                 | Total value of enabled collateral assets on the account, in underlying.                                                                                           |
| totalValueUSD              | Total value of enabled collateral assets on the account, in USD (with 10 \*\* 8 precision).                                                                       |
| twvUSD                     | [Total weighted value](../core/debt-collateral#collateral-value-and-account-health) of enabled collateral assets on the account, in USD (with 10 \*\* 8 precision). |
| enabledTokensMask          | The mask of enabled collateral tokens for a Credit Account.                                                                                                       |
| quotedTokensMask           | The mask of all quoted tokens in the Credit Manager.                                                                                                              |
| quotedTokens               | Array of quoted tokens on the Credit Account.                                                                                                                     |
| \_poolQuotaKeeper          | Address of the `PoolQuotaKeeper` associated with the account's Credit Manager (this is mainly for internal use).                                                  |

## Response granularity

`CollateralCalcTask` determines the level of detail for the returned data (with higher detail levels generally consuming more gas):

1. `GENERIC_PARAMS` - only returns account's debt principal and interest indices.
2. `DEBT_ONLY` - returns all debt information, including quota-related debt and fees. As a consequence, this also fills the `quotedTokens` array.
3. `DEBT_COLLATERAL` - returns all debt values and collateral values. This setting is used to compute values during liquidation.
4. `DEBT_COLLATERAL_SAFE_PRICES` - same as above, but uses [safe pricing](multicall/withdraw-collateral#collateral-check-with-safe-prices) for the TWV value. Used to perform collateral checks after [collateral withdrawals](multicall/withdraw-collateral).

There is also the `FULL_COLLATERAL_CHECK_LAZY` setting, but it is only used internally and is not available for external queries.

## Alternative sources

More detailed Credit Account data can be retrieved from [`DataCompressor`](../helpers/data-compressor). As it is gas-intensive, it is recommended for gasless static calls only.
