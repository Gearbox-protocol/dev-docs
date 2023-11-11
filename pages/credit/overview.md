# Credit accounts

Composable leverage is based on Credit Accounts (DeFi primitive), which are isolated smart contracts that can execute trader's financial orders on third party protocols, but restrict direct access to to the funds to ensure solvency. Credit Accounts can function as a normal smart wallet (where all the funds on the account belong to the account owner) or a leveraged account (in which case, the funds are a combination of owner funds and pool funds).

All account management is performed through multicalls. All functions in the Credit Facade that touch the account in some way accept a `calls` parameter, which can be used to manage the account. For example, when opening an account, `calls` are applied immediately after opening, but before the collateral check. When closing or liquidating an account, `calls` are applied before the main closure/liquidation takes place.

In this section, you will learn:

- [Which contracts participate in the Credit Account lifecycle](/credit/architecture);
- [How to open a credit account](/credit/open);
- [How to close a credit account](/credit/closure);
- [How to liquidate a credit account](/credit/liquidation);
- [How to manage a credit account using multicalls](/credit/multicall/overview)
