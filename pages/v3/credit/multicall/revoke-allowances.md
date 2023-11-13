# Updating on-demand price feeds

To revoke allowances to some contract Gearbox interacts with, the following `ICreditFacadeV3Multicall` function must be encoded in a multicall:

```solidity
/// @notice Revokes account's allowances for specified spender/token pairs
/// @param revocations Array of spender/token pairs
/// @dev Exists primarily to allow users to revoke allowances on accounts from old account factory on mainnet
function revokeAdapterAllowances(RevocationPair[] calldata revocations) external;
```

## Usage

```solidity
MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: address(creditFacade),
    callData: abi.encodeCall(ICreditFacadeV3Multicall.revokeAdapterAllowances, (revocations))
});

creditFacade.multicall(calls);
```

## Removing allowances

All current Gearbox instances (including V3 and legacy V2.1) automatically reset token allowances to 1 after each interaction with an outside contract. However, this was not always the case, which means that there may be older Credit Accounts that were returned to the Account Factory with positive allowances to third-party protocol contracts.

This is not threatening, as long as the third-party contracts in question work as intended. However, if a user wants to make absolutely sure that their funds cannot be transferred from their CA by a (potentially) compromised third-party contract, they can reset allowances to 1 by hand.