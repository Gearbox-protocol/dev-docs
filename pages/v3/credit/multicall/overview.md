import { Tab, Tabs } from 'nextra-theme-docs'

# Multicall

Multicalls are a main way to manage a Credit Account in Gearbox V3. A multicall is a sequence of calls submitted to the Credit Facade, which it then parses and orchestrates the requested changes on the account.

The calls are passed as an array of `MultiCall` structs:

```solidity
struct MultiCall {
    address target;
    bytes callData;
}
```

The `target` field encodes the contract that will process the requested operation:

1. For internal operations, such as managing debt or adding/withdrawing collateral, this is the address of the Credit Facade itself;
2. For external operations, the target is the adapter connected to the protocol being interacted with.

`callData` encodes the function to be executed and its parameters. Note that for adapters this is a function that is directly present in the adapter ABI (i.e. any externally callable non-view function in the adapter can be called), while for the Credit Facade, `callData` encodes functions from a [special interface](https://github.com/Gearbox-protocol/core-v3/blob/ca43d1b9bf79a0c2a71ce4ad6fdcc562bb525ba4/contracts/interfaces/ICreditFacadeV3Multicall.sol#L44), which are not available externally and can only be accessed from within a multicall.

## Multicall-supporting functions

All functions in `CreditFacade` that touch the contracts in some way support multicalls. These include:

```solidity
function openCreditAccount(address onBehalfOf, MultiCall[] calldata calls, uint256 referralCode)
    external
    payable
    returns (address creditAccount);

function closeCreditAccount(address creditAccount, MultiCall[] calldata calls) external payable;

function liquidateCreditAccount(address creditAccount, address to, MultiCall[] calldata calls) external;

function multicall(address creditAccount, MultiCall[] calldata calls) external payable;

function botMulticall(address creditAccount, MultiCall[] calldata calls) external;
```

This allows users to do all their required account management in one call. As each multicall (except when closing/liquidating an account) is followed by a collateral check, this helps minimize the gas overhead by batching any required management actions under a single check.

## Multicall flow

All multicalls, regardless of the function, are performed as follows:

1. The Credit Facade receives the `calls` array;
2. The Credit Facade saves the balances of forbidden tokens on the Credit Account (if any);
3. The Credit Facade applies [on-demand price feed updates](./on-demand-pf). The Credit Facade always assumes that all price updates are at the beginning of the `calls` array.
4. The Credit Facade goes through `MultiCall` structs one-by-one and parses data depending on the target. If the target is the Credit Facade itself, it attempts to decode the `callData` selector and execute an internal function corresponding to that selector with passed parameters. If the target is a (valid) adapter, the Credit Facade just routes the call to it as-is;
5. After processing all structs, the Credit Facade calls `CreditManagerV3.fullCollateralCheck()` in order to verify account solvency, and checks that forbidden token balances were not increased, and no new forbidden tokens were enabled.

## Simple multicall usage example

Suppose we want to perform the following sequence of actions on opening an account:

1. Add 10000 USDC as collateral;
2. Borrow 40000 USDC from the pool;
3. Convert all USDC to WETH using UniswapV3;
4. Deposit all WETH into yvWETH (Yearn WETH vault);
5. Set a quota for yvWETH to count it towards account collateral (for simplicity, we will set a quota of 50000 USDC, which is guaranteed to cover all yvWETH);

For illustrative purposes, suppose also that yvWETH has an on-demand price oracle.

Suppose we have the following variables defined elsewhere:

```solidity
address accountOwner;

address creditManager;
address creditFacade;

address usdc;
address weth;
address yvWETH;

address uniswapV3Router;

bytes memort yvWETH_priceData;
```

Assume that the expected exchange rate between USDC and ywWETH is 2000 USDC/ywWETH.
The following is an example for constructing a multicall that implements this strategy and opening an account with it.

<Tabs items={["Solidity"]}>
<Tab>

```solidity

    MultiCall[] memory calls = new MultiCall[](8);

    // All on-demand price feed updates must always go first in the calls array
    calls[0] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.onDemandPriceUpdate, (yvWETH, false, ywWETH_priceData))
    });

    calls[1] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.addCollateral, (usdc, 10_000 * 10**6))
    });

    calls[2] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.increaseDebt, (40_000 * 10**6))
    });

    // Before the external calls, we need to set up a slippage check
    // The minimum output yvWETH amount is (50000 / 2000) * 0.995 = 24.875

    BalanceDelta[] memory deltas = new BalanceDelta[](1);
    deltas[0] = BalanceDelta({
        token: yvWETH,
        amount: (25 * 10**18) * 995 / 1000;
    })

    calls[3] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.storeExpectedBalances, (deltas))
    })

    // For external calls, we need to retrieve the adapter addresses, which are unique to each Credit Manager

    address uniswapV3Adapter = ICreditManagerV3(creditManager).contractToAdapter(uniswapV3Router);
    address yvWETHAdapter = ICreditManagerV3(creditManager).contractToAdapter(yvWETH);

    // This is a parameter struct passed into Uniswap's `exactInputSingle`. See
    // https://github.com/Uniswap/v3-periphery/blob/697c2474757ea89fec12a4e6db16a574fe259610/contracts/interfaces/ISwapRouter.sol#L10

    ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: usdc,
        tokenOut: weth,
        fee: 500,
        recipient: address(0), // For obvious reasons, the adapter overrides this parameter to the credit account address automatically
        deadline: block.timestamp + 3600,
        amountIn: 50_000 * 10**6,
        amountOutMinimum: 0 // We can omit the slippage check here, since we will use Gearbox's native slippage check
        sqrtPriceLimitX96: 0
    });

    calls[4] = MultiCall({
        target: uniswapV3Adapter,
        callData: abi.encodeCall(IUniswapV3Adapter.exactInputSingle, (params))
    });

    // This external call uses a function `depositDiff` unique to the YearnV2 adapter
    // See the `Adapters` section for more info

    calls[5] = MultiCall({
        target: yvWETHAdapter,
        callData: abi.encodeCall(IYearnV2Adapter.depositDiff, (1))
    });

    // After external calls, we perform a slippage check
    calls[6] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.compareBalances, ())
    });

    // Finally, we set a quota

    calls[7] = MultiCall({
        target: creditFacade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.updateQuota, (yvWETH, 50_000 * 10 ** 6, 50_000 * 10 ** 6))
    });

    // Since we are adding collateral from this account, we need to approve tokens
    // Note that the contract to give approval to is Credit Manager, not Credit Facade

    IERC20(usdc).approve(creditManager, 10_000 * 10 ** 6);

    ICreditFacadeV3(creditFacade).openCreditAccount(accountOwner, calls, 0);
```

</Tab>
</Tabs>

For details regarding any of the mentioned functions, see the following sections.
The specifications for Credit Facade multicall functions can be found [here](https://github.com/Gearbox-protocol/core-v3/blob/ca43d1b9bf79a0c2a71ce4ad6fdcc562bb525ba4/contracts/interfaces/ICreditFacadeV3Multicall.sol#L44).
