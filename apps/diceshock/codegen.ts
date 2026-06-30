import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./schema.graphql",
  // preferences.graphql targets preference CRUD fields that are not present in schema.graphql yet.
  // Keep it out of client generation until those operations are implemented, otherwise codegen fails.
  documents: ["src/client/graphql/operations/**/*.graphql", "!src/client/graphql/operations/preferences.graphql"],
  generates: {
    "src/client/graphql/__generated__/schema.ts": {
      plugins: [
        { add: { content: "/* eslint-disable */" } },
        "typescript",
      ],
    },
    "src/client/graphql/__generated__/operations.ts": {
      plugins: [
        { add: { content: "/* eslint-disable */" } },
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
  },
};
export default config;
