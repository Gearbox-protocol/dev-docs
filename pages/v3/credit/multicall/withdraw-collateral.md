# Withdrawing collateral

To transfer collateral from the Credit Account to the caller, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Withdraws collateral from account
/// @param token Token to withdraw
/// @param amount Amount to withdraw, `type(uint256).max` to withdraw all balance
/// @param to Token recipient
/// @dev This method can also be called during liquidation
/// @dev Withdrawals are prohibited in multicalls if there are forbidden tokens enabled as collateral on the account
/// @dev Withdrawals activate safe pricing (min of main and reserve feeds) in collateral check
function withdrawCollateral(address token, uint256 amount, address to) external;
```

This will immediately transfer the requested token amount from Credit Account to the caller.

## Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.withdrawCollateral, (token, amount, to))
});

creditFacade.multicall(calls);
```

## Collateral check with safe prices

If there is at least one `withdrawCollateral` in a multicall, the final collateral check will use "safe pricing". This means that instead of using the value from the primary price feed only, the following function will be used for each collateral asset:

$$
    p_i = min(p_i^M, p_i^R);
$$

where $p_i^M$ is the main price feed value and $p_i^R$ is the reserve price feed value. Depending on how the reserve price feed is set up, it's value may be always the same as the main price feed (in this case we consider the asset "trusted"), lower than the main price feed, or even 0. As a result, some asset compositions on a Credit Account may make withdrawals impossible due to the collateral check with "safe prices" failing.

## Withdrawing the entire balance

Passing `type(uint256).max` as the `amount` parameter will withdraw the entire balance of an asset from the Credit Account.
