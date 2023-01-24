# Tutorial: account manager

Here we present a step-by-step process of writing a bot with permissioned execution that allows Gearbox users to outsource account management to whitelisted accounts.
The full code can be found in the [repository](https://github.com/Gearbox-protocol/dev-bots-tutorial), which may serve as a template for other bots.
We use Foundry to show how to test and deploy the contract.

## Problem statement

Imagine the following scenario: a Gearbox user discovers a reputable asset management firm claiming that their fancy neural network-based trading strategy can achieve 40% yearly returns.
The user wants to try it; however, despite having some trust in the firm, he wants to cap the potential losses.
Let's see how Gearbox bots can help users to transfer control over accounts while feeling safe about their assets.

Formally, we need to implement an ownable `AccountManagerBot` contract that would:
* allow the owner to add and remove managers;
* allow users to register and configure their loss caps;
* allow managers to perform operations on registered users' accounts, subject to the loss constraints:
    * drop of account total value in underlying currency must not exceed the user-specified cap;
    * cumulative intra-operation drop of account total value must not exceed the user-specified cap (smaller than the previous one).

The first constraint simply means the manager can only manage until he loses too much.
The second one means that even if the manager turns out to be malicious and finds a way to drain funds, he won't be able to drain a lot (this cap can't be set to 0 since some loss is expected due to slippage and price impact).

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

## User configuration

Let's introduce a data structure and a state variable for holding users' data:
```solidity
/// @notice User data.
struct UserData {
    uint256 totalLossCap;
    uint256 intraOpLossCap;
    uint256 initialValue;
    uint256 intraOpLoss;
    uint256 intraOpGain;
}

/// @notice Registered users data (user => manager => data).
mapping(address => mapping(address => UserData)) public userData;
```

Next, we need functions to allow users to transfer control over their accounts to the bot:
```solidity
/// @notice Allow bot to perform operations on account in given credit manager.
/// @param creditManager Credit manager.
/// @param totalLossCap Cap on drop of account total value
///        in credit manager's underlying currency. Can't be 0.
/// @param intraOpLossCap Cap on cumulative intra-operation drop of account total value
///        in credit manager's underlying currency. Can't be 0.
function register(
    address creditManager,
    uint256 totalLossCap,
    uint256 intraOpLossCap
) external {
    UserData storage data = userData[msg.sender][creditManager];

    address account = ICreditManagerV2(creditManager).getCreditAccountOrRevert(msg.sender);
    address facade = ICreditManagerV2(creditManager).creditFacade();

    (data.initialValue, ) = ICreditFacade(facade).calcTotalValue(account);

    if (totalLossCap == 0 || intraOpLossCap == 0)
        revert ZeroLossCap();
    data.totalLossCap = totalLossCap;
    data.intraOpLossCap = intraOpLossCap;
}

/// @notice Revoke bot's allowance to manage account in given credit manager.
/// @param creditManager Credit manager.
function deregister(address creditManager) external {
    delete userData[msg.sender][creditManager];
}
```

## Operations

Finally, let's implement a function that lets managers operate on users' accounts and performs all safety checks:
* it should revert if anyone except approved managers tries to execute operations;
* it should revert if any of the caps are reached before or after the multicall;
* it should revert if managers try to increase or decrease an account's debt because it can be used to manipulate the total value.

Here's what the implementation might look like:
```solidity
/// @notice Perform operation on user's account.
/// @param user User address.
/// @param creditManager Credit manager.
/// @param calls Operation to execute.
function performOperation(
    address user,
    address creditManager,
    MultiCall[] calldata calls
) external onlyManager {
    UserData storage data = userData[user][creditManager];
    if (data.totalLossCap == 0)
        revert UserNotRegistered();

    address account = ICreditManagerV2(creditManager).getCreditAccountOrRevert(user);
    address facade = ICreditManagerV2(creditManager).creditFacade();

    (uint256 totalValueBefore, ) = ICreditFacade(facade).calcTotalValue(account);
    _validateLosses(totalValueBefore, data);

    _validateCalls(facade, calls);
    ICreditFacade(facade).botMulticall(user, calls);

    (uint256 totalValueAfter, ) = ICreditFacade(facade).calcTotalValue(account);
    if (totalValueAfter < totalValueBefore) {
        uint256 intraOpLoss;
        unchecked {
            intraOpLoss = totalValueBefore - totalValueAfter;
        }
        data.intraOpLoss += intraOpLoss;
    } else {
        uint256 intraOpGain;
        unchecked {
            intraOpGain = totalValueAfter - totalValueBefore;
        }
        data.intraOpGain += intraOpGain;
    }
    _validateLosses(totalValueAfter, data);
}

/// @dev Checks that none of loss caps are reached.
function _validateLosses(uint256 totalValue, UserData memory data) internal pure {
    if (totalValue + data.totalLossCap < data.initialValue)
        revert TotalLossCapReached();
    if (data.intraOpGain + data.intraOpLossCap < data.intraOpLoss)
        revert IntraOpLossCapReached();
}

/// @dev Checks that calls don't try to change account's debt.
function _validateCalls(address facade, MultiCall[] calldata calls) internal pure {
    for (uint256 i = 0; i < calls.length; ) {
        MultiCall calldata mcall = calls[i];
        if (mcall.target == facade) {
            bytes4 method = bytes4(mcall.callData);
            if (
                method == ICreditFacade.increaseDebt.selector
                || method == ICreditFacade.decreaseDebt.selector
            )
                revert ChangeDebtForbidden();
        }
        unchecked {
            ++i;
        }
    }
}
```

## Improvement ideas

There are some things that require a closer look when putting such a bot in production:
* Users can still trade from their accounts and lose money, which makes determining manager's losses non-trivial;
* The bot shouldn't allow users to set unrealistic caps like a total loss of $1.
