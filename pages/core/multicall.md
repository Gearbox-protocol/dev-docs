# Multicalls

Multicalls are the main way Credit Accounts are managed by their owners in Gearbox. They essentially are a sequence of specifically encoded (target, calldata) that correspond to various actions, such as managing credit account's debt, adding collateral, or interacting with external protocols. The sequence is submitted to the Credit Facade, which instructs the Credit Manager and the adapters to perform required actions with the Credit Account.

Multicalls are executed atomically within a single transaction (i.e., the entire multicall is executed or none of it) and each multicall is followed by a collateral check. Since collateral checks are relatively expensive gas-wise, it is intended for all account management actions that the user may want to perform to be doable within a single multicall (although there are some minor security restrictions that may apply in rare cases).

Multicalls can also be performed on opening, closing and liquidating an account, and submitted by bots (if the account owner has given the bot required privileges).

There are two types of calls that can be submitted within a multicall - account management calls and external calls.

## Credit Account Management

A multicall can have calls that instruct to change various parameters of a Credit Account in Gearbox. These typically have the account's Credit Facade as a target and include:

1. **Adding collateral** - transferring a collateral token from the user to the account;
2. **Withdrawing collateral** - transferring collateral from the account to the user;
3. **Managing debt** - borrowing more from the pool or repaying debt partially or fully;
4. **Updating quotas** - increasing and reducing the value of collateral tokens that is counted towards account health;
5. **Adding slippage control** - enabling a slippage control check at the end of the multicall, which ensures that some tokens' balances are not less than expected;
6. **Updating oracle prices** - some price feeds require on demand updates, which need to be submitted to manage an account that has the associated token (see more [here](../credit/multicall/on-demand-pf));
7. **Setting bot permissions** - users can grant or revoke permissions for specific bots to manage their credit account within a multicall.

## External calls

External calls are used to instruct the Credit Account to interact with external protocols. The target for an external call is an adapter associated with the protocol, and calldata is for the adapter function that needs to be called. Adapters, in general, implement all required functions with the same signature as the protocol contract itself (i.e., the adapter for `UniswapV3` will have `exactInputSingle` and `exactInput` functions, among others), but there are also new functions that provide extended functionality (e.g., `UniswapV3` will have a new function `exactDiffInputSingle` that allows to specify the leftover amount, instead of the swapped amount). For more information on adapter specifications, see [the relevant section](../integrations/overview).

## Example multicall

Suppose that a user wants to deposit USDC to an empty account, then borrow more USDC and deposit all of that into Convex steCRV. They would then submit the following multicall to the Credit Facade:

| Target                 | Action                                         |
| ---------------------- | ---------------------------------------------- |
| Credit Facade          | Add USDC as collateral                         |
| Credit Facade          | Borrow USDC                                    |
| UniswapV3 adapter      | Swap USDC to WETH                              |
| Curve steCRV adapter   | Deposit WETH into Curve steCRV LP              |
| Convex Booster adapter | Deposit Curve steCRV into staked Convex steCRV |

The user can optionally add a slippage check call to Credit Facade to check the final `stkcvxsteCRV` (token representing a staked Convex position) balance, to ensure that they did not suffer a lot of slippage when swapping USDC to WETH, or depositing WETH into Curve.

## Collateral checks

After each multicall, the protocol performs a collateral check to ensure that the account's collateral is sufficient to cover the debt. In order to pass a collateral check (aside from the obvious requirement that the collateral value must be greater than the debt), the user must make sure that:

1. Collateral tokens have appropriate quotas;
2. Prices are updated for tokens which have push (updatable on-demand) price feeds;

In some cases, the protocol may also require **_safe prices_**. Safe prices are computed as the minimum of the token's main and reserve price feeds (compared to non-safe price checks, which only use the main price feed). In general, safe prices are invoked when:

1. The multicall performs a withdrawal;
2. The multicall makes an external call that may result in slippage - this generally includes external calls to DEX adapters;
3. There are forbidden tokens on the account at the end of the multicall.
