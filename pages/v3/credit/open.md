# Open credit account

To use Gearbox V3, the user must first open a Credit Account. While it's possible to just open a "plain" account (i.e., just an empty wallet without leverage), the user would generally want to borrow funds from the pool and convert them into a leveraged position of their choice.

![Opening credit account](/images/credit/openCreditAccount.jpg)

Opening an account is done using the following Credit Facade function:

```solidity
function openCreditAccount(
    uint256 onBehalfOf,
    MultiCall[] calldata calls,
    uint16 referralCode
) external payable;
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| onBehalfOf | The address of the owner of the newly opened account. |
| calls | The array of `MultiCall` structs to be executed immediately after opening an account. |
| referralCode | Referral code, which is used for potential partner rewards. 0 if no referral code provided. |

## Typical opening flow

These are the actions that need to be submitted to `calls` in order to open a leveraged position:

0. If the account will end up with token that have on-demand price feeds, they need to be [updated](multicall/on-demand-pf) in order for the collateral check to succeed. All on-demand price feed updates must be performed before the rest of the calls.
1. [Increase debt](multicall/debt-management) to the required debt amount;
2. [Add collateral](multicall/add-collateral) to add user funds (this can be in underlying or any other asset);
3. Use [external calls](multicall/external-calls) to convert the underlying from the pool and added collateral to token(s) of choice (this will be the end token(s) collateralizing the debt). Optionally, these calls can be wrapped in a [slippage check](multicall/slippage-check).
4. If one or more received token(s) are quoted collateral tokens, [update their quotas](multicall/update-quota) to ensure that these tokens are counted as collateral;

## Things to look out for

### Borrowing limits

Each CreditFacade imposes limits on the borrowed amount for a single CA, set by the DAO. Those limits can retrieved by using a CreditFacade getter `CreditFacadeV3.debtLimits()`, which returns a tuple of `(minDebt, maxDebt)`. The debt principal after all calls must be either in this interval, or 0. Otherwise, the opening will fail.

There is also the per-Credit Manager borrowing limit. You can find the remaining capacity for borrowing as follows:

```solidity
address creditManager = ICreditFacadeV3(creditFacade).creditManager();
address pool = ICreditManagerV3(creditManager).pool();

uint256 borrowable = IPoolV3(pool).creditManagerBorrowable(creditManager);
```

Finally, there is a limit on borrows per block that is defined as a multiplier of `maxDebt`. It can be retrieved with `CreditFacadeV3.maxDebtPerBlockMultiplier()`.

These values can also be retrieved from the [Data Compressor](../helpers/data-compressor).

### Quota limits

Before opening, it's best to check that total quotas for the target assets is not at limit, otherwise the position can't be opened. This can be retrieved as follows:

```solidity
address creditManager = ICreditFacadeV3(creditFacade).creditManager();
address pool = ICreditManagerV3(creditManager).pool();

address pqk = IPoolV3(pool).poolQuotaKeeper();

(,,, uint96 totalQuoted, uint96 limit, ) = PoolQuotaKeeperV3(pqk).getTokenQuotaParams(token);
```

### DegenNFT

Some Credit Facades can be in a `whitelisted` mode. This can be checked by calling `CreditFacadeV3.degenNFT()` and checking if the address is non-zero.
In whitelisted mode, only the users with a special DegenNFT from the DAO can open accounts, with 1 DegenNFT being burned for each opening. Opening an account on behalf of someone else is also not allowed in whitelisted mode.

### Function restrictions

It's not allowed to decrease debt or withdraw collateral during an account opening.
