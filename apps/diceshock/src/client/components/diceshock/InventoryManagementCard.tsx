import type { BoardGame } from "@lib/utils";
import { CheckIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { useGetOwnedBoardGameCountQuery } from "@/client/graphql/__generated__";
import { trpcClientDash } from "@/shared/utils/trpc";

export default function InventoryManagementCard() {
  const [count, setCount] = useState<{
    current?: number;
    removed?: number;
  }>({});

  const { data: countData, refetch } = useGetOwnedBoardGameCountQuery();

  useEffect(() => {
    if (countData?.ownedBoardGameCount) {
      setCount({
        current: countData.ownedBoardGameCount.current,
        removed: countData.ownedBoardGameCount.removed,
      });
    }
  }, [countData]);

  const fetch = useCallback(async () => {
    refetch();
  }, [refetch]);

  const [synced, setSynced] = useState<{
    syncing: boolean;
    clean?: number;
    hidded?: number;
    fetched?: BoardGame.BoardGameCol[];
    menuSynced?: boolean;
    menuError?: string;
  }>({ syncing: false });

  const sync = useCallback(async () => {
    if (synced.syncing) return;

    try {
      setSynced({ syncing: true });

      const page = _.range(0, 100);
      const reqChunks = _.chunk(page, 20);
      const date = Date.now();

      const fetched: BoardGame.BoardGameCol[] = [];

      for await (const chunk of reqChunks) {
        const patch = await trpcClientDash.ownedManagement.sync.mutate({
          pageFrom: chunk.at(0)!,
          pageTo: chunk.at(-1)!,
          date,
        });

        if (!patch) break;

        fetched.unshift(...patch.fetched);
        setSynced({ syncing: true, fetched });
      }

      const { clean, hidded } =
        await trpcClientDash.ownedManagement.wake.mutate({ date });

      let menuSynced = false;
      let menuError: string | undefined;
      try {
        const menuRes = await window.fetch("/wechat/menu", { method: "POST" });
        const menuData = (await menuRes.json()) as {
          success?: boolean;
          error?: string;
        };
        menuSynced = menuData.success === true;
        if (!menuSynced) menuError = menuData.error;
      } catch (e) {
        menuError = String(e);
      }

      setSynced({
        syncing: false,
        clean,
        hidded,
        fetched,
        menuSynced,
        menuError,
      });
      fetch();
    } catch {
      setSynced({ syncing: false });
    }
  }, [fetch, synced.syncing]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="card w-full bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex justify-between">
          <h2 className="text-3xl font-bold">同步信息</h2>
          {count.current && (
            <span className="text-xl">
              {count.current}/{count.removed}
            </span>
          )}
        </div>
        <ul className="mt-6 flex flex-col gap-2 text-xs h-40">
          {(synced.clean ?? null) && (
            <li key="cleaned">
              <CheckIcon className="size-4 me-2 inline-block text-success" />
              清理了过期(超过2个月)数据
              <span>{synced.clean}</span>项
            </li>
          )}
          {(synced.hidded ?? null) && (
            <li key="hidden">
              <CheckIcon className="size-4 me-2 inline-block text-success" />
              移动
              <span>{synced.hidded}</span>项数据到回收站
            </li>
          )}
          {(synced.fetched?.length ?? null) && (
            <li key="fetched">
              <CheckIcon className="size-4 me-2 inline-block text-success" />
              总共爬取了
              <span>{synced.fetched?.length}</span>项数据
            </li>
          )}
          {synced.menuSynced && (
            <li key="menu">
              <CheckIcon className="size-4 me-2 inline-block text-success" />
              微信菜单已同步
            </li>
          )}
          {synced.menuError && (
            <li key="menu-error">
              <WarningIcon className="size-4 me-2 inline-block text-error" />
              微信菜单同步失败: {synced.menuError}
            </li>
          )}
          {!synced.fetched?.length && !synced.menuSynced && (
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
  );
}
