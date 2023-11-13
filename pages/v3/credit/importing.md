# Importing contracts and interfaces

There are 3 different GearboxV3 repositories that can be useful to integrators.

## Core contracts

[`core-v3`](https://github.com/Gearbox-protocol/core-v3) is a repository that holds important system contracts (such as `AccountFactory`, `BotListV3`, etc.), pool contracts (`PoolV3`, `PoolQuotaKeeperV3`, `GaugeV3`), and, most importantly. credit contracts such as `CreditManagerV3`, `CreditFacadeV3` and `CreditAccountV3`.

One of the most important interfaces in this repository is [`ICreditFacadeV3Multicall`](https://github.com/Gearbox-protocol/core-v3/blob/main/contracts/interfaces/ICreditFacadeV3Multicall.sol). It holds the function signatures that need to be encoded in Credit Facade [multicalls](/credit/multicall/overview) to manage the account.

The `core-v3` package that contains all contracts and interfaces can be installed using `npm` or `yarn`:

1. `npm install @gearbox-protocol/core-v3`;
2. `yarn add @gearbox-protocol/core-v3`;

## Integrations contracts

[`integrations-v3`](https://github.com/Gearbox-protocol/integrations-v3) contains GearboxV3 adapters to external protocols and various pool zappers. Adapter [contracts](https://github.com/Gearbox-protocol/integrations-v3/contracts/adapters) and [interfaces](https://github.com/Gearbox-protocol/integrations-v3/contracts/interfaces) are the most important, since they are used to [encode external operations](/credit/multicall/external-calls) in a multicall.

The `integrations-v3` package that contains all contracts and interfaces can be installed using `npm` or `yarn`:

1. `npm install @gearbox-protocol/integrations-v3`;
2. `yarn add @gearbox-protocol/integrations-v3`;

## Periphery contracts

[`periphery-v3`](https://github.com/Gearbox-protocol/periphery-v3) contains various helper contracts for data collections. The particularly useful one is [`DataCompressor_3_0`](https://github.com/Gearbox-protocol/periphery-v3/blob/main/contracts/data/DataCompressor_3_0.sol), which can be used to retrieve data on all Credit Accounts and Credit Managers with a small number of static calls.

`periphery-v3` can be installed using `npm` or `yarn`:

1. `npm install @gearbox-protocol/periphery-v3`;
2. `yarn add @gearbox-protocol/periphery-v3`;
