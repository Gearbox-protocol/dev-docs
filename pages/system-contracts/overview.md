## System-level contracts

System contracts provide functionality that are usually singletons and provide functionality necessary for the rest of the system to work. Note that they generally do not contain the _primary_ protocol logic (except the Price Oracle), but they are essentially prerequisites for the rest of the contracts in the system.

![](/images/core/system-contracts.jpg)

| Contract                            | Responsibility                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AddressProvider                     | Stores the addresses of other system-level contracts. This contract usually serves as an entry point when one wants to map all of the important addresses in the system.              |
| AccountFactory                      | Keeps stock of currently unused Credit Accounts, hands off Credit Accounts to the Credit Manager when a new account is opened, and retrieves the accounts back once they are closed.  |
| ACL                                 | Serves as a single source of ground truth regarding admin rights in the system. Other contracts retrieve the `configurator` address from them for their `configuratorOnly` functions. |
| ContractsRegister                   | A registry of pools and Credit Managers recognized by the system.                                                                                                                     |
| [DataCompressor](./data-compressor) | Outputs rich data on Credit Accounts and Credit Managers in a single call. Designed for off-chain use only.                                                                           |
| PriceOracle                         | Provides price data for collateral calculations in Credit Managers.                                                                                                                   |
| [Router](./router)                  | Computes calldata for complex multicalls.                                                                                                                                             |
| BotList                             | Stores permissions from Credit Accounts to bots.                                                                                                                                      |
| GearStaking                         | The contract where users stake GEAR in order to vote in designated voting contracts, such as Gauges.                                                                                  |

[Contracts Discovery](./discovery)
