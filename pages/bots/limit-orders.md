# Tutorial: limit orders

Here we present a step-by-step process of writing a public bot that allows Gearbox users to submit limit sell orders.
The full code can be found in the [repository](https://github.com/Gearbox-protocol/dev-bots-tutorial), which may serve as a template for other bots.

## Problem statement

We need to implement a `LimitOrderBot` contract which should

- allow users to submit and cancel limit sell orders in arbitrary credit managers;
- allow users to specify the trigger price if they want to place a stop-limit order;
- allow arbitrary accounts to execute the order by providing the order identifier;

To make things simple, we'll only support full order execution and always execute exactly at the limit price set by the user

## Order submission

First of all, let's introduce a data structure for orders:

```solidity
struct Order {
    address borrower;
    address manager;
    address creditAccount;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 limitPrice;
    uint256 triggerPrice;
    uint256 deadline;
}
```

- `tokenIn`, `tokenOut`, `amountIn`, `limitPrice` and `deadline` are standard fields of a limit sell order.

- `borrower`, `manager` and `creditAccount` identify the credit account.
  Using account's address alone is unsafe because Gearbox credit accounts can be used by different users at different points in time (and in different Credit Managers), which may lead to old orders from the previous user being executed when the next user already controls the account, or the same user controls the account in a different Credit Maanger.

- `triggerPrice` is used to indicate the stop-limit order.
  If it's set, the limit order will only be executable if the oracle price is below the specified value.

Next, we need a storage variable holding all pending orders as well as functions allowing users to submit and cancel orders.

For storing, we can use a simple mapping from order ID to order struct.
Functions for submission and cancelation would then simply manipulate this mapping.
Since we want our bot to serve many users, we need to make sure that a user can't place/cancel an order for other user.
Some additional validation might be needed in practice: order size must be non-zero, input and output tokens must not be the same, etc.

The implementation might look like this:

```solidity
/// @notice Pending orders.
mapping(uint256 => Order) public orders;

/// @notice Submit new order.
/// @param order Order to submit.
/// @return orderId ID of created order.
function submitOrder(Order calldata order) external returns (uint256 orderId) {
    if (
        order.borrower != msg.sender
            || ICreditManagerV3(order.manager).getBorrowerOrRevert(order.creditAccount) != order.borrower
    ) {
        revert CallerNotBorrower();
    }
    orderId = _useOrderId();
    orders[orderId] = order;
    emit OrderCreated(msg.sender, orderId);
}

/// @notice Cancel pending order.
/// @param orderId ID of order to cancel.
function cancelOrder(uint256 orderId) external {
    Order storage order = orders[orderId];
    if (order.borrower != msg.sender) {
        revert CallerNotBorrower();
    }
    delete orders[orderId];
    emit OrderCanceled(msg.sender, orderId);
}
```

The `_useOrderId` function increments an internal counter and returns its previous value.
Note that we should always check that the user submitting the order currently owns the account.

## Order execution

Now, we will implement a function that would allow anyone to execute an order by providing the order ID and approving a sufficient amount of output token to the bot:

```solidity
/// @notice Execute given order.
/// @param orderId ID of order to execute.
function executeOrder(uint256 orderId) external {
    Order storage order = orders[orderId];

    (uint256 amountIn, uint256 minAmountOut) = _validateOrder(order);

    IERC20(order.tokenOut).transferFrom(msg.sender, address(this), minAmountOut);
    IERC20(order.tokenOut).approve(order.manager, minAmountOut + 1);

    MultiCall[] memory calls = new MultiCall[](2);

    address facade = ICreditManagerV3(order.manager).creditFacade();

    calls[0] = MultiCall({
        target: facade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.addCollateral, (order.tokenOut, minAmountOut))
    });

    calls[1] = MultiCall({
        target: facade,
        callData: abi.encodeCall(ICreditFacadeV3Multicall.withdrawCollateral, (order.tokenIn, amountIn, msg.sender))
    });

    ICreditFacadeV3(facade).botMulticall(order.creditAccount, calls);

    delete orders[orderId];
    emit OrderExecuted(msg.sender, orderId);
}
```

Let's analyze what this function is doing:

First, the `_validateOrder` function is called to check if the given order can be executed:

- the order must not be expired, if deadline is set;
- the trigger condition must hold, if trigger price is set;
- the credit account must exist in the manager, and belong to the specified borrower. The account must have a non-zero balance of the input token.

It also computes the correct amount of input token that must be spent in the multicall. If the user does not have the entire `amountIn`, only their current balance will be swapped.

Then, the bot transfers the output token from the caller and approves the output amount to the Credit Manager (since Credit Manager will transfer from it during `addCollateral`). It then constructs a multicall that withdraws the input token and sends it to the caller, while adding the output token as collateral.

Then, `botMulticall` is called and the order is deleted.

## Improvement ideas

This tutorial shows how to write a bot that interacts with Gearbox smart contracts and what typical safety considerations should be.
However, this bot is overly simplistic, and there are many directions for improvement, some of which are listed below.

- In this implementation, orders can only be fully filled, which may not be convenient for the executors if the order is large.
- Gas costs of storing orders on-chain are very high (and the UX for the user is not ideal), so it might make sense to use EIP-712 signed orders.
- Adding incentives for bot executors is an important question not addressed in this tutorial.
- The implementation does not account for quotas. Since it doesn't set a quota for `tokenOut`, the collateral check will revert if `tokenOut` is a quoted token.
