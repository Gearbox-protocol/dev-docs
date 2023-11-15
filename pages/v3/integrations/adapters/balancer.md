# Balancer adapter

Since all interaction with Balancer goes through the vault, there is only a single Vault adapter.

Note that the Balancer adapter restricts the set of pools that can be interacted with. Each poolID has one of 3 statuses:

1. `NOT_ALLOWED` - the pool cannot be interacted with.
2. `ALLOWED` - both swaps and liquidity provision are supported;
3. `SWAPS_ONLY` - only swaps are supported;

The current pool status can be retrieved by calling `IBalancerV2Adapter.poolStatus(poolId)`.

## State-changing functions

### `swap`

Performs a swap within a single pool through the Vault.

```solidity
function swap(SingleSwap memory singleSwap, FundManagement memory, uint256 limit, uint256 deadline)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter  | Description                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| singleSwap | A struct with swap parameters. See [Balancer documentation](https://docs.balancer.fi/reference/swaps/single-swap.html) for details. |
| limit      | The minimum amount of tokens to receive from the swap.                                                                              |
| deadline   | Deadline for the swap to successfully execute.                                                                                      |

`funds` parameter is ignored, because the adapter uses a single default `FundManagement` struct for all operations (as it does not use Balancer's internal balances, and sender/recipient is always the Credit Account).

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {SingleSwap, FundManagement} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IBalancerV2Vault.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...


SingleSwap memory singleSwap = SingleSwap({
    poolId: poolId,
    kind: kind,
    assetIn: IAsset(assetIn),
    assetOut: IAsset(assetOut),
    amount: amount,
    userData: ""
});

FundManagement memory funds;

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.swap, (singleSwap, funds, limit, deadline))
});

creditFacade.multicall(calls);
```

### `swapDiff`

Swaps the difference between the current balance of the asset and the specified `leftoverAmount`.

```solidity
function swapDiff(SingleSwapDiff memory singleSwapDiff, uint256 limitRateRAY, uint256 deadline)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| singleSwapDiff | A struct with swap parameters. Same as `SingleSwap`, but without `SwapKind` and with amount replaced by `leftoverAmount` |
| limitRateRAY   | The minimum exchange rate at which assets will be swapped.                                                               |
| deadline       | Deadline for the swap to successfully execute.                                                                           |

Usage:

```solidity
import {IBalancerV2Adapter, SingleSwapDiff} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...


SingleSwapDiff memory singleSwapDiff = SingleSwapDiff({
    poolId: poolId,
    assetIn: IAsset(assetIn),
    assetOut: IAsset(assetOut),
    leftoverAmount: leftoverAmount,
    userData: ""
});

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.swapDiff, (singleSwapDiff, limitRateRAY, deadline))
});

