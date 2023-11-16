# Closing a credit account

The user may fully exit their position and return the Credit Account to the factory is they wish. Generally, this is not required, as they can simply decrease their debt to zero and keep the account as a smart contract wallet. But the option is there is the user chooses to do so.

In order to fully close the account, several conditions must be fulfilled:

1. Debt must be equal to 0;
2. All non-quoted tokens must be withdrawn or manually disabled;
3. Quotas for all quoted tokens must be set to 0 (and they also need to be withdrawn if the user wants to receive them);

The following Credit Facade function can be used to fully close an account and return it to the factory.

```solidity
function closeCreditAccount(
    address creditAccount,
    MultiCall[] calldata calls
) external payable;
```

| Parameter     | Description                                                                |
| ------------- | -------------------------------------------------------------------------- |
| creditAccount | Credit Account to close.                                                   |
| calls         | The array of `MultiCall` structs to be executed before closing the account |

## Typical closure flow

These are the actions that would typically be submitted to `calls` in order to close an account:

1. Acquire enough underlying on the Credit Account to repay the debt (if there's not enough already):
   - Use [external calls](multicall/external-calls) to convert the collateral assets into underlying in order to repay debt. It's up to the user whether to convert all assets or just enough to cover the debt.
   - Another option is to [add collateral](multicall/add-collateral) to transfer enough underlying to the Credit Account;
2. [Decrease debt](multicall/debt-management) to repay the loan;
3. [Withdraw collateral](multicall/withdraw-collateral) to return the leftover (desired) assets to the user;
4. [Update quotas](multicall/update-quota) to remove all non-zero quotas.

## Things to look out for

It is important to ensure that `withdrawCollateral` calls are passed for all assets that the user wishes to get back. Once an account was returned to factory, only the DAO can (but is not obligated to) recover assets left on it.
