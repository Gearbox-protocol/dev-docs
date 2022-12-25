const remarkMath = require("remark-math");
const rehypeKatex = require("rehype-katex");

const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});

module.exports = withNextra();
