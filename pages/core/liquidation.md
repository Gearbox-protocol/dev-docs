# Liquidations

When the Credit Account's health factor falls below 1 due to asset depreciation, the account becomes liquidatable. This means that any third party can forcibly spend some of the collateral on the Credit Account in order to fully repay its debt.

Before liquidation, the **total value** of enabled assets on the account is computed, which is:

$$
 TV = \sum_{i}{b_i * p_i}
$$

where $b_i$ is the collateral token's balance, and $p_i$ is its price according to the price feed.

This value is then split into three parts:
1. Amount to pool - amount to be repaid to the pool, including DAO fees (although these fees can be waived in some cases - see below);
2. Remaining funds - the minimal value of funds that belong to the user after the liquidation;
3. Liquidator premium - this is not tracked explicitly, but the protocol ensure that it is at most equal to `TV - amountToPool - remainingFunds`;

The liquidator can perform a multicall with any external calls, as well as adding/withdrawing collateral. Several conditions have to be fulfilled after the end of liquidation multicall:

1. There is sufficient underlying on the Credit Account to fully cover `amountToPool`;
2. The value of remaining assets on the account (value of non-underlying assets + underlying after paying the pool) must be not lower than `remainingFunds`;
3. Balances of the Credit Account's enabled collateral tokens must not increase;

In some cases, the total value (minus the liquidator's premium) is enough to cover the amount owed to LPs (i.e. `debt + interest + quota interest`) but not enough to also cover the entirety of protocol fees. In this case, the protocol only collects whatever it can (leftover after paying the pool and the liquidator).

If the liquidator wants to receive non-underlying assets as premium, they need to transfer these assets to themselves manually with a "withdraw collateral" call. Otherwise, the leftover underlying after repaying the debt and remaining funds is sent to the liquidator automatically.

## Liquidations due to expiration

In some cases, the DAO may enable "expiration mode" in the Credit Facade, which sets a cutoff date after which all accounts with positive debts can be liquidated. This can be done, e.g., to support fixed term lending. Liquidations due to expiration have a smaller liquidator premium (since they pose no threat of bad debt to the protocol). However, if an account becomes unhealthy after the expiration date, and is not yet liquidated, it is open for a normal liquidation with the usual premium.

