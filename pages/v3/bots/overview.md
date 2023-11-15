# Bots

## Overview

Gearbox V3 introduces the concept of bots, which are smart contracts that allow third parties to perform various operations with credit accounts on behalf of users.

Bots are very flexible in terms of their purpose, possible users and executors.
They can interact with credit accounts via

```solidity
function botMulticall(address creditAccount, MultiCall[] calldata calls) external;
```

The bot multicall generally functions the same way as the normal owner-initiated `multicall`. However, some additional restrictions apply:

1. The bot can only execute actions that are explicitly [permitted](/v3/bots/overview#permissions) by the user (or the DAO, if the bot has special permissions);
2. The bot must not be forbidden by the DAO, otherwise it will not be able to call `botMulticall` for any account.

As with the normal `multicall`, a collateral check is performed at the end of the `botMulticall`, and all other multicall-related rules are the same.

## Permissions

Permissions are bit masks (encoded as `uint192`) where each bit determines whether the bot can execute a particular action on behalf of the user. The following is the list of all permissions:

```solidity
uint192 constant ADD_COLLATERAL_PERMISSION = 1;
uint192 constant INCREASE_DEBT_PERMISSION = 1 << 1;
uint192 constant DECREASE_DEBT_PERMISSION = 1 << 2;
uint192 constant ENABLE_TOKEN_PERMISSION = 1 << 3;
uint192 constant DISABLE_TOKEN_PERMISSION = 1 << 4;
uint192 constant WITHDRAW_COLLATERAL_PERMISSION = 1 << 5;
uint192 constant UPDATE_QUOTA_PERMISSION = 1 << 6;
uint192 constant REVOKE_ALLOWANCES_PERMISSION = 1 << 7;

uint192 constant EXTERNAL_CALLS_PERMISSION = 1 << 16;
```

I.e., the leftmost bit in the permissions mask determines whether the bot can add collateral (1 - it can, 0 - it can't), the 2nd leftmost determines whether it can increase debt, and so on.

To set permissions, the owner of the account would call the following `CreditFacadeV3` function:

```solidity
function setBotPermissions(address creditAccount, address bot, uint192 permissions) external;
```

| Parameter     | Description                                            |
| ------------- | ------------------------------------------------------ |
| creditAccount | Address of the Credit Account to give permissions for. |
| bot           | Address of the bot.                                    |
| permissions   | The bit mask of permissions.                           |

## Bot types and use cases

All bots can be conceptually divided into two groups:

- _Public_ bots can be executed by anyone, e.g. MEV searchers, networks of keepers like [Gelato](https://www.gelato.network/?utm_source=gearboxdocs), etc.
- _Private_ bots can only be executed by a limited set of accounts.

Typical use cases for public bots are:

- limit and RFQ order execution;
- scheduled porfolio rebalancing;
- account derisking (converting to safer assets once a health factor threshold is hit).

One typical use case for private bots is outsourcing account management to some specialized party.

## Bots best practices

Since bots have almost no restrictions on Gearbox side (except the general account solvency requirement), it becomes the responsibility of bot developers to ensure the code is secure and assure users that their funds are safe. Users should be dilligent when giving permissions to bots, as a malicious bot can wreak havoc on the account, if given permissions like `EXTERNAL_CALLS_PERMISSION` or `WITHDRAW_COLLATERAL_PERMISSION`.

Some good practices, which are especially important when writing public bots:

1. The code must be (i) open-source, (ii) audited, (iii) non-upgradable, and (iv) verified on Etherscan.
2. There must be explicit checks ensuring that executors won't be able to drain accounts' funds up to the health factor of 1, when they can execute arbitrary multicalls. Note that it is not strictly necessary for the bot to have a withdrawal permission to do this - they could use an external calls permission to sandwich a trade with the account's funds, for example.
3. The bot must be able to serve many users.

To get a better idea of how to write bots, we recommend checking our tutorials:

- [Limit orders](limit-orders), an example of permissionlessly executable bot.
- [Account manager](account-manager), an example of bot with permissioned execution.
