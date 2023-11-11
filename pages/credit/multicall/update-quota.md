# Updating quotas

To change quota amounts, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Updates account's quota for a token
/// @param token Token to update the quota for
/// @param quotaChange Desired quota change in underlying token units (`type(int96).min` to disable quota)
/// @param minQuota Minimum resulting account's quota for token required not to revert
/// @dev Enables token as collateral if quota is increased from zero, disables if decreased to zero
/// @dev Quota increase is prohibited if there are forbidden tokens enabled as collateral on the account
/// @dev Quota update is prohibited if account has zero debt
/// @dev Resulting account's quota for token must not exceed the limit defined in the facade
function updateQuota(address token, int96 quotaChange, uint96 minQuota) external;
```

## Usage 

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.updateQuota, (token, quotaChange, minQuota))
});

creditFacade.multicall(calls);
```

## Quota amounts and limits

Each quota collateral asset has a limit on total quotas that is set per pool. The total sum of all quotas for that asset (on CAs connected to that pool) cannot exceed the limit. This means that when increase the quota would put the total sum over the limit, only the capacity that is left will be given to the Credit Account (i.e., `actual change = min(requested change, limit - total quotas sum)`). In order to prevent the user receiving a smaller quota when they need a particular amount, they can pass `minQuota` to ensure that the actual increase is not less than that value. 

If the total sum is at or above (this is possible when the limit is decreased by the governance) the limit, no increases are possible. However, it is always possible to decrease a quota.

There is also an implicit `maxQuota` amount for a Credit Account which is equal to `8 * maxDebt` per asset. 

## Disabling quotas entirely

Passing `type(int96).min` as `amount` will set the quota to zero.

## Quotas on zero-debt accounts

It is not possible to have non-zero quotas on a zero debt account (as otherwise total debt between 0 and `minDebt`) is possible, which is undesirable. This means that decreasing debt to 0 while there are still active quotas will fail - so all quota decrease calls must be performed **before** the debt decrease in a multicall. Consequently, it is also not possible to update quotas when the CA has zero debt.