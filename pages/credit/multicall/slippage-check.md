## Controlling slippage

When executing external calls to swap/deposit/withdraw assets, slippage must always be taken into consideration. An expected output amount reported by a DEX in a previous block may no longer be actual. Gearbox has a native slippage control system for multicalls, which is required for several reasons:

1. External operations may consist of several steps (such as swapping the underlying to an asset, and then depositing it), and it's not clear how to split a single slippage tolerance value (e.g., 0.1%) among individual operations without either causing unexpected failures or getting unpredictable resulting slippage;
2. Some external contracts (such as ERC4626 vaults) do not have in-protocol slippage protection and rely on integrators to check their slippage themselves.

Therefore, Gearbox provides means to notify the expected amount of some output token before a sequence of calls, and then check that the resulting balance is not less than that amount at any point during a multicall.

This is done with two functions:

```solidity
/// @notice Stores expected token balances (current balance + delta) after operations for a slippage check.
///         Normally, a check is performed automatically at the end of the multicall, but more fine-grained
///         behavior can be achieved by placing `storeExpectedBalances` and `compareBalances` where needed.
/// @param balanceDeltas Array of (token, minBalanceDelta) pairs, deltas are allowed to be negative
/// @dev Reverts if expected balances are already set
/// @dev This method is available in all kinds of multicalls
function storeExpectedBalances(BalanceDelta[] calldata balanceDeltas) external;

/// @notice Performs a slippage check ensuring that current token balances are greater than saved expected ones
/// @dev Resets stored expected balances
/// @dev Reverts if expected balances are not stored
/// @dev This method is available in all kinds of multicalls
function compareBalances() external;
```

`storeExpectedBalances` accepts the minimal deltas that the user expects to receive after a sequence of calls, and is best called right before the sequence. Deltas for several assets at once can be submitted. After performing the external calls, `compareBalances()` is called to perform a slippage check.

## Usage 

```solidity
BalanceDelta[] memory deltas = new BalanceDelta[](1);
deltas[0] = BalanceDelta({
    token: token,
    amount: minAmount;
})

calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.storeExpectedBalances, (deltas))
});

// Assume external calls here
...

calls[3] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.compareBalances, ())
});

creditFacade.multicall(calls);
```

## Additional notes

It is recommended to keep slippage checks as close as possible to external calls they control (ideally, `storeExpectedBalances` should be right before the first external call, and `compareBalances` should be right after the last). Since slippage checks work directly off account's token balances (i.e., they call `balanceOf`), functions like `addCollateral` and `withdrawCollateral` can lead to slippage checks passing or failing wrongly, if they are called in between slippage check calls.

Calling `compareBalances` without calling `storeExpectedBalances` will fail. If `storeExpectedBalances` is called, but `compareBalances` is not called by the end of the multicall, the check is performed automatically at the end.