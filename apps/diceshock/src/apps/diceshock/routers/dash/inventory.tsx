import type { BoardGame } from "@lib/utils";
import { CheckIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { defaultStyles, JsonView } from "react-json-view-lite";
import trpcClientPublic, { trpcClientDash } from "@/shared/utils/trpc";
import "react-json-view-lite/dist/index.css";
import _ from "lodash";

export const Route = createFileRoute("/dash/inventory")({
  component: RouteComponent,
});

function RouteComponent() {
  const [count, setCount] = useState<{
    current?: number;
    removed?: number;
  }>({});

  const fetch = useCallback(async () => {
    const { current, removed } = await trpcClientPublic.owned.getCount.query();

    setCount({ current, removed });
  }, []);

  const [synced, setSynced] = useState<{
    syncing: boolean;
    clean?: number;
    hidded?: number;
    fetched?: BoardGame.BoardGameCol[];
  }>({ syncing: false });

  const sync = useCallback(async () => {
    if (synced.syncing) return

    try {
      setSynced({ syncing: true });

      const page = _.range(0, 100);
      const reqChunks = _.chunk(page, 20);
      const date = Date.now()

      const fetched: BoardGame.BoardGameCol[] = []

      for await (const chunk of reqChunks) {
        const patch = await trpcClientDash.ownedManagement.sync.mutate({ pageFrom: chunk.at(0)!, pageTo: chunk.at(-1)!, date })

        if (!patch) break

        fetched.push(...patch.fetched)
        setSynced({ syncing: true, fetched })
      }

      const { clean, hidded } = await trpcClientDash.ownedManagement.wake.mutate({ date })

      setSynced({ syncing: false, clean, hidded, fetched });
      fetch();
    } catch {
      setSynced({ syncing: false });
    }
  }, [fetch, synced.syncing]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <main className="size-full p-4 flex flex-col gap-12">
      <div className="card w-96 bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex justify-between">
            <h2 className="text-3xl font-bold">更新桌游库存</h2>
            {count.current && (
              <span className="text-xl">
                {count.current}/{count.removed}
              </span>
            )}
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-xs h-40">
            {synced.fetched?.length && (
              <li key="cleaned">
                <CheckIcon className="size-4 me-2 inline-block text-success" />
                清理了过期(超过2个月)数据
                <span>{synced.clean}</span>项
              </li>
            )}
            {synced.fetched?.length && (
              <li key="hidden">
                <CheckIcon className="size-4 me-2 inline-block text-success" />
                移动
                <span>{synced.hidded}</span>项数据到回收站
              </li>
            )}
            {synced.fetched?.length && (
              <li key="fetched">
                <CheckIcon className="size-4 me-2 inline-block text-success" />
                总共爬取了
                <span>{synced.fetched?.length}</span>项数据
              </li>
            )}
            {!synced.fetched?.length && (
              <li key="unfetch">
                <WarningIcon className="size-4 me-2 inline-block text-error" />
                还没同步呢...
              </li>
            )}
          </ul>
          <div className="mt-6">
            <button
              onClick={sync}
              disabled={synced?.syncing}
              className="btn btn-primary btn-block"
            >
              {synced?.syncing && <span className="loading loading-spinner" />}
              同步
            </button>
          </div>
        </div>
      </div>

      {synced.fetched && (
        <JsonView
          data={synced.fetched}
          shouldExpandNode={() => false}
          style={defaultStyles}
        />
      )}
    </main>
  );
}
