# Building adapters

All adapters must pass internal and external security audits, and can only be added to the system with approval from the DAO.
Nevertheless, we welcome all the contributors willing to help in integrating Gearbox with as many DeFi protocols as possible.
This page lists the guidelines we hope to be useful for them to start writing secure and efficient adapters.
It might also help to gain advanced understanding of the system and our reasoning about its security.

## General guidelines

First of all, since adapters are wrappers, it makes sense to thoroughly understand the protocol you're making a wrapper for.
What are the main contracts to interact with?
Are they fully compatible with Gearbox?

Keep in mind the following things:
* credit accounts don't work with native ETH, so gateway is needed to unwrap WETH before calling the target contract (e.g., `LidoV1Gateway` and `CEtherGateway`);
* pools don't support rebasing tokens, so non-rebasing wrapper is needed if there should be a pool for this token (e.g., `WstETH` and `WrappedAToken`);
* Gearbox only recognizes ERC-20 tokens as collateral, so if the protocol itself doesn't tokenize the operation, the adapter should do that instead (e.g., `ConvexStakedPositionToken` used in Convex `BaseRewardPool` adapter);
* if adapter produces a token that has no Chainlink price feed (LP tokens, non-rebasing wrappers, etc), a custom price feed must be created for this token (this is explained in more detail in the [oracles](../oracle/overview) section).

Now, what functionality should be in the adapter?
* wrappers for all target contract functions that can modify account's state (interface must be the same, but returned values can be omitted);
* versions of those functions that operate on the entire account's balance, unless they already exist in the target contract;
* wrappers for state-reading functions should only be added when necessary.

We now need to make wrapping functions secure.
In order to do that, beyond simply calling the target contract, adapter functions must ensure that:
* they are called as part of the multicall and operate on the account on which it is executed;
* tokens received after the operation are recognized as collateral by the credit manager;
* target contract approvals for credit account's tokens are revoked after the operation;
* tokens recipient is always the credit account.

Finally, for every adapter, there should be a library that would prepare calldata for multicalls.

## `AbstractAdapter`

`AbstractAdapter` is a helper contract that provides utility functions to securely interact with credit account, credit manager and target contract.
It should be inherited and used by all adapters.

Let's analyze the functionality it provides:

* `addressProvider`: Contract that allows to access global addresses like Gearbox treasury, WETH, etc.

* `configuratorOnly`: modifier that ensures that function is called by the configurator.
This modifier should be used for all functions that can change adapter's configuration parameters.

* `_creditFacade`: returns the credit facade connected to the adapter's credit manager.

* `creditFacadeOnly`: modifier that ensures that function is called by the credit facade, which is only possible during the multicall.
This modifier should be used for all functions that modify account's state. Although adapters would revert if called not from the multicall because credit account is not owned by the facade, it serves as re-entrancy protection in case attacker somehow gains control during the target contract call.

* `_creditAccount`: returns the credit account the multicall is executed on, which is the account currently owned by the credit facade.
This function should always be used when adapter needs to know the address of the credit account it's called for.

* `_checkToken`: checks that token is registered as collateral token in the credit manager and returns its mask.
This function can be used to initialize token masks in adapter's constructor and later use them in `_changeEnabledTokens`.

* `_approveToken`: approves given amount of credit account's token to the target contract.

* `_enableToken`: checks that token is registered as collateral token in the credit manager and enables it as collateral of the credit account.

* `_disableToken`: disables token as collateral of the credit account.

* `_changeEnabledTokens`: enables and disables multiple tokens by their token masks in the credit manager in a single call.

* `_execute`: calls the target contract from the credit account with passed calldata and returns the bytes-encoded call result.

* `_executeSwapNoApprove`: same as `_execute`, but also enables input token and optionally disables output token.
It is useful for swap operations when input and output tokens are not known in advance.

* `_executeSwapSafeApprove`: same as `_executeSwapNoApprove`, but also gives the target contract infinite approval for input token before the call and resets it to `1` after the call.
It is useful for approve-requiring swap operations when input and output tokens are not known in advance.

## Optimizations

Here are some additional optimizations that can be made in wrapping functions:
* if wrapping function doesn't process or modify parameters in any way, pass `msg.data` directly to `_execute...` (saves gas);
* when spending the entire balance, spend `balance - 1` instead of `balance` (saves gas);
* when revoking an approval, set the allowance to `1` instead of `0` (saves gas);
* enable tokens received after the operation, disable tokens whose entire balance is spent after the operation (simplifies multicalls for users);
* when tokens that are spent/received in the operation can be known in advance, use `_changeEnabledTokens` to perform all enabling/disabling in a single call (saves gas).

## Checklist

Keeping all written above in mind, we can create a formal set of conditions that adapters must satisfy:
- [ ] Adapter must be made compatible with Gearbox protocol;
- [ ] Adapter must inherit and make use of `AbstractAdapter`;
- [ ] All wrapping functions that modify account's state must have the `creditFacadeOnly` modifier;
- [ ] All wrapping functions can only modify the state of the `_creditAccount()`;
- [ ] All wrapping functions that allow to specify a recipient must set it to the `_creditAccount()`;
- [ ] All wrapping functions that require token approval to execute an operation must reset it to `1` after;
- [ ] All wrapping functions that receive/spend tokens must call `_enableToken()`/`_disableToken()` (or `_changeEnabledTokens` if tokens were checked in the constructor).

On the next page, we'll try to write a generic adapter for ERC-4626 vaults and evaluate it against this checklist.
