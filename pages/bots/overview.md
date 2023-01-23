# Bots

## Overview

Gearbox V2.1 introduces the concept of bots, which are smart contracts that allow third parties to perform various operations with credit accounts on behalf of users.

Bots are very flexible in terms of their purpose, possible users and executors.
They can interact with credit accounts via `CreditFacade.botMulticall`, and there are no additional restrictions on performed operations on top of those imposed on basic [multicall](credit/multicall).
Gearbox only checks that bot is approved by the user in the `BotList` contract and that account's health factor after the call doesn't drop below 1.

All bots can be conceptually divided into two groups:
* _Permissionless_ that can be executed by anyone, e.g. MEV searchers, networks of keepers like Gelato, etc.
* _Permissioned_ that can only be executed by a limited set of accounts.

Typical use cases for permissionless bots are:
* limit orders;
* scheduled porfolio rebalancing;
* account derisking (converting to safer assets once health factor threshold is hit).

One typical use case for permissioned bots is outsourcing account management to some specialized party.

## Bots best practices

Since bots have almost no restrictions from Gearbox, it becomes the responsibility of bot developers to ensure the code is secure and assure users that their funds are safe.

Some good practices, which are especially important when writing permissionlessly executable bots:
1. The code must be (i) open-source, (ii) audited, (iii) non-upgradable, and (iv) verified on Etherscan.
2. There must be explicit checks ensuring that executors won't be able to drain accounts' funds up to the health factor of 1 by providing a tricky multicall.
3. The bot must be able to serve many users.

To get a better idea of how to write bots, we recommend checking our tutorials:
* [Limit orders](limit-orders), an example of permissionlessly executable bot.
* [Account manager](account-manager), an example of bot with permissioned execution.
