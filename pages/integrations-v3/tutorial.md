# Tutorial: writing ERC-4626 adapter

In this tutorial, we'll write an adapter for ERC-4626 vaults.

First of all, let's understand our target contract.
We'll use the OpenZeppelin's [implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC4626.sol) as a reference.

Do we need to make any adjustments to make the contract compatible with Gearbox protocol?

1. We'll assume that vault's underlying asset is a typical non-rebasing ERC-20 token, already supported by the credit manager, so no gateways are needed.
2. Vault contract itself is an ERC-20 token representing user's share in the vault, so we only need to get this token added to the credit manager by the DAO.
3. Likely, there's no Chainlink oracle for the vault share, however `LPPriceFeed` contract can help us, which computes share's price as product between Chainlink price of underlying and exchange rate between share and underlying (the latter can be found using `convertToAssets` function).

## Interface

Let's now figure out what interface the adapter should have.

1. There are four main state-modifying functions in the contract: `deposit`, `mint`, `withdraw`, and `redeem`, and our adapter must also implement them.
We can also add `depositAll` and `redeemAll` versions that would deposit all balance of underlying asset and redeem all balance of shares, respectively.
2. Most state-reading functions should be called directly from the target contract.
It only makes sense to add the `asset()` function which returns underlying asset address.
3. Note that we know both underlying asset and vault's share addresses at the moment of adapter creation, so we can store their collateral masks and perform gas-optimized enabling/disabling.
Let's make those masks public and add `shareMask()` and `assetMask()` functions to the interface.

Eventually, the adapter interface might look as follows:
```solidity
interface IERC4626Adapter is IAdapter {
    /// @notice Vault's underlying asset
    function asset() external view returns (address);

    /// @notice Collateral token mask of vault's share in the credit manager
    function shareMask() external view returns (uint256);

    /// @notice Collateral token mask of vault's underlying asset in the credit maanger
    function assetMask() external view returns (uint256);

    /// @notice Deposits given amount of underlying asset into the vault to mint vault's shares
    /// @param assets Amount of underlying asset to deposit
    function deposit(uint256 assets, address) external;

    /// @notice Deposits the entire balance of underlying asset into the vault to mint vault's shares,
    ///         disables underlying asset
    function depositAll() external;

    /// @notice Deposits underlying asset into the vault to mint given amount of vault's shares
    /// @param shares Amount of shares to mint
    function mint(uint256 shares, address) external;

    /// @notice Redeems vault's shares to withdraw given amount of underlying asset
    /// @param assets Amount of underlying asset to withdraw
    function withdraw(uint256 assets, address, address) external;

    /// @notice Redeems given amount of vault's shares to withdraw underlying asset
    /// @param Amount of shares to redeem
    function redeem(uint256 shares, address, address) external;

    /// @notice Redeems the entire balance of vault's shares to withdraw underlying asset,
    ///         disables vault's shares
    function redeemAll() external;
}
```

It's worth noting that return values from original interface are omitted, and `receiver`/`owner` parameters are ignored because they must always be set to the credit account address.

## Implementation

With understanding what the adapter should do, it's time to implement it.

### Constructor

Let's start with contract constructor and state variables.

1. All adapters must inherit `AbstractAdapter` to gain access to credit manager functionality.
Our adapter should also implement the interface we prepared above.
2. Adapter type should be added to `AdapterType` enum in core repository. You can use `AdapterType.ABSTRACT` until then.
3. We can make `asset`, `shareMask` and `assetMask` public immutable variables as they can't change during adapter's lifetime, and storing them in such a way is more gas-efficient.
4. All adapter constructors should take at least two parameters: credit manager address and target contract address.
We then use them to initialize abstract adapter.
Finally, we initialize state variables.

```solidity
contract ERC4626Adapter is AbstractAdapter, IERC4626Adapter {
    AdapterType public constant override _gearboxAdapterType = AdapterType.ERC4626;
    uint16 public constant override _gearboxAdapterVersion = 1;

    /// @inheritdoc IERC4626Adapter
    address public immutable override asset;

    /// @inheritdoc IERC4626Adapter
    uint256 public immutable override shareMask;

    /// @inheritdoc IERC4626Adapter
    uint256 public immutable override assetMask;

    /// @notice Constructor
    /// @param _creditManager Address of the credit manager to connect the adapter to
    /// @param _vault Address of the target vault contract
    constructor(address _creditManager, address _vault) AbstractAdapter(_creditManager, _vault) {
        asset = IERC4626(_vault).asset();
        shareMask = _getMaskOrRevert(_vault);
        assetMask = _getMaskOrRevert(asset);
    }
}
```

### Wrapping functions

Now let's actually implement the state-modifying functionality.

Let's consider a step-by-step process of writing a wrapper function, keeping in mind abstract adapter's helper functions.

**Step 1**. Call the wrapped function of the target contract with passed calldata.

```solidity
function deposit(uint256 assets, address receiver) external override {
    _execute(abi.encodeCall(IERC4626.deposit, (assets, receiver)));
}
```

That would revert because target contract needs an approval to execute the call.

**Step 2.** Handle token approvals: give approval before the operation and revoke after it

```solidity
function deposit(uint256 assets, address receiver) external override {
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, receiver)));
    _approveToken(asset, 1);
}
```

We could've just called `_approveToken(asset, assets + 1)` and probably gotten the same result, but let's remember how adversarial our environment is: we recommend setting the approval to 1 explicitly.

