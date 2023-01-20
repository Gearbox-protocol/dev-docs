# Tutorial: limit orders

Here we present a step-by-step process of writing a permissionlessly executable bot that allows Gearbox users to submit limit sell orders.
The full code can be found in the [repository](https://github.com/Gearbox-protocol/dev-bots-tutorial), which may serve as a template for other bots.
We use Foundry to show how to test and deploy the contract.

## Problem statement

We need to implement a `LimitOrderBot` contract which should
* allow users to submit and cancel limit sell orders in arbitrary credit managers;
* allow users to specify the trigger price if they want to place a stop-limit order;
* allow arbitrary accounts to execute the order by providing order identifier and multicall;
* validate that provided multicall sells the correct amount of input token at a price equal to or better than the specified limit price;
* validate that provided multicall doesn't perform unintended actions like stealing tokens or manipulating the account's debt.

To make things simple, we'll only support full order execution and exact input swaps on Uniswap V3, Uniswap V2 and Sushiswap.

## Order submission

First of all, let's introduce a data structure for orders:

```solidity
struct Order {
    address borrower;
    address manager;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 limitPrice;
    uint256 triggerPrice;
    uint256 deadline;
}
```

* `tokenIn`, `tokenOut`, `amountIn`, `limitPrice` and `deadline` are standard fields of a limit sell order.

* `borrower` and `manager` identify the credit account.
Using account's address alone is unsafe because Gearbox credit accounts can be used by different users at different points in time, which may lead to old orders from the previous user being executed when the next user already controls the account.

* `triggerPrice` is used to indicate the stop-limit order.
If it's set, the limit order will only be executable if the oracle price is below the specified value.

Next, we need a storage variable holding all pending orders as well as functions allowing users to submit and cancel orders.

For storing, we can use a simple mapping from order ID to order struct.
Functions for submission and cancelation would then simply manipulate this mapping.
Well, if we want our bot to serve many users, we'd better make sure that user can't place/cancel an order for other user.
Some additional validation might be needed in practice: order size must be non-zero, input and output tokens must not be the same, etc.

The implementation might look like this:

```solidity
/// @notice Pending orders.
mapping(uint256 => Order) public orders;

/// @notice Submit new order.
/// @param order Order to submit.
/// @return orderId ID of created order.
function submitOrder(Order calldata order) external returns (uint256 orderId) {
    if (order.borrower != msg.sender)
        revert CallerNotBorrower();
    orderId = _useOrderId();
    orders[orderId] = order;
    emit OrderCreated(msg.sender, orderId);
}

/// @notice Cancel pending order.
/// @param orderId ID of order to cancel.
function cancelOrder(uint256 orderId) external {
    Order storage order = orders[orderId];
    if (order.borrower != msg.sender)
        revert CallerNotBorrower();
    delete orders[orderId];
    emit OrderCanceled(msg.sender, orderId);
}
```

The `_useOrderId` function increments an internal counter and returns its previous value.

## Order execution

Now, let's implement a function that would allow anyone to execute an order by providing multicall data and revert if any of our safety requirements is violated.
Here's how it might look like:

```solidity
/// @notice Execute given order using provided multicall.
/// @param orderId ID of order to execute.
/// @param calls Multicall needed to execute an order.
function executeOrder(uint256 orderId, MultiCall[] calldata calls) external {
    Order storage order = orders[orderId];

    (
        address creditAccount,
        uint256 balanceBefore,
        uint256 amountIn,
        uint256 minAmountOut
    ) = _validateOrder(order);

    address[] memory tokensSpent = _validateCalls(
        calls, order.manager, order.tokenIn, order.tokenOut
    );

    address facade = ICreditManagerV2(order.manager).creditFacade();
    ICreditFacade(facade).botMulticall(
        order.borrower,
        _addBalanceCheck(
            calls,
            facade,
            tokensSpent,
            order.tokenOut,
            minAmountOut
        )
    );

    _validateAmountSpent(
        order.tokenIn, creditAccount, balanceBefore, amountIn
    );

    delete orders[orderId];
    emit OrderExecuted(msg.sender, orderId);
}
```

Let's analyze what's going on here.

First, `_validateOrder` function is called to check if the given order can be executed:
* the order must not be expired, if deadline is set;
* the trigger condition must hold, if trigger price is set;
* the borrower must have an account in the manager, and this account must have a non-zero balance of the input token.

It also computes the correct amount of input token that must be spent in the multicall (smaller of the account's balance and order size) and the minimum amount of output token that should be received.

Next, `_validateCalls` function is called to check that each subcall targets one of the allowed methods of allowed adapters.
It also parses the calldata to find tokens spent in each call.

Next, `_addBalanceCheck` prepends a `revertIfReceivedLessThan` subcall to the multicall to ensure that (i) the amount of output token received is at least `minAmountOut` and (ii) the balance of any token spent in subcalls (except input) is at least that before the call.

Then goes the actual `botMulticall`, followed by `_validateAmountSpent` that checks whether the amount of input token spent in the multicall matches the correct one.

## Improvement ideas

This tutorial shows how to write a bot that interacts with Gearbox smart contracts and what typical safety considerations should be.
However, this bot is overly simplistic, and there are many directions for improvement, some of which are listed below.

* In this implementation, one might expect that users will always get filled very close to the limit price because of sandwiching, which is especially bad for those placing stop-limit orders, who need to choose between lower slippage and a higher probability of getting filled.
This can be addressed by making the minimum execution price decay from oracle price to the limit price with time.
* Gas costs of storing orders on-chain are very high, so it might make sense to use EIP-712 signed orders.
* Some tokens simply cannot be traded on Uniswap or Sushiswap or have little liquidity there, so supporting more integrations would be great.
* Adding incentives for bot executors is an important question not addressed in this tutorial.
