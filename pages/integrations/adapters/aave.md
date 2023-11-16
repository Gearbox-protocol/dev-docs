# Aave adapters

There are two adapters related to Aave: the AaveV2 lending pool adapter and wrapped Aave token adapter.

## Lending pool adapter

The lending pool adapter allows Credit Accounts to deposit underlyings into Aave V2 to receive aTokens, and vice versa. The lending pool is a single contract that processes deposits and withdrawals in multiple assets, and, consequently, there is only one adapter.

### State-changing functions

#### `deposit`

Deposits the specified amount of `asset` to receive the corresponding aToken.

```solidity
function deposit(address asset, uint256 amount, address, uint16)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                             |
| --------- | --------------------------------------- |
| asset     | Address of underlying token to deposit. |
| amount    | Amount of asset to deposit.             |

Parameter `onBehalfOf` is ignored, as it is always set to the Credit Account. `referralCode` is always set to 0.

Usage:

```solidity
import {IAaveV2_LendingPoolAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_LendingPoolAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveLendingPoolAdapter,
    callData: abi.encodeCall(IAaveV2_LendingPoolAdapter.deposit, (asset, amount, address(0), 0))
});

creditFacade.multicall(calls);
```

#### `depositDiff`

Deposits the difference between the current balance and `leftoverAmount` to receive the corresponding aToken. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function depositDiff(address asset, uint256 leftoverAmount)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                             |
| -------------- | --------------------------------------- |
| asset          | Address of underlying token to deposit. |
| leftoverAmount | Amount of asset to keep on the account. |

Usage:

```solidity
import {IAaveV2_LendingPoolAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_LendingPoolAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveLendingPoolAdapter,
    callData: abi.encodeCall(IAaveV2_LendingPoolAdapter.depositDiff, (asset, leftoverAmount))
});

creditFacade.multicall(calls);
```

#### `withdraw`

Burns the specified amount of the corresponding aToken to withdraw `asset`.

```solidity
function withdraw(address asset, uint256 amount, address)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                        |
| --------- | ---------------------------------- |
| asset     | Address of underlying to withdraw. |
| amount    | Amount of aTokens to burn.         |

`recipient` is ignored, since it's always set to the Credit Account.

Usage:

```solidity
import {IAaveV2_LendingPoolAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_LendingPoolAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveLendingPoolAdapter,
    callData: abi.encodeCall(IAaveV2_LendingPoolAdapter.withdraw, (asset, amount, address(0)))
});

creditFacade.multicall(calls);
```

#### `withdrawDiff`

Burns the difference between the current balance of the corresponding aToken and `leftoverAmount`, to withdraw `asset`. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function withdrawDiff(address asset, uint256 leftoverAmount)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                              |
| -------------- | ---------------------------------------- |
| asset          | Address of underlying to withdraw.       |
| leftoverAmount | Amount of aToken to keep on the account. |

Usage:

```solidity
import {IAaveV2_LendingPoolAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_LendingPoolAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveLendingPoolAdapter,
    callData: abi.encodeCall(IAaveV2_LendingPoolAdapter.withdrawDiff, (asset, leftoverAmount))
});

creditFacade.multicall(calls);
```

## Wrapped Aave token adapter

Since Gearbox V3 pools do not support rebasing tokens, aTokens need to be wrapped first, in order to serve as the pool's underlying. For that purpose, Gearbox V3 deploys its own [custom wrapper tokens]() and provides an adapter for them, in order to unwrap waTokens into aToken/underlying and use them with other DeFi protocols. There is one waToken per aToken, and one adapter per waToken.

### State-changing functions

#### `deposit`

Deposits a specified amount of aToken to receive wrapped aToken.

```solidity
function deposit(uint256 assets)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                  |
| --------- | ---------------------------- |
| assets    | Amount of aToken to deposit. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.deposit, (assets))
});

creditFacade.multicall(calls);
```

#### `depositDiff`

