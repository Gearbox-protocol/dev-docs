import {
  NetworkType,
  contractsByAddress,
  tokenSymbolByAddress,
} from "@gearbox-protocol/sdk-gov";
import { getState } from "../state";
import { AddressLabel, AddressTable } from "./AddressTable";

export interface AddressListProps {
  network: NetworkType;
}

export function AddressList({ network }: AddressListProps) {
  const state = getState(network);

  const coreAddresses: Array<AddressLabel> = [
    {
      label: "ACL",
      address: state.core.acl.address,
    },
    {
      label: "Address Provider",
      address: state.core.addressProviderV3.address,
    },
    {
      label: "ContractsRegister",
      address: state.core.contractsRegister.address,
    },
    {
      label: "BotList",
      address: state.core.botList.address,
    },
    {
      label: "GearStaking",
      address: state.core.gearStakingV3.address,
    },
    {
      label: "DegenNFT",
      address: state.core.degenNFT2.address,
    },
    {
      label: "AccountFactory",
      address: state.core.accountFactory.address,
    },
    {
      label: "ControllerTimelock",
      address: state.core.controllerTimelockV3.address,
    },
    {
      label: "PriceOracleV3",
      address: state.priceOracle.priceOracleV3.address,
    },
  ];

  const mainPFAddresses: Array<AddressLabel> = Object.entries(
    state.priceOracle.mainPriceFeeds
  ).map(([label, address]) => ({
    label: tokenSymbolByAddress[label.toLowerCase()] || label,
    address: address.address,
  }));

  const reservePFAddresses: Array<AddressLabel> = Object.entries(
    state.priceOracle.reservePriceFeeds
  ).map(([label, address]) => ({
    label: tokenSymbolByAddress[label.toLowerCase()] || label,
    address: address.address,
  }));

  const pools = state.poolState.map((p) => {
    const poolAddrs: Array<AddressLabel> = [
      {
        label: "Pool",
        address: p.pool.address,
      },
      {
        label: "PoolQuotaKeeper",
        address: p.poolQuotaKeeper.address,
      },
      {
        label: "Gauge",
        address: p.gauge.address,
      },
      {
        label: "LinearModel",
        address: p.linearModel.address,
      },
    ];
    return (
      <AddressTable
        header={`Pool ${p.pool.name}`}
        addrs={poolAddrs}
        network={network}
      />
    );
  });

  const creditManagers = state.creditState.map((cm) => {
    const creditManagerAddrs: Array<AddressLabel> = [
      {
        label: "CreditManager",
        address: cm.creditManager.address,
      },
      {
        label: "CreditFacade",
        address: cm.creditFacade.address,
      },
      {
        label: "CreditConfigurator",
        address: cm.creditConfigurator.address,
      },
    ];
    Object.entries(cm.creditManager.contractsToAdapters).forEach(
      ([contract, adapter]) => {
        creditManagerAddrs.push({
          label: `Adapter for ${
            contractsByAddress[contract.toLowerCase()] || contract
          }`,
          address: adapter as string,
        });
      }
    );

    return (
      <AddressTable
        header={`Credit Manager ${cm.creditManager.name}`}
        addrs={creditManagerAddrs}
        network={network}
      />
    );
  });

  return (
    <div>
      <AddressTable
        header="Core Contracts"
        addrs={coreAddresses}
        network={network}
      />
      <AddressTable
        header="Main Price Feeds"
        addrs={mainPFAddresses}
        network={network}
      />
      <AddressTable
        header="Reserve Price Feeds"
        addrs={reservePFAddresses}
        network={network}
      />
      {pools}
      {creditManagers}
    </div>
  );
}
