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

In V3, adapters can only be called as part of the multicall, which runs full collateral check after all operations.
This has enhanced security compared to V2, which allowed credit account owners to call adapters directly as well.

## Using adapters
