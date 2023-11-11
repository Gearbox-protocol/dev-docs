# Liquidating a credit account

When an account becomes unhealthy, it can be liquidated by anyone. The liquidator is allowed to perform almost any actions (with some restrictions) to convert collateral assets into underlying and fully repay the debt. After liquidation, the account owner retains the Credit Account with any remaining funds and zero debt.

To perform a liquidation, the liquidator must call the following function:

```solidity
function liquidateCreditAccount(
    address creditAccount,
    address to,
    MultiCall[] calldata calls
) external payable;
```

| Parameter     | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| creditAccount | The address of a Credit Account to liquidate.                                         |
| to            | Address to transfer leftover underlying after liquidation.                            |
| calls         | The array of `MultiCall` structs to be executed immediately after opening an account. |

## Liquidation logic

Liquidations proceed as follows:

1. The liquidator initiates a liquidation;
2. [On demand price updates](/credit/multicall/on-demand-pf) are applied, if needed;
2. `totalValue` is computed (see the [formula](/core/liquidation));
3. Credit Facades stores balances of existing collateral tokens;
4. Actions submitted in `calls` are executed;
5. Credit Facade checks that collateral balances did not increase;
6. Credit Manager computes `totalFunds = totalValue * (1 - liquidation premium)`, `amountToPool = min(totalDebt, totalFunds)`, `remainingFunds = totalFunds - amountToPool`;
7. Credit Manager sends `amountToPool` of underlying to the pool; 
8. Credit Manager checks that the value of assets (`leftover value`) left on the account is not less than `remainingFunds`; 
9. `min(leftover value - remainingFunds, underlyingBalance)` of underlying is sent to the liquidator;
10. All non-zero quotas are removed;
11. Debt is set to zero;
12. If there is any loss, then borrowing is prohibited, or, if a certain loss threshold is reached, the contracts are paused;

## Liquidation calls

The liquidator has two main goals with their `calls` array:
1. Ensure that there is enough underlying after calls to cover the total debt;
2. Ensure that they receive their premium in collateral assets or underlying;

To that end, they would either:

1. Use [external calls](/credit/multicall/external-calls) to convert collateral assets fully or partially into underlying, to cover `amountToPool + totalValue * liquidationPremium` (i.e., enough to cover total debt and liquidation profit). In this case the liquidation premium will be sent to the liquidator automatically in underlying;
2. [Add](/credit/multicall/add-collateral) enough underlying to cover debt. Then [withdraw](/credit/multicall/withdraw-collateral) the assets they want to receive as premium, making sure that enough remains to cover `remainingFunds`.

Or some combination of the two.

## Tracking unhealthy accounts

Account health can be tracked using [`calcDebtAndCollateral`](/credit/account-data) for each individual account. This data can also be retrieved in bulk from [`DataCompressor`](/helpers/data-compressor).

## Things to look out for

### Slippage and fees

`totalValue` and `remainingFunds` are calculated based on oracle prices, which do not account for price impact, slippage and trading fees. When converting assets using external calls, all of these incurred losses are essentially borne by the liquidator and are subtracted from the premium. It is recommended to account for on-chain liquidity when using DEXes such as Uniswap or Curve to liquidate, especially for medium- and long-tail assets.

### Liquidations due to expiration

Both liquidations due to low health and [expiration](/core/liquidation#liquidations-due-to-expiration) are handled by the same `liquidateCreditAccount` function. The particular type of liquidation is chosen as follows:
- If the account is unhealthy, perform a normal liquidation regardless of expiration status
- If the account is healthy, but expired, perform a liquidation due to expiration

Since liquidation premiums are different for the two (and that can influence values such as `amountToPool` and `remainingFunds`), it's advised to check which liquidation the account is eligible for before liquidation.

### Total debt amount

The total debt grows dynamically over time due to interest on principal and quotas. This means that the exact total debt amount received in a previous block will likely be slightly smaller than the total debt at execution time. It's advised to send the underlying amount with a small buffer to fully cover debt - the remainder will be sent back to the liquidator.
