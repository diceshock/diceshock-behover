import { explorerPlugin } from "@graphiql/plugin-explorer";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { GraphiQL } from "graphiql";
import { useMemo } from "react";

import "graphiql/style.css";
import "@graphiql/plugin-explorer/style.css";

import createEditorWorker from "https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker";
import createJSONWorker from "https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker";
import createGraphQLWorker from "https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker";

// @ts-expect-error - MonacoEnvironment is not typed
globalThis.MonacoEnvironment = {
  getWorker(_workerId: number, label: string) {
    console.info("MonacoEnvironment.getWorker", { label });
    switch (label) {
      case "json":
        return new createJSONWorker();
      case "graphql":
        return new createGraphQLWorker();
    }
    return new createEditorWorker();
  },
};

const explorer = explorerPlugin();

export function GraphiQlScreen() {
  const fetcher = useMemo(() => {
    return createGraphiQLFetcher({
      url: "/graphql",
      subscriptionUrl: "/graphql",
    });
  }, []);

  return <GraphiQL fetcher={fetcher} plugins={[explorer]} />;
}
