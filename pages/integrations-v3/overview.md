# Adapters

## Overview

Adapters are smart contracts that allow Gearbox users to interact with other protocols.
For every credit manager and every _target contract_ we want accounts from this manager to be able to interact with (e.g., Uniswap router, Yearn vault, Convex booster, etc.), there must be an _adapter contract_ registered in the system.

Adapters are wrappers around target contracts, with similar interfaces, whose main task is to execute the call from the credit account to the target.
However, there are other things they perform under the hood:
* handle token approvals;
* enable or disable tokens as credit account's collateral;
* validate or change call parameters if it is needed to ensure funds safety;
* in some cases, they might even tokenize the result of the operation as Gearbox only recognizes ERC-20 tokens as collateral.

## New security paradigm

Third version of adapters comes with a series of security enhancements compared to its predecessor:
* adapters can now only be called as part of the multicall, which runs the full collateral check after all operations (previously, adapters were allowed to be called directly, which would trigger an inherently less secure fast collateral check);
* adapters now always revoke target contracts' allowances for the credit accounts' tokens after operations;
* adapters aim to minimize arbitrary code execution by disallowing interaction with arbitrary tokens or contracts.

Note that the new adapters are compatible with old credit managers and pools, so, although they come under the name V3, they can already be used starting from the V2.1 release.

## Using adapters

Let's consider a simple example: swapping USDC to WETH using Gearbox Uniswap V3 adapter.

First of all, install the required packages: `@gearbox-protocol/integrations-v3` and `@gearbox-protocol/core-v3` (can be installed via `forge` or `npm`).

From these packages, import the relevant interfaces and libraries:
```solidity
import {ICreditManager} from "@gearbox-protocol/core-v3/contracts/interfaces/ICreditManager.sol";
import {ICreditFacade} from "@gearbox-protocol/core-v3/contracts/interfaces/ICreditFacade.sol";

import {IUniswapV3Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/IUniswapV3Adapter.sol";
import {UniswapV3_Multicaller, UniswapV3_Calls} from "@gearbox-protocol/integrations-v3/contracts/multicall/UniswapV3.sol";

using UniswapV3_Calls for UniswapV3_Multicaller;
```

The address of Uniswap V3 adapter for the given credit manager can be found like this:
```solidity
address uniswapV3Adapter = ICreditManager(CREDIT_MANAGER).contractToAdapter(UNISWAP_V3_ROUTER);
```

Now, we need to prepare calldata for the multicall:
```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = UniswapV3_Multicaller(uniswapV3Adapter).exactAllInputSingle(
    IUniswapV3Adapter.ExactAllInputSingleParams({
        tokenIn: USDC,
        tokenOut: WETH,
        fee: 500,
        deadline: block.timestamp,
        rateMinRAY: MIN_SWAP_RATE,
        0
    })
);
```

This call would try to swap all CA's balance of USDC to WETH through 0.05% pool, and revert if exchange rate is worse than `MIN_SWAP_RATE`.
It would also enable WETH and disable USDC as CA's collateral tokens.

Finally, execute the multicall:
```solidity
ICreditFacade(ICreditManager(CREDIT_MANAGER).creditFacade()).multicall(calls);
```

**NOTE**: for V2.1, install `@gearbox-protocol/integrations-v3@v2.1` and `@gearbox-protocol/core-v2`, and replace `core-v3` imports with `core-v2`.
