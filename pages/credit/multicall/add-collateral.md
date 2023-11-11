# Adding collateral

To transfer additional collateral from the caller (bot or account owner) to the account, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Adds collateral to account
/// @param token Token to add
/// @param amount Amount to add
/// @dev Requires token approval from caller to the credit manager
/// @dev This method can also be called during liquidation
function addCollateral(address token, uint256 amount) external;
```

On execution, this will do two things:
1. Transfer the required token amount from the caller to the credit account (note that the contract initiating the transfer is **the Credit Manager** and not the Credit Facade);
2. Enables the token as collateral if previously disabled (note that quoted tokens are not automatically enabled - a quota has to be set for them explicitly);

## Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.addCollateral, (token, amount))
});

IERC20(token).approve(creditManager, amount);

creditFacade.multicall(calls);
```

## Adding collateral with permit

On executing `addCollateral`, the Credit Manager calls `IERC20.transferFrom` from the caller to the Credit Account. This means that calling `addCollateral` requires a pre-existing approval from the caller to the Credit Manager.

To avoid making an extra approval call (for EIP-2612-compatible tokens), there is an alternative function that accepts usual `permit` parameters:

```solidity
/// @notice Adds collateral to account using signed EIP-2612 permit message
/// @param token Token to add
/// @param amount Amount to add
/// @param deadline Permit deadline
/// @dev `v`, `r`, `s` must be a valid signature of the permit message from caller to the credit manager
/// @dev This method can also be called during liquidation
function addCollateralWithPermit(address token, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
    external;
```

Usage example:

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: creditFacade,
    callData: abi.encodeCall(ICreditFacadeV3Multicall.addCollateralWithPermit, (token, amount, deadline, v, r, s))
});

creditFacade.multicall(calls);
```

## On direct token transfers

While it's technically possible to send tokens directly to a Credit Account, it is not advised, as they will not be automatically enabled, so a multicall will be required anyway to have them included into collateral computations.

It is strongly advised not to transfer tokens that are not recognized as valid collateral to a Credit Account, as currently only Gearbox governance would be able to recover them. To check whether a token is valid collateral, `CreditManagerV3.getTokenMaskOrRevert(token)` can be used.







