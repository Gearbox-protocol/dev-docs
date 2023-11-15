# Debt and Collateral

To determine a Credit Account's solvency, the protocol performs collateral checks that compare the discounted value of the account's collateral to its debt. The discounted value of collateral tokens must be higher than debt to pass a collateral check - any sequence of operations violates this rule will be rejected by the protocol (reverting the transaction that led to this state) and accounts that have their collateral depreciate to the point where the rule is violated are liable to be liquidated.

The following sections provide more details on how the protocol calculates debt and collateral.

## Debt

A Credit Account's debt is always denominated in the amount of the corresponding debt asset. Each Credit Account is associated with a specific Credit Facade/Credit Manager, which is in turn associated with a specific pool - therefore, for each Credit Account there is only one debt asset which is called the **underlying**.

Debt in Gearbox protocol consists of several different parts:

1. **Principal.** This is the amount that the Credit Account has borrowed from the pool. It only changes when the CA's owner has explicitly requested to borrow more funds or repay debt.
2. **Interest.** This is the interest accrued on the borrowed principal. It grows over time as a percentage of principal, with the rate determined by the pool's utilization.
3. **Quota interest.** This is the interest paid by the user on quotas they have enabled for their collateral. It grows over time as a percentage of the quota, with the rate determined by GEAR governance. More on quotas [here](../core/quota).
4. **Protocol fees.** This is additional fees paid directly to the protocol's treasury. They are determined as a fixed percentage of `interest + quotaInterest`, so they also grow over time pro-rata.
5. **Trading fees.** These are additional fees which are incurred when increasing quotas for assets (which is typically done when receiving the asset on the account, i.e. "buying" it). They are added to the total debt each time the quota is increase, as a percentage of increase.

Gearbox imposes minimal and maximal limits on the principal amount for each CA. The minimal debt limit is required to ensure that liquidations are profitable even at spiked gas prices, while the max limit is mainly needed for risk management.

Gearbox V3 also supports Credit Accounts in "zero debt" state. This means that all debt is repaid and the CA is now effectively a normal smart contract wallet, until the owner decides to borrow again. In this state collateral checks are not performed and various restrictions on the account use are generally relaxed.

## Collateral

While a Credit Account can in principle hold any token, only a limited set of tokens determined by Gearbox governance can be used as collateral.

There are two main types of collateral tokens in V3:

1. Non-quoted tokens. A small number of the most liquid tokens on the market (large stablecoins, WETH) are non-quoted. This means that they do not require quotas to be counted as collateral (i.e., the entirety of token's balance is counted towards collateral at all times) and the protocol is able to tolerate any exposure to those assets.
2. Quoted tokens. Most collateral tokens require users to set a quota in order for the token to be considered collateral. Quotas essentially limit how much of the token can be used as collateral on the account, with a global per-token limit defined for each pool, defining maximal protocol exposure. More on quotas [here](/v3/core/quota).

In order to count as collateral, a token also needs to be **enabled**. Quoted tokens are enabled when a non-zero quota is set for them. Non-quoted tokens are typically enabled automatically when trading into them, but can also be enabled manually by calling a special function.

Each collateral token has a number of [risk parameters](../risk/overview) associated with it. These include the aforementioned quota limits that determine maximal exposure, trading fees and quota interest to provide pool LPs proper compensation for risk, and, most importantly, the Liquidation Threshold, which determines how much the collateral is discounted when comparing it against debt.

Each collateral token also has an associated [price feed](../oracle/overview), which is used to determine the conversion rate of the collateral asset to underlying.

## Collateral value and account health

The main metric used to define the relative value of collateral (and consequently, account health), is the Total Weighted Value, or TWV. The weighted value of each particular token is computed as:

$$
VW_i = \begin{cases}
    b_i * p_i * LT_i & \text{if } i \text{ is non-quoted},\\
    min(b_i * p_i, q_i) * LT_i & \text{if } i \text{ is quoted}
\end{cases}
$$

where $b_i$ is token's balance, $p_i$ is token's price in underlying according to the associated price feed, $LT_i$ is the token's Liquidation Threshold, and $q_i$ is the token's quota (if applicable).

Consequently, TWV is the sum of individual VW's:

$$
TWV = \sum_{i}{VW_i}
$$

Liquidation Thresholds are essentially discounting coefficients that are tied to the asset's volatility against underlying (see more [here](/v3/risk/liquidation-threshold)).

The account's health is determined by its Health Factor, which is computed as

$$
hf = \frac{TWV}{totalDebt}
$$

An account with $hf < 1$ is considered unhealthy. If the account is unhealthy after a user-initiated transaction, then the transaction is reverted. If it became unhealthy due to collateral price depreciation, then it is [liquidated](../core/liquidation).

## Token masks

To conserve gas, Gearbox V3 uses bit-strings (encoded into `uint256` numbers) called masks. Masks allow to efficiently store and verify set inclusion: a bit at the i-th position being set to 1 means that the i-th token in the system belongs to the set, with set inclusion being verifiable with a single `AND` op. There are several types of masks used in the system:

1. `enabledTokensMask` - this mask encodes a set of collateral tokens that are enabled for a particular Credit Account. These masks are stored for each Credit Account.
2. `quotedTokensMask` - this mask encodes the set of quoted tokens. Each `CreditFacade`/`CreditManager` has a single quoted tokens mask.
3. `forbiddenTokensMask` - this mask encodes the set of forbiddenTokens (see below). Each `CreditFacade`/`CreditManager` has a single forbidden tokens mask.

## Forbidden tokens

The Gearbox governance can give some tokens a special **forbidden** status, which is intended to prevent any further exposure to an asset. Forbidden tokens cannot be enabled as collateral on new accounts, and their balances cannot be increased after user calls. Some actions (such as borrowing more or withdrawing collateral) are prohibited until the user disposes of the forbidden token on their account.
