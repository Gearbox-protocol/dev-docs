import { Tab, Tabs } from 'nextra-theme-docs'
   import { TokenTable } from "../components/TokenTable";

# Supported tokens

<Tabs items={["Mainnet", "Goerli"]}>
  <Tab>

<>
<TokenTable network={"Mainnet"} />
</>
  </Tab>
  <Tab>

<>

<TokenTable network={"Goerli"} />
</>
  </Tab>

</Tabs>
