/**
 * @type {import("@gqty/cli").GQtyConfig}
 */
const config = {
  destination: "./src/shared/gqty/index.ts",
  react: true,
  subscriptions: true,
  introspection: {
    endpoint: "http://localhost:5173/graphql",
  },
};

module.exports = config;
