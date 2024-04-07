import { NetworkType } from "@gearbox-protocol/sdk-gov";
import stateArbitrum from "../stateArbitrum.json";
import stateMainnet from "../stateMainnet.json";
import stateOptimism from "../stateOptimism.json";

export function getState(network: NetworkType) {
  switch (network) {
    case "Mainnet":
      return stateMainnet;
    case "Arbitrum":
      return stateArbitrum;
    case "Optimism":
      return stateOptimism;
  }
}