Deposits the difference between the current balance of aToken and `leftoverAssets`, to receive wrapped aTokens. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function depositDiff(uint256 leftoverAssets)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                              |
| -------------- | ---------------------------------------- |
| leftoverAssets | Amount of aToken to keep on the account. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.depositDiff, (leftoverAssets))
});

creditFacade.multicall(calls);
```

#### `depositUnderlying`

Deposits a specified amount of underlying to receive wrapped aToken.

```solidity
function depositUnderlying(uint256 assets)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                      |
| --------- | -------------------------------- |
| assets    | Amount of underlying to deposit. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.depositUnderlying, (assets))
});

creditFacade.multicall(calls);
```

#### `depositDiffUnderlying`

Deposits the difference between the current balance of underlying and `leftoverAssets`, to receive wrapped aTokens. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function depositDiffUnderlying(uint256 leftoverAssets)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                                  |
| -------------- | -------------------------------------------- |
| leftoverAssets | Amount of underlying to keep on the account. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.depositDiffUnderlying, (leftoverAssets))
});

creditFacade.multicall(calls);
```

#### `withdraw`

Burns a specified amount of waToken to receive aToken.

```solidity
function withdraw(uint256 shares)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                |
| --------- | -------------------------- |
| shares    | Amount of waToken to burn. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.withdraw, (shares))
});

creditFacade.multicall(calls);
```

#### `withdrawDiff`

Burns the difference between the current balance of waToken and `leftoverShares`, to receive aToken. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function withdrawDiff(uint256 leftoverShares)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                |
| -------------- | -------------------------- |
| leftoverShares | Amount of waToken to burn. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.withdrawDiff, (leftoverShares))
});

creditFacade.multicall(calls);
```

#### `withdrawUnderlying`

Burns a specified amount of waToken to receive the underlying.

```solidity
function withdrawUnderlying(uint256 shares)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                |
| --------- | -------------------------- |
| shares    | Amount of waToken to burn. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.withdrawUnderlying, (shares))
});

creditFacade.multicall(calls);
```

#### `withdrawDiffUnderlying`

Burns the difference between the current balance of waToken and `leftoverShares`, to receive underlying. If the balance is less than `leftoverAmount`, does nothing.

```solidity
function withdrawDiffUnderlying(uint256 leftoverShares)
    external
    returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                |
| -------------- | -------------------------- |
| leftoverShares | Amount of waToken to burn. |

Usage:

```solidity
import {IAaveV2_WrappedATokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/aave/IAaveV2_WrappedATokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: aaveWrappedTokenAdapter,
    callData: abi.encodeCall(IAaveV2_WrappedATokenAdapter.withdrawDiffUnderlying, (leftoverShares))
});

creditFacade.multicall(calls);
```

## AaveV2 Multicaller libraries

AaveV2 adapters have a corresponding library that simplifies the MultiCall building API.

Usage example for the lending pool adapter:

```solidity
import {AaveV2_LendingPoolMulticaller, AaveV2_LendingPoolCalls} from "@gearbox-protocol/integrations-v3/test/multicall/aave/AaveV2_LendingPoolCalls.sol";
...

using AaveV2_LendingPoolCalls for AaveV2_LendingPoolMulticaller;
...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = AaveV2_LendingPoolMulticaller(aaveLendingPoolAdapter).withdrawDiff(asset, leftoverAmount);

creditFacade.multicall(calls);
```

Usage example for the waToken adapter:

```solidity
import {AaveV2_WrappedATokenMulticaller, AaveV2_WrappedATokenCalls} from "@gearbox-protocol/integrations-v3/test/multicall/aave/AaveV2_WrappedATokenCalls.sol";
...

using AaveV2_WrappedATokenCalls for AaveV2_WrappedATokenMulticaller;
...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = AaveV2_WrappedATokenMulticaller(aaveWrappedTokenAdapter).deposit(assets);

creditFacade.multicall(calls);
```
