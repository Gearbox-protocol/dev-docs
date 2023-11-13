# Tutorial: an writing ERC-4626 adapter

In this tutorial, we'll write an adapter for ERC-4626 vaults.

First of all, let's understand our target contract.
We'll use the OpenZeppelin's [implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC4626.sol) as a reference.

Do we need to make any adjustments to make the contract compatible with Gearbox protocol?

1. We'll assume that vault's underlying asset is a typical non-rebasing ERC-20 token, already supported by the credit manager, so no gateways are needed.
2. Vault contract itself is an ERC-20 token representing user's share in the vault, so we only need to get this token added to the credit manager by the DAO.
3. Likely, there's no Chainlink oracle for the vault share, however `LPPriceFeed` contract can help us, which computes a share's price as product between Chainlink price of underlying and exchange rate between share and underlying (the latter can be found using `convertToAssets` function).

## Interface

Let's now figure out what interface the adapter should have.

1. There are four main state-modifying functions in the contract: `deposit`, `mint`, `withdraw`, and `redeem`, and our adapter must also implement them.
We should also add `depositDiff` and `redeemDiff` versions that would spend the difference between the balance and the passed amount of underlying asset and of shares, respectively. I.e., the functions allow to specify an amount that is _not_ spent.
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
    function deposit(uint256 assets, address) external returns (uint256 tokensToEnable, uint256 tokensToDisable);

    /// @notice Deposits the difference between the entire balance of underlying asset and the specified amount, to mint vault's shares.
    function depositDiff(uint256 leftoverAmount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);

    /// @notice Deposits underlying asset into the vault to mint given amount of vault's shares
    /// @param shares Amount of shares to mint
    function mint(uint256 shares, address) external returns (uint256 tokensToEnable, uint256 tokensToDisable);

    /// @notice Redeems vault's shares to withdraw given amount of underlying asset
    /// @param assets Amount of underlying asset to withdraw
    function withdraw(uint256 assets, address, address)
        external
        returns (uint256 tokensToEnable, uint256 tokensToDisable);

    /// @notice Redeems given amount of vault's shares to withdraw underlying asset
    /// @param Amount of shares to redeem
    function redeem(uint256 shares, address, address)
        external
        returns (uint256 tokensToEnable, uint256 tokensToDisable);

    /// @notice Redeems the difference between the entire balance of vault's shares and the specified amount, to withdraw the underlying asset
    function redeemDiff(uint256 leftoverAmount) external returns (uint256 tokensToEnable, uint256 tokensToDisable);
}
```

It's worth noting that return values from original interface are omitted (but can be used inside adapter functions to, e.g., determine what tokens to enable), and `receiver`/`owner` parameters are ignored because they must always be set to the credit account address.

## Implementation

With understanding what the adapter should do, it's time to implement it.

### Constructor

Let's start with contract constructor and state variables.

1. All adapters must inherit `AbstractAdapter` to gain access to credit manager functionality.
Our adapter should also implement the interface we prepared above.
2. Adapter type should be added to the `AdapterType` enum in core repository. You can use `AdapterType.ABSTRACT` until then.
3. We can make `asset`, `shareMask` and `assetMask` public immutable variables as they can't change during adapter's lifetime, and storing them in such a way is more gas-efficient.
4. All adapter constructors should take at least two parameters: credit manager address and target contract address.
We then use them to initialize `AbstractAdapter`.
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
    _execute(msg.data);
}
```

That would revert because target contract needs an approval to execute the call.

**Step 2.** Handle token approvals: give approval before the operation and revoke after it

```solidity
function deposit(uint256 assets, address receiver) external override {
    _approveToken(asset, type(uint256).max);
    _execute(msg.data);
    _approveToken(asset, 1);
}
```

`_approveToken(asset, assets + 1)` could've achieved the same result. However, setting allowance to 1 explicitly is safer, since that doesn't make any assumptions on the token spending allowances correctly. 

This would perform the required operation, but the shares would be sent to an arbitrary address specified by the caller, so it is not yet safe.

**Step 3.** Ensure that the recipient of tokens is always the credit account.

```solidity
function deposit(uint256 assets, address) external override {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
}
```

This functions properly, but is still not completely safe - since there is no access modifier, the function can be called outside the multicall. While it would probably failed when called externall (since the active credit account in the Credit Manager is not set), the caller could try to get control of execution flow during the target contract execution and re-enter.

**Step 4.** Always add the `creditFacadeOnly` modifier.

```solidity
function deposit(uint256 assets, address) external override creditFacadeOnly {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
}
```

Finally, the Credit Facade excepts `tokensToEnable` and `tokensToDisable` to be returned, so we need to do that.

**Step 5.** Enable tokens received during the call and disable the ones that were fully spent.

```solidity
function deposit(uint256 assets, address) external override creditFacadeOnly returns (uint256 tokensToEnable, uint256 tokensToDisable) {
    address creditAccount = _creditAccount();
    _approveToken(asset, type(uint256).max);
    _execute(abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    _approveToken(asset, 1);
    (tokensToEnable, tokensToDisable) = (shareMask, 0);
}
```

The asset is not disabled because this function doesn't generally spend the entire balance.

Note that the resulting function is similar to the more general `_executeSwapSafeApprove()`. However, `_executeSwapSafeApprove` awalys retrieves token masks from the Credit Manager, while here we have them locally in immutable fields. So the function is not used.

### Full contract

Let's repeat the same process for other wrapping functions and add `diff` functions.
After some refactoring and gas optimization, the contract would look like this:

