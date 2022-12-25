import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 500 }}>Gearbox for developers</span>,
  project: {
    link: "https://github.com/Gearbox-protocol/dev-docs",
  },
  chat: {
    link: "https://discord.com/invite/gearbox",
  },
  docsRepositoryBase: "https://github.com/shuding/nextra-docs-template",
  footer: {
    text: "(c) 2022, Gearbox Protocol",
  },
};

export default config;