creditFacade.multicall(calls);
```

### `batchSwap`

Executes Balancer's `batchSwap` with the passed parameters. Only the `funds` parameters is changed. See [Balancer documentation](https://docs.balancer.fi/reference/swaps/batch-swaps.html) for details.

```solidity
function batchSwap(
    SwapKind kind,
    BatchSwapStep[] memory swaps,
    IAsset[] memory assets,
    FundManagement memory,
    int256[] memory limits,
    uint256 deadline
) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kind      | Type of a swap (`GIVEN_IN` or `GIVEN_OUT`)                                                                                                                                         |
| swaps     | Array of per-step swap parameters. See [Balancer documentation](https://docs.balancer.fi/reference/swaps/batch-swaps.html) for details.                                            |
| assets    | Array of assets that participate in the swap.                                                                                                                                      |
| limits    | Limits for tokens spent and received, corresponding to assets. Negative values denote tokens being received by the user, and positive values denote tokens being spent by the user |
| deadline  | Deadline for the swap to successfully execute.                                                                                                                                     |

Usage:

```solidity
import {IAsset} from "../../integrations/balancer/IAsset.sol";
import {
    IBalancerV2Vault,
    SwapKind,
    FundManagement,
    BatchSwapStep
} from "../../integrations/balancer/IBalancerV2Vault.sol";
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";

...

BatchSwapStep[] memory steps = new BatchSwapStep[](1);

steps[0] = BatchSwapStep({
    poolId: poolId,
    assetInIndex: 0,
    assetOutIndex: 1,
    amount: amount,
    userData: ""
});

IAsset[] memory assets = new IAsset[](2);
assets[0] = IAsset(tokenIn);
assets[1] = IAsset(tokenOut);

FundManagement memory funds;

int256[] memory limits = new int256[](2);

limits[0] = 0;
limits[1] = limit;

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.batchSwapStep, (kind, steps, assets, funds, limits, deadline))
});

creditFacade.multicall(calls);
```

### `joinPool`

Deposits assets to receive pool BPT in return.

```solidity
function joinPool(bytes32 poolId, address, address, JoinPoolRequest memory request)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| poolId    | ID of the pool to deposit into.                                                                                                                               |
| request   | Struct encoding data to perform a deposit. See [Balancer documentation](https://docs.balancer.fi/reference/joins-and-exits/pool-joins.html) for more details. |

`sender` and `recipient` are ignored, as they are automatically set to the Credit Account.

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {JoinPoolRequest} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IBalancerV2Vault.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

address[] memory assets = new address[](2);

assets[0] = asset0;
assets[1] = asset1;

uint256[] memory maxAmountsIn = new uint256[](2);

maxAmountsIn[0] = amount0;
maxAmountsIn[1] = amount1;

bytes memory userData = abi.encode(1, maxAmountsIn, minBPT);

JoinPoolRequest memory request = JoinPoolRequest({
    assets: assets,
    maxAmountsIn: maxAmountsIn,
    userData: userData,
    fromInternalBalance: false
});

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.joinPool, (poolId, address(0), address(0), request))
});

creditFacade.multicall(calls);
```

### `joinPoolSingleAsset`

Deposits a specified amount of a single asset into the pool for BPT.

```solidity
function joinPoolSingleAsset(bytes32 poolId, IAsset assetIn, uint256 amountIn, uint256 minAmountOut)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter    | Description                     |
| ------------ | ------------------------------- |
| poolId       | ID of the pool to deposit into. |
| assetIn      | Asset to deposit into the pool. |
| amountIn     | Amount of asset to deposit.     |
| minAmountOut | Minimal amount of BPT received  |

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.joinPoolSingleAsset, (poolId, IAsset(assetIn), amountIn, minAmountOut))
});

creditFacade.multicall(calls);
```

### `joinPoolSingleAssetDiff`

Deposits the difference between the current asset balance and `leftoverAmount` into the pool to receive BPT.

```solidity
function joinPoolSingleAssetDiff(bytes32 poolId, IAsset assetIn, uint256 leftoverAmount, uint256 minRateRAY)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                                      |
| -------------- | ------------------------------------------------ |
| poolId         | ID of the pool to deposit into.                  |
| assetIn        | Asset to deposit into the pool.                  |
| leftoverAmount | Amount of asset to keep on the account.          |
| minRateRAY     | Minimal resulting exchange rate of asset to BPT. |

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.joinPoolSingleAssetDiff, (poolId, IAsset(assetIn), leftoverAMount, minRateRAY))
});

creditFacade.multicall(calls);
```

### `exitPool`

Burns BPT to withdraw funds from a pool.

```solidity
function exitPool(bytes32 poolId, address, address payable, ExitPoolRequest memory request)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| poolId    | ID of the pool to withdraw from.                                                                                                                                 |
| request   | Struct encoding data to perform a withdrawal. See [Balancer documentation](https://docs.balancer.fi/reference/joins-and-exits/pool-exits.html) for more details. |

`sender` and `recipient` are ignored, as they are automatically set to the Credit Account.

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {ExitPoolRequest} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IBalancerV2Vault.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

address[] memory assets = new address[](2);

assets[0] = asset0;
assets[1] = asset1;

uint256[] memory minAmountsOut = new uint256[](2);

minAmountsOut[0] = minAmount0;
minAmountsOut[1] = minAmount1;

bytes memory userData = abi.encode(1, bptIn);

ExitPoolRequest memory request = ExitPoolRequest({
    assets: assets,
    minAmountsOut: minAmountsOut,
    userData: userData,
    toInternalBalance: false
});

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.exitPool, (poolId, address(0), address(0), request))
});

creditFacade.multicall(calls);
```

### `exitPoolSingleAsset`

Burns BPT to receive a single asset from the pool.

```solidity
function exitPoolSingleAsset(bytes32 poolId, IAsset assetOut, uint256 amountIn, uint256 minAmountOut)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter    | Description                       |
| ------------ | --------------------------------- |
| poolId       | ID of the pool to withdraw from.  |
| assetOut     | Asset to withdraw from the pool.  |
| amountIn     | Amount of BPT to burn.            |
| minAmountOut | Minimal amount of asset received. |

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.exitPoolSingleAsset, (poolId, IAsset(assetOut), amountIn, minAmountOut))
});

creditFacade.multicall(calls);
```

### `exitPoolSingleAssetDiff`

Burns the difference between the current balance of BPT and `leftoverAmount` to receive a single asset from the pool.

```solidity
function exitPoolSingleAssetDiff(bytes32 poolId, IAsset assetOut, uint256 leftoverAmount, uint256 minAmountOut)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                                            |
| -------------- | ------------------------------------------------------ |
| poolId         | ID of the pool to withdraw from.                       |
| assetOut       | Asset to withdraw from the pool.                       |
| leftoverAmount | Amount of BPT to keep on the account.                  |
| minRateRAY     | Minimal exchange rate between BPT and withdrawn asset. |

Usage:

```solidity
import {IBalancerV2Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/balancer/IBalancerV2Adapter.sol";
import {IAsset} from "@gearbox-protocol/integrations-v3/contracts/integrations/balancer/IAsset.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: balancerVaultAdapter,
    callData: abi.encodeCall(IBalancerV2Adapter.exitPoolSingleAssetDiff, (poolId, IAsset(assetOut), leftoverAmount, minRateRAY))
});

creditFacade.multicall(calls);
```
