# CompoundV2 adapter

CompoundV2 has one pool per each asset, so there is one adapter per cToken.

## State-changing functions

### `mint`

Deposits the specified amount of underlying to mint cTokens.

```solidity
function mint(uint256 amount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                      |
| --------- | -------------------------------- |
| amount    | Amount of underlying to deposit. |

Usage:

```solidity
import {ICompoundV2_CTokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/compound/ICompoundV2_CTokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: compoundAdapter,
    callData: abi.encodeCall(ICompoundV2_CTokenAdapter.mint, (amount))
});

creditFacade.multicall(calls);
```

### `mintDiff`

Deposits the difference between the current balance of underlying and `leftoverAmount`, to mint cTokens.

```solidity
function mintDiff(uint256 leftoverAmount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                                  |
| -------------- | -------------------------------------------- |
| leftoverAmount | Amount of underlying to keep on the account. |

Usage:

```solidity
import {ICompoundV2_CTokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/compound/ICompoundV2_CTokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: compoundAdapter,
    callData: abi.encodeCall(ICompoundV2_CTokenAdapter.mintDiff, (leftoverAmount))
});

creditFacade.multicall(calls);
```

### `redeem`

Burns a specified amount of cTokens to receive underlying.

```solidity
function redeem(uint256 amount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                |
| --------- | -------------------------- |
| amount    | Amount of cTokens to burn. |

Usage:

```solidity
import {ICompoundV2_CTokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/compound/ICompoundV2_CTokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: compoundAdapter,
    callData: abi.encodeCall(ICompoundV2_CTokenAdapter.redeem, (amount))
});

creditFacade.multicall(calls);
```

### `redeemDiff`

Burns the difference between the current balancer of cTokens and `leftoverAmount`, to receive underlying.

```solidity
function redeemDiff(uint256 leftoverAmount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter      | Description                               |
| -------------- | ----------------------------------------- |
| leftoverAmount | Amount of cTokens to keep on the account. |

Usage:

```solidity
import {ICompoundV2_CTokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/compound/ICompoundV2_CTokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: compoundAdapter,
    callData: abi.encodeCall(ICompoundV2_CTokenAdapter.redeemDiff, (leftoverAmount))
});

creditFacade.multicall(calls);
```

### `redeemUnderlying`

Burns cTokens to receive a specified amount of underlying.

```solidity
function redeemUnderlying(uint256 amount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
```

| Parameter | Description                    |
| --------- | ------------------------------ |
| amount    | Amount of underlying received. |

Usage:

```solidity
import {ICompoundV2_CTokenAdapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/compound/ICompoundV2_CTokenAdapter.sol";

...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: compoundAdapter,
    callData: abi.encodeCall(ICompoundV2_CTokenAdapter.redeemUnderlying, (amount))
});

creditFacade.multicall(calls);
```

## Compound Multicaller library

The CompoundV2 adapter has a corresponding library that simplifies the MultiCall building API.

Usage example:

```solidity
import {CompoundV2_Multicaller, CompoundV2_Calls} from "@gearbox-protocol/integrations-v3/test/multicall/compound/CompoundV2_Calls.sol";
...

using CompoundV2_Calls for CompoundV2_Multicaller;
...

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = CompoundV2_Multicaller(compoundAdapter).mint(amount);

creditFacade.multicall(calls);
```
