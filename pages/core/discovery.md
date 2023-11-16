# Contracts discovery 

## Core contracts
Each interaction with Gearbox starts from retrieving the addresses of important contracts. `AddressProviderV3` stores the addresses of all core contracts in mapping. To get contract, you should call `getAddressOrRevert(bytes32 key, uint256 _version)`, where `KEY` is symbolic key for desired contact, version - contract version (or 0, if contract doesn't support versioning).

[List of supported keys](https://github.com/Gearbox-protocol/core-v3/blob/main/contracts/interfaces/IAddressProviderV3.sol)

[List of all deployed contracts on mainnet](/docs/documentation/deployments/deployed-contracts)


## Getting list of pools & credit managers
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

## Versioning
Each contract in the protocol has a function `version` which returns the current version as a `uint256` value. Contract ABIs can change between versions, so it is recommended to get and verify the value before interacting with a particular contract.

Code snippet from CreditManager:
```solidity
// Contract version
uint256 public constant override version = 2;
```