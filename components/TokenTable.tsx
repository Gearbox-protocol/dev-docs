import {
  NOT_DEPLOYED,
  NetworkType,
  explorerUrls,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk-gov";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Copy } from "react-feather";

export interface TokenTableProps {
  network: NetworkType;
}

export function TokenTable({ network }: TokenTableProps) {
  const explorerUrl = explorerUrls[network];
  const tokenLines = Object.entries(tokenDataByNetwork[network])
    .filter((t) => t[1] !== NOT_DEPLOYED)
    .map(([symbol, addr]) => (
      <tr>
        <td>{symbol}</td>
        <td>
          <a
            href={`${explorerUrl}/address/${addr}`}
            target="_blank"
            rel="noopener"
          >
            {addr}
          </a>

          <CopyToClipboard
            text={addr}
            style={{
              marginTop: "5px",
              marginLeft: "10px",
              cursor: "pointer",
            }}
          >
            <Copy size={14} />
          </CopyToClipboard>
        </td>
      </tr>
    ));

  return (
    <table style={{ width: "100%" }}>
      <thead>
        <th>
          <td>Symbol</td>
          <td width="80%">Address</td>
        </th>
      </thead>
      <tbody>{tokenLines}</tbody>
    </table>
  );
}
