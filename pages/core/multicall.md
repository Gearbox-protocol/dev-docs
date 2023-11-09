# Multicalls

Multicalls are the main way Credit Accounts are managed by their owners in Gearbox. They essentially are a sequence of specifically encoded (target, calldata) that correspond to various actions, such as managing credit account's debt, adding collateral, or interacting with external protocols. The sequence is submitted to the Credit Facade, which instructs the Credit Manager and the adapters to perform required actions with the Credit Account.

Multicalls are executed atomically within a single transaction (i.e., the entire multicall is executed or none of it) and each multicall is followed by a collateral check. Since collateral checks are relatively expensive gas-wise, it is intended for all account management actions that the user may want to perform to be doable within a single multicall (although there are some minor security restrictions that may apply in rare cases). 

Multicalls can also be performed on opening, closing and liquidating an account, and submitted by bots (if the account owner has given the bot required privileges).

There are two types of calls that can be submitted within a multicall - account management calls and external calls.

## Credit Account Management

A multicall can have calls that instruct to change various parameters of a Credit Account in Gearbox. These typically have the account's Credit Facade as a target and include:
1. **Adding collateral** - transferring a collateral token from the user to the account and enabling the token;
2. **Withdrawing collateral** - transferring collateral from the account to the user;
3. **Managing debt** - borrowing more from the pool or repaying debt partially or fully;
4. **Enabling and disabling tokens** - manually enabling and disabling tokens as collateral (for non-quoted tokens only);
5. **Updating quotas** - increasing and reducing the value of collateral tokens that is counted towards account health;
6. **Adding slippage control** - enabling a slippage control check at the end of the multicall, which ensures that some tokens' balances are not less than expected;
7. **Updating oracle prices** - some price feeds require on demand updates, which need to be submitted to manage an account that has the associated token (see more [here](/));
8. **Revoking allowances** - generally, adapters set allowances to 1 after any operation. If this didn't happen for some reason (or this is an old account that existed before automatic allowance resets), the user can do that manually.

## External calls

External calls are used to instruct the Credit Account to interact with external protocols. The target for an external call is an adapter associated with the protocol, and calldata is for the adapter function that needs to be called. Adapters, in general, implement all required functions with the same signature as the protocol contract itself (i.e., the adapter for `UniswapV3` will have `exactInputSingle` and `exactInput` functions, among others), but there are also new functions that provide extended functionality (e.g., `UniswapV3` will have a new function `exactDiffInputSingle` that allows to specify the leftover amount, instead of the swapped amount). For more information on adapter specifications, see [the relevant section](/integrations-v3/overview).

## Example multicall

Suppose that a user wants to deposit USDC to an empty account, then borrow more USDC and deposit all of that into Convex steCRV. They would then submit the following multicall to the Credit Facade:
1. Credit Facade - Add USDC as collateral;
2. Credit Facade - Borrow USDC;
3. UniswapV3 adapter - Swap USDC to WETH;
3. Curve steCRV adapter - Deposit WETH into Curve steCRV LP;
4. Convex Booster adapter - Deposit Curve steCRV into staked Convex steCRV;

The user can optionally add a slippage check call to Credit Facade to check the final `stkcvxsteCRV` (token representing a staked Convex position) balance, to ensure that they did not suffer a lot of slippage when swapping USDC to WETH, or depositing WETH into Curve.



