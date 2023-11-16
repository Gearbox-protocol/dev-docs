# Debt management

## Increasing debt

To borrow additional funds from the pool, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Increases account's debt
/// @param amount Underlying amount to borrow
/// @dev Increasing debt is prohibited when closing an account
/// @dev Increasing debt is prohibited if it was previously updated in the same block
/// @dev The resulting debt amount must be within allowed range
/// @dev Increasing debt is prohibited if there are forbidden tokens enabled as collateral on the account
/// @dev After debt increase, total amount borrowed by the credit manager in the current block must not exceed
///      the limit defined in the facade
function increaseDebt(uint256 amount) external;
```

This will recompute debt parameters and transfer additional underlying from the pool to the Credit Account.

### Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.increaseDebt, (amount))
});

creditFacade.multicall(calls);
```

## Decreasing debt

To repay the Credit Account's debt, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Decreases account's debt
/// @param amount Underlying amount to repay, value above account's total debt indicates full repayment
/// @dev Decreasing debt is prohibited when opening an account
/// @dev Decreasing debt is prohibited if it was previously updated in the same block
/// @dev The resulting debt amount must be within allowed range or zero
/// @dev Full repayment brings account into a special mode that skips collateral checks and thus requires
///      an account to have no potential debt sources, e.g., all quotas must be disabled
function decreaseDebt(uint256 amount) external;
```

This will recompute debt parameters and send underlying to the pool. Note that the Credit Account must have at least the passed amount of underlying, otherwise the operation will fail.

### Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.decreaseDebt, (amount))
});

creditFacade.multicall(calls);
```

### Repaying the entire debt

Passing `type(uint256).max` as the `amount` parameter will repay the entire debt of the account. Note that debt goes over time due to accruing interest, so transferring an amount equal to total debt from some previous block may not be enough to cover the entire debt, and the operation will fail. It is recommended to account for this when repaying debt entirely (transferring the total debt amount from a recent block + a few bp extra should work in the overwhelming majority of cases).

### Order of debt repayment

In case the amount does not cover the entire debt, different parts of the debt are repaid in a fixed order:
1. Quota-related fees (currently, this is only quota increase fees);
2. Accrued quota interest;
3. Interest + interest fee (both are repaid at the same time; if the amount is not enough to cover both, then it is split pro-rata between them);
4. Principal.

This means that, depending on the amount, the main body of the debt may not decrease at all after repayment.

## Debt management restrictions

1. It is not possible to manage (i.e., either increase or decrease) debt more than once per block. 
2. The debt must be either 0, or within the `[minDebt;maxDebt]` interval. Note that only the principal must be within these boundaries (so it is technically possible to go above `maxDebt` due to interest).
3. Increasing debt is prohibited if there are any enabled forbidden tokens on an account.
4. It is not possible to decrease debt on opening an account, or increase debt on closing it.
5. It is not possible to decrease debt to zero when there are non-zero quotas on the Credit Account.


