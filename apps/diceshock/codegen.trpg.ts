import type { CodegenConfig } from "@graphql-codegen/cli";
const config: CodegenConfig = {
 schema: "./schema.graphql",
 documents: ["src/client/graphql/operations/trpg.graphql"],
 generates: {
  "src/client/graphql/__generated__/trpg.ts": {
   plugins: ["typescript-operations", "typescript-react-apollo"],
   config: { withHooks: true, withHOC: false, withComponent: false, useTypeImports: true, preResolveTypes: true },
  },
 },
};
export default config;
