import { NetworkType, explorerUrls } from "@gearbox-protocol/sdk-gov";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Copy } from "react-feather";

export interface AddressLabel {
  label: string;
  address: string;
}

export interface AddressTableProps {
  header: string;
  network: NetworkType;
  addrs: Array<AddressLabel>;
}

export function AddressTable({ network, header, addrs }: AddressTableProps) {
  const explorerUrl = explorerUrls[network];
  const tableLines = addrs.map((addr) => (
    <tr>
      <td width={"300px"}>{addr.label}</td>
      <td>
        <a
          href={`${explorerUrl}/address/${addr.address}`}
          target="_blank"
          rel="noopener"
        >
          {addr.address}
        </a>
      </td>
    </tr>
  ));

  return (
    <div>
      <h1 style={{ fontSize: "22px", marginTop: "15px", marginBottom: "5px" }}>
        {header}
      </h1>
      <table style={{ width: "100%" }}>
        <tbody>{tableLines}</tbody>
      </table>
    </div>
  );
}
