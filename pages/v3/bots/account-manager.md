# Tutorial: account manager

Here we present a step-by-step process of writing a private bot that allows Gearbox users to outsource account management to whitelisted accounts.
The full code can be found in the [repository](https://github.com/Gearbox-protocol/dev-bots-tutorial), which may serve as a template for other bots.

## Problem statement

Imagine the following scenario: a Gearbox user discovers a reputable asset management firm claiming that their fancy neural network-based trading strategy can achieve 40% yearly returns.
The user wants to try it; however, despite having some trust in the firm, he wants to cap the potential losses.
Let's see how Gearbox bots can help users to transfer control over accounts while feeling safe about their assets.

Formally, we need to implement an ownable `AccountManagerBot` contract that would:

- allow the owner to add and remove managers;
- allow users to register and configure their loss caps;
- allow managers to perform operations on registered users' accounts, subject to the loss constraints:
  - drop of account total value in underlying currency must not exceed the user-specified cap;
  - cumulative intra-operation drop of account total value must not exceed the user-specified cap (smaller than the previous one).

The first constraint simply means the manager can only manage until he loses too much.
The second one means that even if the manager turns out to be malicious and tries to drain funds, he won't be able to drain a lot (this cap can't be set to 0 since some loss is expected due to slippage and price impact).

## Permissions management

First, let's make the contract inherit `OpenZeppelin`'s `Ownable`.

Next, let's create a state variable for approved managers and allow the owner to add and remove them:

```solidity
/// @dev Approved managers.
mapping(address => bool) public managers;

/// @notice Add or remove manager.
/// @param manager Account to change the status for.
/// @param status New status.
function setManager(address manager, bool status) external onlyOwner {
    managers[manager] = status;
}
```

The `onlyManager` modifier will also be useful to restrict accounts that can execute operations on users' accounts to approved managers:

```solidity
/// @dev Reverts if caller is not one of approved managers.
modifier onlyManager() {
    if (!managers[msg.sender])
        revert CallerNotManager();
    _;
}
```

## Credit account configuration

Let's introduce a data structure and a state variable for holding users' data:

```solidity
/// @notice User data.
struct CreditAccountData {
    address owner;
    uint256 totalLossCap;
    uint256 intraOpLossCap;
    uint256 initialValue;
    uint256 intraOpLoss;
    uint256 intraOpGain;
}

/// @notice Registered users data (creditAccount => manager => data).
mapping(address => mapping(address => CreditAccountData)) public creditAccountData;
```

The `owner` field is needed in the structure, as we want to invalidate the record if the account's owner changes but it happens to be in the same Credit Manager.

Next, we need functions to allow users to set up their loss caps:

```solidity
/// @notice Register the Credit Account to set loss caps.
/// @param creditManager Credit manager.
/// @param creditAccount Credit Account.
/// @param totalLossCap Cap on drop of account total value
///        in credit manager's underlying currency. Can't be 0.
/// @param intraOpLossCap Cap on cumulative intra-operation drop of account total value
///        in credit manager's underlying currency. Can't be 0.
function register(address creditManager, address creditAccount, uint256 totalLossCap, uint256 intraOpLossCap)
    external
{
    if (ICreditManagerV3(creditManager).getBorrowerOrRevert(creditAccount) != msg.sender) {
        revert IncorrectAccountOwner();
    }

    delete creditAccountData[creditAccount][creditManager];
    CreditAccountData storage data = creditAccountData[creditAccount][creditManager];

    data.initialValue = _getAccountTotalValue(creditManager, creditAccount);

    if (totalLossCap == 0 || intraOpLossCap == 0) {
        revert ZeroLossCap();
    }
    data.totalLossCap = totalLossCap;
    data.intraOpLossCap = intraOpLossCap;
}
```

## Operations

Now, let's implement a function allowing bot managers to perform operations with users' accounts via multicalls.
There are a few safety properties we want this function to satisfy:

1. The function must revert if anyone except approved managers tries to execute an operation.

   - This can be ensured simply by adding the `onlyManager` modifier.

2. The function must revert if the manager tries to perform an operation on an account the user hasn't approved.
   For example, the user gives permissions to this bot in `BotList` and allows it to manage his WETH account.
   Then, we must ensure that the bot won't be able to perform operations on his other accounts, or that it can't perform operations on the same account if its owner is changed.

   - The `register` function ensures that the user can't have zero loss caps.
   - The only way to change caps to non-zero is by calling `register`. \* So, if we see zero caps in user data during operation, we know this is an unregistered account and must revert.
   - Whether the account has the same owner is checked by retrieving the owner from the Credit Manager and comparing to one in the struct.

3. The function must revert if loss caps are reached.

   - Let's start with the naive approach of checking both caps twice: before and after the multicall.
   - If we think about it, we can omit the first intra-operation loss check because there's no way it can be violated at this point: it was below the cap right after the last successful call and surely didn't change since then.
   - Moreover, the second intra-operation loss check should be made only if there was intra-operation value loss.
   - Everything is slightly less trivial with total value loss because it's possible that value loss surpassed the cap since the last successful call due to price movements.
     However, we can still remove the first check, and the only thing it changes is that bot managers are now allowed to "rescue" an account (e.g., by executing highly profitable arbitrage or simply adding collateral).

4. Finally, the function must not let managers change the account's debt because it can be used to manipulate the total value.
   - For that, it is enough to check if any `MultiCall` targets the `increaseDebt` or `decreaseDebt` of the Credit Facade corresponding to the given account and revert if it does.

Here's what the implementation might look like:

```solidity
/// @notice Perform operation on user's account.
/// @param creditAccount Credit account.
/// @param creditManager Credit manager.
/// @param calls Operation to execute.
function performOperation(address creditAccount, address creditManager, MultiCall[] calldata calls)
    external
    onlyManager
{
    CreditAccountData storage data = creditAccountData[creditAccount][creditManager];
    if (data.totalLossCap == 0) {
        revert UserNotRegistered();
    }
    if (ICreditManagerV3(creditManager).getBorrowerOrRevert(creditAccount) != data.owner) {
        revert IncorrectAccountOwner();
    }

    address facade = ICreditManagerV3(creditManager).creditFacade();
    _validateCallsDontChangeDebt(facade, calls);

    uint256 totalValueBefore = _getAccountTotalValue(creditManager, creditAccount);

    ICreditFacadeV3(facade).botMulticall(creditAccount, calls);

    uint256 totalValueAfter = _getAccountTotalValue(creditManager, creditAccount);

    bool isLoss = _updateIntraOpLossOrGain(totalValueBefore, totalValueAfter, data);
    if (isLoss && data.intraOpGain + data.intraOpLossCap < data.intraOpLoss) {
        revert IntraOpLossCapReached();
    }
    if (totalValueAfter + data.totalLossCap < data.initialValue) {
        revert TotalLossCapReached();
    }
}
```

## Improvement ideas

There are some things that require a closer look when putting such a bot in production:

- Users (and other bots) can still trade from their accounts and lose money, which makes determining manager's losses non-trivial;
- The bot shouldn't allow users to set unrealistic caps like a total loss of $1.
