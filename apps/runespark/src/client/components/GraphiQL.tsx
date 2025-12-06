import { explorerPlugin } from "@graphiql/plugin-explorer";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { GraphiQL } from "graphiql";
import { useEffect, useMemo, useState } from "react";

import "graphiql/style.css";
import "@graphiql/plugin-explorer/style.css";

import { useAtomValue } from "jotai";
import { themeA } from "./ThemeSwap";

const explorer = explorerPlugin();

export function GraphiQlScreen() {
  const theme = useAtomValue(themeA);
  const [workersLoaded, setWorkersLoaded] = useState(false);

  const fetcher = useMemo(() => {
    return createGraphiQLFetcher({
      url: "/graphql",
      subscriptionUrl: "/graphql",
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkers() {
      try {
        // 动态导入 worker
        const [
          { default: createEditorWorker },
          { default: createJSONWorker },
          { default: createGraphQLWorker },
        ] = await Promise.all([
          import(
            "https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker"
          ),
          import(
            "https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker"
          ),
          import("https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker"),
        ]);

        if (!isMounted) return;

        // 设置 MonacoEnvironment
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

        setWorkersLoaded(true);
      } catch (error) {
        console.error("Failed to load Monaco workers:", error);
        // 即使加载失败也尝试渲染，让用户知道有问题
        setWorkersLoaded(true);
      }
    }

    loadWorkers();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!workersLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">加载 GraphiQL...</div>
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <GraphiQL
      fetcher={fetcher}
      plugins={[explorer]}
      forcedTheme={theme === "light" ? "light" : "dark"}
    />
  );
}
