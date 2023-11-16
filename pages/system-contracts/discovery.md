# Contracts discovery 

## System-level contracts
Each interaction with Gearbox starts from retrieving the addresses of important contracts. `AddressProviderV3` stores the addresses of all system-level contracts in a mapping. `getAddressOrRevert(bytes32 key, uint256 _version)` is used to retrieve addresses, where `key` is a symbolic key for the desired contact, `_version` - a version of the contract from the [`IVersion`](./discovery#versioning) interface (for V3 contracts, this is `3_00`).

The list of supported keys can be found [here](https://github.com/Gearbox-protocol/core-v3/blob/main/contracts/interfaces/IAddressProviderV3.sol).

[List of all deployed contracts on mainnet](/index).


## Retrieving pools and credit manager
`ContractsRegister` keeps a list of all active pools and Credit Managers:

```solidity
interface IContractsRegisterEvents {
    // emits each time when new pool was added to register
    event NewPoolAdded(address indexed pool);

    // emits each time when new credit Manager was added to register
    event NewCreditManagerAdded(address indexed creditManager);
}

/// @title Optimised for front-end Address Provider interface
interface IContractsRegister is IContractsRegisterEvents {
    //
    // POOLS
    //

    /// @dev Returns array of registered pool addresses
    function getPools() external view returns (address[] memory);

    /// @dev Returns pool address for i-element
    function pools(uint256 i) external returns (address);

    /// @return Returns quantity of registered pools
    function getPoolsCount() external view returns (uint256);

    /// @dev Returns true if address is pool
    function isPool(address) external view returns (bool);

    //
    // CREDIT MANAGERS
    //

    /// @dev Returns array of registered credit manager addresses
    function getCreditManagers() external view returns (address[] memory);

    /// @dev Returns pool address for i-element
    function creditManagers(uint256 i) external returns (address);

    /// @return Returns quantity of registered credit managers
    function getCreditManagersCount() external view returns (uint256);

    /// @dev Returns true if address is pool
    function isCreditManager(address) external view returns (bool);
}
```

Note that the `ContractsRegister` returns pools and CMs of all versions, including outdated ones. To filter out older contracts, make sure to check that `IVersion(contractAddress).version() >= 3_00`.

## Versioning
Each contract in the protocol implements an `IVersion` interface that has a `version` function. It returns the contract's version as a `uint256` value. Contract ABIs can change between versions, so it is recommended to get and verify the value before interacting with a particular contract.

Code snippet from CreditManager:
```solidity
// Contract version
uint256 public constant override version = 3_00;
```