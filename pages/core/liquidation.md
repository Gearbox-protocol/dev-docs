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
3. Liquidator premium - this is not tracked explicitly, but the protocol ensures that it is at most equal to `TV - amountToPool - remainingFunds`;

The liquidator can perform a multicall with any external calls, as well as adding/withdrawing collateral. Several conditions have to be fulfilled after the end of liquidation multicall:

1. There is sufficient underlying on the Credit Account to fully cover `amountToPool`;
2. The value of remaining assets on the account (value of non-underlying assets + underlying after paying the pool) must not be lower than `remainingFunds`;
3. Balances of the Credit Account's active collateral tokens must not increase;

In some cases, the total value (minus the liquidator's premium) is enough to cover the amount owed to LPs (i.e. `debt + interest + quota interest`) but not enough to also cover the entirety of protocol fees. In this case, the protocol only collects whatever it can (leftover after paying the pool and the liquidator).

In cases where the total value (minus the liquidator's premium) is not enough to cover the debt to LPs, the contracts record a loss. This will have two effects: first, the pool will try to cover the loss from the insurance fund, or, if that is insufficient, will reduce the share price; second, borrowing in that Credit Manager will be stopped until the Gearbox governance explicitly re-enables it. In cases of large loss over short periods of time, the contracts will be paused entirely.

If the liquidator wants to receive non-underlying assets as premium, they need to transfer these assets to themselves manually with a "withdraw collateral" call. Otherwise, the leftover underlying after repaying the debt and remaining funds is sent to the liquidator automatically.

## Liquidations due to expiration

In some cases, the DAO may enable "expiration mode" in the Credit Facade, which sets a cutoff date after which all accounts with positive debts can be liquidated. This can be done, e.g., to support fixed term lending. Liquidations due to expiration have a smaller liquidator premium (since they pose no threat of bad debt to the protocol). However, if an account becomes unhealthy after the expiration date, and is not yet liquidated, it is open for a normal liquidation with the usual premium.

## Partial Liquidations

In addition to full liquidations, Gearbox V3 supports partial liquidations. Partial liquidations allow a liquidator to repay only a portion of a Credit Account's debt in exchange for receiving a single specified collateral token.

During a partial liquidation, the Credit Facade computes the amount of collateral to be seized. The underlying is then transferred from the liquidator, while the collateral is sent to the address specified by the liquidator. All supplied underlying is used to repay debt, and a collateral check is performed. 

Partial liquidations use the same liquidation discount and fee rates as full liquidations. For accounts that are unhealthy (health factor < 1), the normal liquidation parameters apply. For expired accounts, the special expired liquidation parameters are used, which typically have a lower discount.

Partial liquidations do not allow to perform a multicall, so it is the responsibility of the liquidator to dispose of the collateral. They also allow passing an array of price updates, in case on-demand price feeds are needed for the collateral check.

There are some important details to partial liquidations:
- The token to be seized cannot be the underlying token
- If the token to be seized is a phantom token (i.e., is non-transferable), it's withdrawn first to its closest transferable token before transferring to the liquidator. For example, Convex positions are withdrawn to Convex LP tokens before transferring.
