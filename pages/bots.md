## Gearbox Bots

Gearbox V2.1 introduces the concept of bots, which are smart contracts that allow third parties to perform various operations with credit accounts on behalf of users.

Bots are very flexible in terms of their purpose, possible users and executors.
They can interact with credit accounts via `CreditFacade.botMulticall`, and there are no additional restrictions on performed operations on top of those imposed on basic [multicall](credit/multicall).
Gearbox only checks that bot is approved by the user in the `BotList` contract and that account's health factor after the call doesn't drop below 1.

Potential use cases for Gearbox bots are:
* take profit and stop loss orders;
* automated portfolio rebalancing;
* outsourcing account management.

Bots can be executed privately (e.g., by a small group of authorized asset managers) or publicly (e.g., by MEV searchers or incentivized network of keepers like Gelato).

## Writing good public bots

Since bots are very flexible and have almost no restrictions from Gearbox, it becomes the responsibiliy of bot developers to ensure the code is secure and assure users that their funds are safe.

Some good practices for writing public bots:
1. The code must be (i) open-source, (ii) audited, (iii) non-upgradable, and (iv) verified on Etherscan.
2. The bot must be able to serve many users.
