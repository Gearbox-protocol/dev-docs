# Setting additional collateral check params

There are two additional parameters that the user can optionally enable to improve the final collateral check:
1. Collateral hints - the user can set an array of tokens that they want to prioritize during a collateral check. I.e., the tokens passed in `collateralHints` will be added first to the TWV in the same order as they are passed, and the rest are checked afterwards. Since collateral checks finish early once they determine that `twvUSD >= debtUSD`, passing the tokens that contribute the most value to account's TWV can save a lot of gas, by minimizing the number of required price oracle calls.
2. Minimal health factor - by default, the collateral check verifies that the health factor is above 1. The user may pass any value higher than 1 (in bp) if they wish to ensure a particular threshold of account health.

This is done using the following `ICreditFacadeV3Multicall` function:
```solidity
/// @notice Sets advanced collateral check parameters
/// @param collateralHints Optional array of token masks to check first to reduce the amount of computation
///        when known subset of account's collateral tokens covers all the debt
/// @param minHealthFactor Min account's health factor in bps in order not to revert, must be at least 10000
function setFullCheckParams(uint256[] calldata collateralHints, uint16 minHealthFactor) external;
```

## Usage

```solidity

address[] memory collateralHints = new address[](2);

uint256 usdcMask = creditManager.getTokenMaskOrRevert(usdc);
uint256 linkMask = creditManager.getTokenMaskOrRevert(link);

collateralHints[0] = usdcMask;
collateralHints[1] = linkMask;

MultiCall[] memory calls = new MultiCall[](5);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.setFullCheckParams, (collateralHints, minHealthFactor))
});

/// Rest of the calls here
...

creditFacade.multicall(calls);
```