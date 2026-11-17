import type { CodegenConfig } from "@graphql-codegen/cli";

// Types + string documents for the miniapp; the schema is owned by apps/diceshock.
const config: CodegenConfig = {
  schema: "../diceshock/schema.graphql",
  documents: ["src/graphql/operations.graphql"],
  generates: {
    "src/graphql/__generated__/operations.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        documentMode: "string",
        useTypeImports: true,
        preResolveTypes: true,
        avoidOptionals: false,
      },
    },
  },
};
export default config;
