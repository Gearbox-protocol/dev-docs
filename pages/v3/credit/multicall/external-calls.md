# Making external calls

Interacting with external protocols integrated with Gearbox is performed through encoding calls directly to Gearbox adapters in a multicall. 

For example:

```solidity
address yearnUsdcAdapter = creditManager.contractToAdapter(yvUSDC);

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = MultiCall({
    target: yearnUsdcAdapter,
    callData: abi.encodeCall(IYearnV2Adapter.depositDiff, (1))
});

creditFacade.multicall(calls);
```

This is a call to the yvUSDC vault adapter that instructs to deposit the entire USDC balance (minus 1) into the vault.

In practice, the execution flow for an adapter functions as follows:

1. The Credit Facade reaches a `MultiCall` struct during multicall execution that has another contract as a target;
2. The Credit Facade checks with the Credit Manager that the target is a valid adapter;
3. The Credit Facade calls the adapter with passed calldata;
4. The adapter builds the calldata that needs to be passed to an external contract, based on the function and passed parameters. Sometimes it can pass on received calldata without modifications (when the adapter function signature is exactly the same as the external contract itself), but in most cases it will be modified or even entirely new callData will be built.
5. The adapter requests the Credit Manager to approve tokens to the external contract, if required.
6. The adapter passes the newly built calldata to the Credit Manager.
7. The Credit Manager passes the target and the calldata to the Credit Account, which executes the call on its own behalf. This means that the Credit Account acts as the "user" from the standpoint of the external protocol.
8. The Credit Account receives the call result, and sends it to the Credit Manager, which then routes it back to the adapter.
9. The adapter requests the Credit Manager to reset allowances and returns two values to the CreditFacade: `tokensToEnable` and `tokensToDisable`. These are masks of tokens that need to be enabled and disabled on the account after the performed action (as a result of some tokens being spent and others being received).
10. CreditFacade updates the in-memory `enabledTokenMask`, which is saved in CreditManager during the collateral check at the end of the multicall.

The specifications for each adapter type and usage instructions can be found in the [corresponding section](../../integrations/overview).

## Adapter calls helpers

The `integrations-v3` repository has a special [helper library](https://github.com/Gearbox-protocol/integrations-v3/tree/main/contracts/test/multicall) for each adapter type that provides a more concise API for constructing multicalls.

Instead of building the `MultiCall` struct explicitly, the above example would import the multicaller library:

```solidity
import {YearnV2_Calls, YearnV2_Multicaller} from "@gearbox-protocol/integrations-v3/contracts/test/multicall/yearn/YearnV2_Calls.sol";
...

/// The library needs to be connected to the YearnV2_Multicaller interfaces
using YearnV2_Calls for YearnV2_Multicaller;
...


address yearnUsdcAdapter = creditManager.contractToAdapter(yvUSDC);

MultiCall[] memory calls = new MultiCall[](1);
calls[0] = YearnV2_Multicaller(yearnUsdcAdapter).depositDiff(1);

creditFacade.multicall(calls);
```