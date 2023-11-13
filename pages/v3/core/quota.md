# Quotas

Quotas are a mechanism that Gearbox V3 uses to track exposure to a particular collateral asset, both on the level of a single Credit Account, and on the level of the entire pool. 
A quota is the maximum underlying equivalent of a quoted asset that is counted towards collateral of a CA. This means that:
1. Quotas are denominated in units of underlying;
2. When computing the weighted value for a quoted asset, either the actual underlying-denominated value of the asset is used, or its quota - whichever is smaller.

See [Debt and Collateral](/core/debt-collateral#collateral-value-and-account-health) for the mathematical representation of this relationship.

Users set quotas for their quoted collateral assets themselves, which is typically done when the Credit Account receives an asset and the owner wants to use it as collateral. While a Credit Account owner can potentially set as large a quota as they want, there are both global limits on total sum of all quotas for an asset, and ongoing costs of having a quota, which are proportional to the quota size. 

Zero-debt accounts cannot have any non-zero quotas. All quotas must be removed before fully repaying debt.

## Quota limits

The Gearbox governance can set a **quota limit** per each `(pool, collateral asset)` pair. The sum of all quotas set by users for that asset on Credit Accounts associated with that pool cannot exceed this limit. This means that the user cannot have the token in question counted as collateral if this limit is reached - the token can be held on the account, but its quota cannot be changed from 0 (and, therefore, it will not count in TWV). In this situation, the CA owner will have to wait until the limit is increased, or another user removes their quota, freeing up capacity.

## Quota interest

Quota interest is additional interest that accrues on the size of the quota set by the CA owner. This serves two purposes:
1. Preventing users from setting unnecessarily large quotas and taking up all capacity;
2. Implementing granular pricing of debt based on risk of assets borrowed funds are exposed to;

Quota interest rates are different for each collateral asset, therefore the total annual quota interest for a Credit Account is:

$$
QI^Y = \sum_{i}{q_i * rq_i^Y}
$$

The rate of quota interest for each asset is determined by GEAR token holder voting. See [Gauges](/) for more info.

## Quota increase fees

The Gearbox governance may also institute one-time fees applied on each quota increase, as a percentage of that increase. This is somewhat analogous to trading fees, since the quota is usually increased when the CA receives an asset after a trade. This can be used for risk-pricing of tokens with high volume but low position duration.