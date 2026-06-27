import { useApolloClient } from "@apollo/client";
import type { BoardGame } from "@lib/utils";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import {
  SyncOwnedBoardGamesDocument,
  useGetOwnedBoardGameCountQuery,
  WakeOwnedBoardGamesDocument,
} from "@/client/graphql/__generated__";

export default function InventoryManagementCard() {
  const [count, setCount] = useState<{
    current?: number;
    removed?: number;
  }>({});

  const { data: countData, refetch } = useGetOwnedBoardGameCountQuery();
  const client = useApolloClient();

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
        const { data } = await client.mutate({
          mutation: SyncOwnedBoardGamesDocument,
          variables: {
            pageFrom: chunk.at(0)!,
            pageTo: chunk.at(-1)!,
            date,
          },
        });

        const patch = data.syncOwnedBoardGames;
        const fetchedItems = patch.fetched as
          | BoardGame.BoardGameCol[]
          | undefined;

        if (!fetchedItems || fetchedItems.length === 0) break;

        fetched.unshift(...fetchedItems);
        setSynced({ syncing: true, fetched });
      }

      const { data: wakeData } = await client.mutate({
        mutation: WakeOwnedBoardGamesDocument,
        variables: { date },
      });

      const clean = wakeData.wakeOwnedBoardGames.clean as number | undefined;
      const hidded = wakeData.wakeOwnedBoardGames.hidded as number | undefined;

      let menuSynced = false;
      let menuError: string | undefined;
      try {
        const menuRes = await window.fetch("/wechat/menu", {
          method: "POST",
        });
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
  }, [fetch, synced.syncing, client]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const hasResults =
    synced.clean ||
    synced.hidded ||
    synced.fetched?.length ||
    synced.menuSynced ||
    synced.menuError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            同步信息
            {count.current != null && (
              <span className="text-xs text-base-content/60 ml-2">
                {count.current}/{count.removed}
              </span>
            )}
          </p>
          <p className="text-xs text-base-content/60">同步库存、菜单等数据</p>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={synced.syncing}
          className="btn btn-sm btn-primary gap-1.5"
        >
          {synced.syncing ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <ArrowsClockwiseIcon className="size-4" />
          )}
          同步
        </button>
      </div>
      {hasResults && (
        <ul className="flex flex-col gap-1 text-xs pl-1">
          {synced.clean != null && synced.clean > 0 && (
            <li>
              <CheckIcon className="size-3.5 me-1.5 inline-block text-success" />
              清理了过期数据 {synced.clean} 项
            </li>
          )}
          {synced.hidded != null && synced.hidded > 0 && (
            <li>
              <CheckIcon className="size-3.5 me-1.5 inline-block text-success" />
              移动 {synced.hidded} 项到回收站
            </li>
          )}
          {synced.fetched && synced.fetched.length > 0 && (
            <li>
              <CheckIcon className="size-3.5 me-1.5 inline-block text-success" />
              爬取了 {synced.fetched.length} 项数据
            </li>
          )}
          {synced.menuSynced && (
            <li>
              <CheckIcon className="size-3.5 me-1.5 inline-block text-success" />
              微信菜单已同步
            </li>
          )}
          {synced.menuError && (
            <li>
              <WarningIcon className="size-3.5 me-1.5 inline-block text-error" />
              菜单同步失败: {synced.menuError}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
