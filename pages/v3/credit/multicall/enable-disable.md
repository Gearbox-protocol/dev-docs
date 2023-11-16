# Enabling and disabling tokens

## Enabling non-quoted tokens

To enable a token as collateral, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Enables token as account's collateral, which makes it count towards account's total value
/// @param token Token to enable as collateral
/// @dev Enabling forbidden tokens is prohibited
/// @dev Quoted tokens can only be enabled via `updateQuota`, this method is no-op for them
function enableToken(address token) external;
```

### Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.enableToken, (token))
});

creditFacade.multicall(calls);
```

## Disabling non-quoted tokens

To disable a token as collateral, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Disables token as account's collateral
/// @param token Token to disable as collateral
/// @dev Quoted tokens can only be disabled via `updateQuota`, this method is no-op for them
function disableToken(address token) external;
```

### Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.disableToken, (token))
});

creditFacade.multicall(calls);
```

## On enabling quoted tokens

Only non-quoted tokens can be enabled and disabled manually. Quoted tokens are only enabled when a non-zero quota is set for them, and disabled when their quota is zeroed (as allowing enabling/disabling these tokens manually can break quota interest computations). Calling `enableToken` or `disableToken` for them will do nothing.

## Automatic enabling and disabling of non-quoted tokens

Both Credit Facade and adapter calls track token balances after the operation is executed, and enable/disable the token according to the change. If the token's balance changes from 0/1 to larger than 1, it is enabled automatically.  If the token's balance is changed from larger than 1 to 0/1, it is disabled automatically. This means that, generally, manually enabling and disabling tokens after swaps through adapters or operations like `withdrawCollateral` is not required.

## Max collateral token number

Each Credit Manager has a maximal number of enabled collateral tokens per Credit Account (this is done to ensure that liquidations cannot get too expensive). This encompasses both non-quoted and quoted tokens (remember that quoted tokens are enabled when they have a positive quota). If the number of enabled collateral tokens exceeds the maximum during the collateral check, the entire multicall is reverted.

## Keeping disabled tokens on the account

It is advised not to keep non-zero balances on the Credit Account for disabled tokens, or at least make sure that the account is healthy when doing that. Because `totalValue` during liquidations is computed based on enabled tokens only, the liquidator is able to withdraw all disabled token balances on top of their normal premium.