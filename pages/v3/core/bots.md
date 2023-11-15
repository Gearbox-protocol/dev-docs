# Bots

Bots are a special feature of Gearbox V3 that allows account owners to permit third-party actors to manage their CA. These "third-party" actors do not need to be "bots" per-se - a bot can be a human-controlled smart-contract wallet, Gnosis Safe or another contract. That being said, the feature was primarily designed with automation in mind.

Bots are essentially able to perform multicalls on behalf of the account owner, using a special `botMulticall` function. The exact scope of actions available to a bot during a multicall is defined by the user - they can set granular permissions for each action. Permissions are set in Credit Facade (see [here](../bots/overview#permissions)).

The list of possible permissions is the following:

1. Adding collateral
2. Withdrawing collateral
3. Increasing debt
4. Decreasing debt
5. Enabling tokens
6. Disabling tokens
7. Updating quotas
8. Revoking allowances
9. Performing external calls

There are no checks performed after bot multicalls beyond the usual collateral check - if any other checks or restrictions are needed (such as maintaining a certain solvency level, preventing slippage, or white/blacklisting particular external protocols), they are expected to be implemented inside the bot contract itself.

## Special bot states

There are two special states for bots:

1. The Gearbox governance can mark a bot as forbidden, which will prevent it from performing any bot multicalls, even with permissions granted by a CA owner;
2. The Gearbox governance can also give a bot special permissions, which means that this bot will have those permissions for all Credit Accounts in a particular Credit Manager. Special permissions always override user-set permissions for that bot. This enables adding modular features (such as partial liquidations) without changing the core contracts of the protocol.
