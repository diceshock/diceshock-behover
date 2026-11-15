import { useApolloClient } from "@apollo/client";
import { useState } from "react";
import {
  TrpgDashboardDocument,
  type TrpgDashboardQuery,
  type TrpgDashboardQueryVariables,
  type TrpgSessionFieldsFragment,
} from "@/client/graphql/__generated__/trpg";
import { exportSchedule } from "./exportSchedule";

export function ExportScheduleButton({
  start,
  end,
  storeId,
  storeName,
  disabled,
}: {
  start: string;
  end: string;
  storeId: string;
  storeName: string;
  disabled: boolean;
}) {
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const sessions = new Map<string, TrpgSessionFieldsFragment>();
      let offset = 0;
      while (true) {
        const result = await client.query<
          TrpgDashboardQuery,
          TrpgDashboardQueryVariables
        >({
          query: TrpgDashboardDocument,
          variables: {
            filters: {
              storeId: storeId || undefined,
              dateFrom: start,
              dateTo: end,
              offset,
            },
          },
          fetchPolicy: "network-only",
        });
        const page = result.data.trpgSessions;
        for (const session of page.items) sessions.set(session.id, session);
        if (!page.hasMore) break;
        if (!page.items.length || offset + page.items.length > 10000)
          throw new Error("排期数据过多或发生变化，请缩小门店范围后重试");
        offset += page.items.length;
      }
      await exportSchedule(start, storeName, [...sessions.values()]);
      setDone(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "导出失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={disabled || busy}
        onClick={() => void download()}
      >
        {busy ? "正在生成图片…" : "导出排期图片"}
      </button>
      {error && (
        <span role="alert" className="max-w-80 text-sm text-error">
          {error}
        </span>
      )}
      {done && (
        <span role="status" className="text-xs text-success">
          排期图片已生成，请查看下载
        </span>
      )}
    </div>
  );
}
