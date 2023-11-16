# Adapters

## Overview

Adapters are smart contracts that allow Gearbox users to interact with other protocols.
For every credit manager and every _target contract_ we want accounts from this manager to be able to interact with (e.g., Uniswap router, Yearn vault, Convex booster, etc.), there must be an _adapter contract_ registered in the system.

Adapters are wrappers around target contracts, with similar interfaces, whose main task is to execute the call from the credit account to the target.
However, there are other things they perform under the hood:
* handle token approvals;
* enable or disable tokens as credit account's collateral;
* validate or change call parameters if it is needed to ensure safety of funds;
* in some cases, they might even tokenize the result of the operation as Gearbox only recognizes ERC-20 tokens as collateral.

In addition, most adapters extend the interface of the original contract, in order to improve the API and smoothen out some interactions. For example, for each function that is present in the original contract, a corresponding `*_diff` function is added that helps with multi-step operations with predictable outputs. There may be altogether new functions as well.

## Security paradigm

There is a number of common patterns used in all adapters for security purposes:
* non-view adapter functions can only be called as part of the multicall, to ensure that there is always a collateral check afterwards, regardless of adapter implementation specifics.
* adapters always revoke target contracts' allowances for the credit accounts' tokens after operations;
* adapters aim to minimize arbitrary code execution by disallowing interaction with arbitrary tokens or contracts. In practice, this means that adapters capable of working with multiple assets or pools (such as UniswapV3 router adapter) implement some kind of whitelist to restrict interactions.

## Using adapters

Let's consider a simple example: swapping USDC to WETH using Gearbox Uniswap V3 adapter.

First of all, install the required packages: `@gearbox-protocol/integrations-v3` and `@gearbox-protocol/core-v3` (can be installed via `yarn` or `npm`).

From these packages, import the relevant interfaces and libraries:
```solidity
// The credit manager is required to retrieve adapter addresses from target contract addresses, since
// they are unique for each Credit Manager
import {ICreditManagerV3} from "@gearbox-protocol/core-v3/contracts/interfaces/ICreditManagerV3.sol";

// Credit Facade is the contract being called by the account owner
import {ICreditFacadeV3} from "@gearbox-protocol/core-v3/contracts/interfaces/ICreditFacade.sol";

// The adapter interface is needed to encode calldata for the multicall
import {IUniswapV3Adapter} from "@gearbox-protocol/integrations-v3/contracts/interfaces/IUniswapV3Adapter.sol";

// This is a special convenience library for simplified construction of `MultiCall` structs
import {UniswapV3_Multicaller, UniswapV3_Calls} from "@gearbox-protocol/integrations-v3/contracts/test/multicall/uniswap/UniswapV3_Calls.sol";

using UniswapV3_Calls for UniswapV3_Multicaller;
```

The address of Uniswap V3 adapter for the given credit manager can be found like this:
```solidity
address uniswapV3Adapter = ICreditManagerV3(CREDIT_MANAGER).contractToAdapter(UNISWAP_V3_ROUTER);
```

Now, we need to prepare calldata for the multicall:
```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = UniswapV3_Multicaller(uniswapV3Adapter).exactDiffInputSingle(
    IUniswapV3Adapter.ExactDiffInputSingleParams({
        tokenIn: USDC,
        tokenOut: WETH,
        fee: 500,
        deadline: block.timestamp,
        leftoverAmount: 1,
        rateMinRAY: MIN_SWAP_RATE,
        0
    })
);
```

This is a new function in `IUniswapV3Adapter` that is not present in the original UniswapV3 router interface. It swaps the difference between the current USDC balance of the Credit Account and `leftoverAmount` (1 in this case) into WETH  through the 0.05% pool, reverting if the final exchange rate (in `RAY = 10**27`) is below `MIN_SWAP_RATE`. It would also enable WETH and disable USDC (since the remaining balance will be 1, which is considered zero balance by Gearbox) as collateral.

Finally, execute the multicall:
```solidity
ICreditFacadeV3(ICreditManagerV3(CREDIT_MANAGER).creditFacade()).multicall(calls);
```