```solidity
contract ERC4626Adapter is AbstractAdapter, IERC4626Adapter {
    AdapterType public constant override _gearboxAdapterType = AdapterType.ERC4626_VAULT;
    uint16 public constant override _gearboxAdapterVersion = 3_00;

    /// @notice Address of the underlying asset of the vault
    address public immutable override asset;

    /// @notice Mask of the underlying asset of the vault
    uint256 public immutable override assetMask;

    /// @notice Mask of the ERC4626 vault shares
    uint256 public immutable override sharesMask;

    /// @notice Constructor
    /// @param _creditManager Credit manager address
    /// @param _vault ERC4626 vault address
    constructor(address _creditManager, address _vault)
        AbstractAdapter(_creditManager, _vault)
    {
        asset = IERC4626(_vault).asset();
        assetMask = _getMaskOrRevert(asset);
        sharesMask = _getMaskOrRevert(_vault);
    }

    /// @notice Deposits a specified amount of underlying asset from the credit account
    /// @param assets Amount of asset to deposit
    /// @dev `receiver` is ignored as it is always the credit account
    function deposit(uint256 assets, address)
        external
        override
        creditFacadeOnly
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount(); 
        (tokensToEnable, tokensToDisable) = _deposit(creditAccount, assets, false);
    }

    /// @notice Deposits the entire balance of underlying asset from the credit account, except the specified amount
    /// @param leftoverAmount Amount of underlying to keep on the account
    function depositDiff(uint256 leftoverAmount)
        external
        override
        creditFacadeOnly 
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount();
        uint256 balance = IERC20(asset).balanceOf(creditAccount);

        if (balance <= leftoverAmount) return (0, 0);
        unchecked {
            balance -= leftoverAmount;
        }
        (tokensToEnable, tokensToDisable) = _deposit(creditAccount, balance, leftoverAmount <= 1);
    }

    /// @dev Implementation for the deposit function
    function _deposit(address creditAccount, uint256 assets, bool disableTokenIn)
        internal
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        (tokensToEnable, tokensToDisable) =
            _executeDeposit(disableTokenIn, abi.encodeCall(IERC4626.deposit, (assets, creditAccount)));
    }

    /// @notice Deposits an amount of asset required to mint exactly 'shares' of vault shares
    /// @param shares Amount of shares to mint
    /// @dev `receiver` is ignored as it is always the credit account
    function mint(uint256 shares, address)
        external
        override
        creditFacadeOnly
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount();
        (tokensToEnable, tokensToDisable) =
            _executeDeposit(false, abi.encodeCall(IERC4626.mint, (shares, creditAccount)));
    }

    /// @notice Burns an amount of shares required to get exactly `assets` of asset
    /// @param assets Amount of asset to withdraw
    /// @dev `receiver` and `owner` are ignored, since they are always set to the credit account address
    function withdraw(uint256 assets, address, address)
        external
        override
        creditFacadeOnly
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount(); 
        (tokensToEnable, tokensToDisable) =
            _executeWithdrawal(false, abi.encodeCall(IERC4626.withdraw, (assets, creditAccount, creditAccount))); 
    }

    /// @notice Burns a specified amount of shares from the credit account
    /// @param shares Amount of shares to burn
    /// @dev `receiver` and `owner` are ignored, since they are always set to the credit account address
    function redeem(uint256 shares, address, address)
        external
        override
        creditFacadeOnly 
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount(); 
        (tokensToEnable, tokensToDisable) = _redeem(creditAccount, shares, false);
    }

    /// @notice Burns the entire balance of shares from the credit account, except the specified amount
    /// @param leftoverAmount Amount of vault token to keep on the account
    function redeemDiff(uint256 leftoverAmount)
        external
        override
        creditFacadeOnly 
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        address creditAccount = _creditAccount();
        uint256 balance = IERC20(targetContract).balanceOf(creditAccount);
        if (balance <= leftoverAmount) return (0, 0);
        unchecked {
            balance -= leftoverAmount;
        }
        (tokensToEnable, tokensToDisable) = _redeem(creditAccount, balance, leftoverAmount <= 1);
    }

    /// @dev Implementation for the redeem function
    function _redeem(address creditAccount, uint256 shares, bool disableTokenIn)
        internal
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        (tokensToEnable, tokensToDisable) =
            _executeWithdrawal(disableTokenIn, abi.encodeCall(IERC4626.redeem, (shares, creditAccount, creditAccount)));
    }

    /// @dev Implementation for deposit (asset => shares) actions execution
    /// @dev All deposit-type actions follow the same structure, with only
    ///      calldata and disabling the input token being different
    function _executeDeposit(bool disableAsset, bytes memory callData)
        internal
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        _approveToken(asset, type(uint256).max);
        _execute(callData);
        _approveToken(asset, 1);
        tokensToEnable = sharesMask;
        tokensToDisable = disableAsset ? assetMask : 0;
    }

    /// @dev Implementation for withdrawal (shares => asset) actions execution
    /// @dev All withdrawal-type actions follow the same structure, with only
    ///      calldata and disabling the input token being different
    function _executeWithdrawal(bool disableShares, bytes memory callData)
        internal
        returns (uint256 tokensToEnable, uint256 tokensToDisable)
    {
        _execute(callData);
        tokensToEnable = assetMask;
        tokensToDisable = disableShares ? sharesMask : 0;
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
- [x] All wrapping functions that modify account's state must return appropriate `tokensToEnable` and `tokensToDisable` &mdash; _implemented at step 5 and constructor_
