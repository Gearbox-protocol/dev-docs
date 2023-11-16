# Updating on-demand price feeds

To update the price in on-demand price feeds, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Updates the price for a token with on-demand updatable price feed
/// @param token Token to push the price update for
/// @param reserve Whether to update reserve price feed or main price feed
/// @param data Data to call `updatePrice` with
/// @dev Calls of this type must be placed before all other calls in the multicall not to revert
/// @dev This method is available in all kinds of multicalls
function onDemandPriceUpdate(address token, bool reserve, bytes calldata data) external;
```

## Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.onDemandPriceUpdate, (token, reserve, data))
});

creditFacade.multicall(calls);
```

## Updating on-demand price feeds

When a token has only an [on-demand price feed](../../oracle/updatable-price-feed) and is enabled as collateral on the Credit Account, any multicall on this account requires updating the price (it's technically possible that the last price is still usable, as it remains "fresh" for a few minutes after the update - however, it is best to push the price regardless just to be sure). If all required prices are not updated at the beginning, the collateral check will fail. Moreover, multicalls with [withdrawals](./withdraw-collateral#collateral-check-with-safe-prices) may require updating reserve price feeds as well.

All multicalls require price updates to be at the beginning of the `calls` array. Any `onDemandPriceUpdate` calls after another call signature will result in a revert. `data` passed to the update is usually an authenticated payload from offchain, so any contracts that interact with Gearbox and want to use tokens with on-demand price feeds must be capable of recieving these payloads as input.

If the token with an on-demand feed is disabled by the end of the multicall, then the price update does not need to be included.