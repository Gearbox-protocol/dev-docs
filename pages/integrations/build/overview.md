# Building adapters

All adapters must pass internal and external security audits, and can only be added to the system with approval from the DAO.
Nevertheless, we welcome all the contributors willing to help in integrating Gearbox with as many DeFi protocols as possible.
This page lists the guidelines useful to start writing secure and efficient adapters.
It might also help to gain advanced understanding of the system and our reasoning about its security.

## General guidelines

First of all, since adapters are wrappers, it makes sense to thoroughly understand the protocol you're making a wrapper for.
What are the main contracts to interact with?
Are they fully compatible with Gearbox?

Keep in mind the following things:
* credit accounts don't work with native ETH, so a gateway is needed to unwrap WETH before calling the target contract (e.g., `LidoV1Gateway` and `CEtherGateway`);
* pools don't support rebasing tokens, so non-rebasing wrapper is needed if there should be a pool for this token (e.g., `WstETH` and `WrappedAToken`);
* Gearbox only recognizes ERC-20 tokens as collateral, so if the protocol itself doesn't tokenize the operation, the adapter should do that instead (e.g., `ConvexStakedPositionToken` used in Convex `BaseRewardPool` adapter);
* if adapter produces a token that has no Chainlink price feed (LP tokens, non-rebasing wrappers, etc), a custom price feed must be created for this token (this is explained in more detail in the [oracles](../oracle/overview) section);
* Gearbox generally does not support protocols with delayed withdrawals, since a lot of its security assumptions rely on being able to liquidate assets immediately upon the account becoming unhealthy. While this does not **totally** preclude integrations with such protocols, a solution to this issue needs to be presented before the adapter can be included into the whitelist.

Now, what functionality should be in the adapter?
* wrappers for all target contract functions that can modify account's state (interface must be the same, but returned values are replaced with `tokensToEnable` and `tokensToDisable`, i.e., masks of tokens that should be enabled or disabled after the call);
* versions of those functions that operate on the difference between the entire balance and some specified amount (these are called `diff` functions internally and are needed to handle multi-step operations properly);
* wrappers for state-reading functions should only be added when necessary (e.g., it may be useful to save some non-changing values as immutable fields in the adapter, to save on gas).

We now need to make wrapping functions secure.
In order to do that, beyond simply calling the target contract, adapter functions must ensure that:
* they are called as part of the multicall and operate on the account on which it is executed;
* target contract approvals for credit account's tokens are revoked after the operation;
* tokens spent and received during the operation are recognized as collateral by the credit manager;
* ability to execute arbitrary code during the target contract call is minimized;
* tokens recipient is always the credit account.

Finally, for every adapter, there should be a library (see [example]()) that would prepare calldata for multicalls.

## `AbstractAdapter`

`AbstractAdapter` is a helper contract that provides utility functions to securely interact with the Credit Account, the Credit Manager and the target contract.
It **must** be inherited and used by all adapters.

Let's analyze the functionality it provides:

* `addressProvider`: Contract that allows to access global addresses like Gearbox treasury, PriceOracle, Contract Register, etc.

* `configuratorOnly`: modifier that ensures that function can only be called by the configurator (i.e., the Gearbox governance).
This modifier must be used for all functions that can change adapter's configuration parameters.

* `_creditFacade`: returns the credit facade connected to the adapter's credit manager.

* `creditFacadeOnly`: modifier that ensures that function can only be called by the credit facade, which is only possible during the multicall.
This modifier **must** be used for all functions that modify account's state.
Although adapters would revert if called outside of the multicall (because the active credit account would not be set by the Credit Facade), it serves as re-entrancy protection in case the attacker somehow gains execution flow control during the target contract call.

* `_creditAccount`: returns the credit account the current multicall is executed on.
This function **must** always be used when the adapter needs to know the address of the credit account it's called for.

* `_getMaskOrRevert`: checks that the token is registered as collateral token in the credit manager and returns its mask.
This function can be used to check and initialize token masks in adapter's constructor and later use them in `_changeEnabledTokens`.

* `_approveToken`: checks that token is registered as collateral token in the credit manager and approves given amount of credit account's tokens to the target contract.

* `_execute`: calls the target contract from the credit account with passed calldata and returns the bytes-encoded call result.

* `_executeSwapNoApprove`: same as `_execute`, but also checks and (optionally) disables the input token, and checks and enables the output token.
It is useful for swap operations when input and output tokens are not known in advance.

* `_executeSwapSafeApprove`: same as `_executeSwapNoApprove`, but also gives the target contract infinite approval for the input token before the call and resets it to `1` after the call.
It is useful for approve-requiring swap operations when input and output tokens are not known in advance.

## Optimizations

Here are some additional optimizations that can be made in wrapping functions:
* if wrapping function doesn't process or modify parameters in any way, pass `msg.data` directly to `_execute...` (saves gas);
* when spending the entire balance, spend `balance - 1` instead of `balance` (saves gas);
* when revoking an approval, set the allowance to `1` instead of `0` (saves gas);
* enable tokens received after the operation, disable tokens whose entire balance is spent after the operation (simplifies multicalls for users);
* If input and output tokens for some operation are known at adapter deployment, pre-save their masks into immutable fields to efficiently return `tokensToEnable` and `tokensToDisable`.

## Checklist

Keeping all written above in mind, we can create a formal set of conditions that adapters must satisfy:
- [ ] Adapter must be made compatible with Gearbox protocol;
- [ ] Adapter must inherit and make use of `AbstractAdapter`;
- [ ] All wrapping functions that modify account's state must have the `creditFacadeOnly` modifier;
- [ ] All wrapping functions can only modify the state of the `_creditAccount()`;
- [ ] All wrapping functions that allow to specify a recipient must set it to the `_creditAccount()`;
- [ ] All wrapping functions that require token approval to execute an operation must reset it to `1` after;
- [ ] All wrapping functions that modify account's state must return appropriate `tokensToEnable` and `tokensToDisable`;

On the next page, we'll try to write a generic adapter for ERC-4626 vaults and evaluate it against this checklist.
