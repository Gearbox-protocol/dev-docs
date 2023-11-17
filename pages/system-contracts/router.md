# Router

The Router is a contract that computes optimal paths to enter, exit and convert positions. Given an input token, output token and the amount, the Router will return the expected output amount, and a path (array of `MultiCall` structs) with a slippage check included. The path can then be passed to any [multicall-compatible function](../credit/multicall/overview#multicall-supporting-functions) to execute it.

All Router functions return the `RouterResult` struct:

```solidity
struct RouterResult {
    uint256 amount;
    uint256 minAmount;
    uint256 gasUsage;
    MultiCall[] calls;
}
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| amount | Expected amount of output asset. |
| minAmount | Expected amount of output asset minus slippage. |
| gasUsage | Expected gas usage of the call. |
| calls | Calls to execute (including the slippage check). |

## Router functions

### `findOpenStrategyPath`

Returns a path that converts the expected balances after account opening into a single output asset.

```solidity
function findOpenStrategyPath(
    address creditManager,
    Balance[] calldata balances,
    Balance[] calldata leftoverBalances,
    address target,
    address[] calldata connectors,
    uint256 slippage
) external override returns (Balance[] memory, RouterResult memory)
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| creditManager | Address of the Credit Manager the Credit Account will be opened in. |
| balances | The array of expected balances after all account opening calls. E.g., if one intends to add 1 WETH of collateral and borrow 5 WETH, then the expected balance for WETH will be 6, while other balances are 0. The `balances` array must have a balance struct for each collateral token in the Credit Manager, even if they will not be present on the Credit Account after opening. |
| leftoverBalances | The balances that should not be swapped into the output token. E.g., if there is 6 WETH on account after opening and its leftover balance is 5 WETH, only 1 WETH will be swapped to the output token. The `balances` array must have a balance struct for each collateral token in the Credit Manager. We also recommend to set all balances to 1 or more, for future gas savings. |
| target | The token to swap assets into. |
| connectors | Array of connector tokens for swaps. A connector token is a token that will be in the middle of multi-hop swaps. The recommended input is [USDC, WETH, USDT, FRAX].
| slippage | The maximal difference between the expected and actual amount of output token, in basis points. |

The Router will return an array of balances expected to be on the Credit Account after all operations, as well as `RouterResult`.

### `findBestClosePath`

Returns a path that converts all assets on the account into underlying. Can be used for Credit Account closures and liquidations.

```solidity
function findBestClosePath(
    address creditAccount,
    Balance[] calldata expectedBalances,
    Balance[] calldata leftoverBalances,
    address[] calldata connectors,
    uint256 slippage,
    PathOption[] memory pathOptions,
    uint256 loops,
    bool force
) external returns (RouterResult memory result, uint256 gasPriceTargetRAY);
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| creditAccount | Address of Credit Account to find the path for. |
| expectedBalances | The array of expected balances after all account opening calls. E.g., if one intends to add 1 WETH of collateral and borrow 5 WETH, then the expected balance for WETH will be 6, while other balances are 0. The `balances` array must have a balance struct for each collateral token in the Credit Manager, or be zero length (in this case, the current balances are computed and used by the Router itself). |
| leftoverBalances | The balances that should not be swapped into the underlying. E.g., if there is 6 WETH on account after opening and its leftover balance is 5 WETH, only 1 WETH will be swapped to the output token. The `balances` array must have a balance struct for each collateral token in the Credit Manager. We also recommend to set all balances to 1 or more, for future gas savings. |
| connectors | Array of connector tokens for swaps. A connector token is a token that will be in the middle of multi-hop swaps. The recommended input is [USDC, WETH, USDT, FRAX].
| slippage | The maximal difference between the expected and actual amount of output token, in basis points. |
| pathOptions | The array of objects used for path enumeration. See details below. |
| loops | Maximal number of pathfinding loops. Recommended to set this to `type(uint256).max` |
| force | Whether to force converting everything into underlying. If set to false, the Router will leave the asset as-is if it cannot find a path, instead of reverting. |

`pathOptions` is an array of `PathOption` objects:

```solidity
struct PathOption {
    address target;
    uint8 option;
    uint8 totalOptions;
}
```

These structs are defined for each pool that can have several underlying assets to withdraw (examples are Curve and Balancer). `target` is the pool's LP token, while `totalOptions` is the number of withdrawal paths (this is usually equal to the number of assets in the pool). E.g., for `3Crv` this would be:

```solidity
pathOptions[0] = PathOption({
    target: 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490,
    option: 0,
    totalOptions: 3
});

`option` must always be set to 0.
```

### `findOneTokenPath`

Returns a path that converts a given amount of one token to another token.

Note that the Router can swap any DEX-tradable token to another DEX-tradable token, and a DEX-tradable token to any farm. However, conversions between farms are generally not possible, unless the input token is in the direct deposit path of the output token (e.g., converting a Curve token to a corresponding Convex token).

```solidity
function findOneTokenPath(
    address tokenIn,
    uint256 amount,
    address tokenOut,
    address creditAccount,
    address[] calldata connectors,
    uint256 slippage
) external override returns (RouterResult memory);
```

| Parameter | Description |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | |
| tokenIn | The address of the input token. |
| amount | Amount of input tokens to swap. |
| tokenOut | The address of the output token. |
| creditAccount | The address of the Credit Account. |
| connectors | Array of connector tokens for swaps. A connector token is a token that will be in the middle of multi-hop swaps. The recommended input is [USDC, WETH, USDT, FRAX]. |
| slippage | The maximal difference between the expected and actual amount of output token, in basis points. |