Okay, this would do the job, but is it safe? Nope, it transfers shares to an arbitrary address!

**Step 3.** Ensure that tokens recipient is always the credit account.

```solidity
function deposit(uint256 assets, address) external override {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
}
```

Are we done? Hell no! A potential attacker would be able to call the function once again if he manages to execute his own code during target contract call!

**Step 4.** Always add the `creditFacadeOnly` modifier.

```solidity
function deposit(uint256 assets, address) external override creditFacadeOnly {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
}
```

This function is good now, but we should still take care of the user and simplify multicalls for them.

**Step 5.** Enable tokens received during the call and disable the ones that were fully spent.

```solidity
function deposit(uint256 assets, address) external override creditFacadeOnly {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
    _changeEnabledTokens(shareMask, 0);
}
```

Asset is not disabled because this function doesn't generally spend the entire balance.

Notice that this step is as important for security as the previous ones in case when function deals with arbitrary tokens, because it checks whether tokens are recognized by the system.

### Full contract

Let's repeat the same process for other wrapping functions.
After some refactoring and gas optimization, the contract would look like this:

```solidity
contract ERC4626Adapter is AbstractAdapter, IERC4626Adapter {
    AdapterType public constant override _gearboxAdapterType = AdapterType.ERC4626;
    uint16 public constant override _gearboxAdapterVersion = 1;

    /// @inheritdoc IERC4626Adapter
    address public immutable override asset;

    /// @inheritdoc IERC4626Adapter
    uint256 public immutable override shareMask;

    /// @inheritdoc IERC4626Adapter
    uint256 public immutable override assetMask;

    /// @notice Constructor
    /// @param _creditManager Address of the credit manager to connect the adapter to
    /// @param _vault Address of the target vault contract
    constructor(address _creditManager, address _vault) AbstractAdapter(_creditManager, _vault) {
        asset = IERC4626(_vault).asset();
        shareMask = _checkToken(_vault);
        assetMask = _checkToken(asset);
    }

    /// @inheritdoc IERC4626Adapter
    function deposit(uint256 assets, address) external override creditFacadeOnly {
        _deposit(_creditAccount(), assets, false);
    }

    /// @inheritdoc IERC4626Adapter
    function depositAll() external override creditFacadeOnly {
        address creditAccount = _creditAccount();
        uint256 balance = IERC20(asset).balanceOf(creditAccount);
        if (balance <= 1) return;
        unchecked {
            _deposit(creditAccount, balance - 1, true);
        }
    }

    /// @dev Implementation of deposit
    function _deposit(address creditAccount, uint256 assets, bool disableAsset) internal {
        _approveToken(asset, type(uint256).max);
        _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
        _approveToken(asset, 1);
        _changeEnabledTokens(shareMask, disableAsset ? assetMask : 0);
    }

    /// @inheritdoc IERC4626Adapter
    function mint(uint256 shares, address) external override creditFacadeOnly {
        address creditAccount = _creditAccount();
        _approveToken(asset, type(uint256).max);
        _execute(abi.encodeCall(IERC4626.mint, (shares, creditAccount)));
        _approveToken(asset, 1);
        _changeEnabledTokens(shareMask, 0);
    }

    /// @inheritdoc IERC4626Adapter
    function withdraw(uint256 assets, address, address) external override creditFacadeOnly {
        address creditAccount = _creditAccount();
        // NOTE: no approval needed since target contract will be called by CA
        _execute(abi.encodeCall(IERC4626.withdraw, (shares, creditAccount, creditAccount)));
        _changeEnabledTokens(assetMask, 0);
    }

    /// @inheritdoc IERC4626Adapter
    function redeem(uint256 shares, address, address) external override creditFacadeOnly {
        _redeem(_creditAccount(), shares, false);
    }

    /// @inheritdoc IERC4626Adapter
    function redeemAll() external override creditFacadeOnly {
        address creditAccount = _creditAccount();
        uint256 balance = IERC20(targetContract).balanceOf(creditAccount);
        if (balance <= 1) return;
        unchecked {
            _redeem(creditAccount, balance - 1, true);
        }
    }

    /// @dev Implementation of redeem
    function _redeem(address creditAccount, uint256 shares, bool disableShare) internal {
        // NOTE: no approval needed since target contract will be called by CA
        _execute(abi.encodeCall(IERC4626.redeem, (shares, creditAccount, creditAccount)));
        _changeEnabledTokens(assetMask, disableShare ? shareMask : 0);
    }
}
```

## Checklist

As promised, let's evaluate the new adapter against the checklist on the previous page.

- [x] Adapter must be made compatible with Gearbox protocol &mdash; _the only adaptation is custom oracle_
- [x] Adapter must inherit and make use of `AbstractAdapter` &mdash; _inherits explicitly_
- [x] All wrapping functions that modify account's state must have the `creditFacadeOnly` modifier &mdash; _recall step 4_
- [x] All wrapping functions can only modify the state of the `_creditAccount()` &mdash; _recall step 3_
- [x] All wrapping functions that allow to specify a recipient must set it to the `_creditAccount()` &mdash; _recall step 3_
- [x] All wrapping functions that require token approval to execute an operation must reset it to `1` after &mdash; _recall step 2_
- [x] All wrapping functions that receive/spend tokens must call `_enableToken()`/`_disableToken()` on them (or `_changeEnabledTokens` if masks were initialized in the constructor) &mdash; _recall step 5 and constructor_
