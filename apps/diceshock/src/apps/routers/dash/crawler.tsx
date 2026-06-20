import {
  ArrowsClockwiseIcon,
  DatabaseIcon,
  ImageSquareIcon,
  ListMagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/crawler")({
  component: RouteComponent,
});

type CrawlerStats = Awaited<
  ReturnType<typeof trpcClientDash.crawlerManagement.getStats.query>
>;

type CrawlerError = Awaited<
  ReturnType<typeof trpcClientDash.crawlerManagement.getErrors.query>
>[number];

function formatTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm:ss") : "—";
  } catch {
    return "—";
  }
}

function RouteComponent() {
  const msg = useMsg();
  const [stats, setStats] = useState<CrawlerStats | null>(null);
  const [errors, setErrors] = useState<CrawlerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStats, nextErrors] = await Promise.all([
        trpcClientDash.crawlerManagement.getStats.query(),
        trpcClientDash.crawlerManagement.getErrors.query({ limit: 10 }),
      ]);
      setStats(nextStats);
      setErrors(nextErrors);
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "加载爬虫状态失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(() => {
    if (!stats) return 0;
    return Math.min(100, (stats.next_id / stats.estimated_max) * 100);
  }, [stats]);

  const handleReset = async () => {
    if (!confirm("确定要重置爬虫进度吗？已入库游戏不会删除。")) return;
    setResetting(true);
    try {
      await trpcClientDash.crawlerManagement.resetCrawl.mutate();
      msg.success("爬虫进度已重置");
      await load();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "重置失败");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DashBackButton />
            <div>
              <h1 className="text-2xl font-bold">Gstone 桌游爬虫</h1>
              <p className="text-sm text-base-content/60">
                每分钟派发 200 个 ID，游戏数据和图片异步处理。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1.5"
              onClick={() => void load()}
              disabled={loading}
            >
              <ArrowsClockwiseIcon className="size-4" />
              刷新
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={() => void handleReset()}
              disabled={resetting}
            >
              {resetting ? "重置中…" : "Reset"}
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                icon={<DatabaseIcon className="size-6 text-primary" />}
                label="已入库游戏"
                value={stats?.total_games ?? 0}
              />
              <StatCard
                icon={<ListMagnifyingGlassIcon className="size-6 text-info" />}
                label="下一个 ID"
                value={`${stats?.next_id ?? 1} / ${stats?.estimated_max ?? 50000}`}
              />
              <StatCard
                icon={<WarningCircleIcon className="size-6 text-error" />}
                label="爬取错误"
                value={stats?.unresolved_errors ?? 0}
              />
              <StatCard
                icon={<ImageSquareIcon className="size-6 text-success" />}
                label="已缓存封面"
                value={stats?.cached_images ?? 0}
              />
              <StatCard
                icon={<WarningCircleIcon className="size-6 text-warning" />}
                label="图片失败"
                value={stats?.image_errors ?? 0}
              />
            </section>

            <section className="card bg-base-100 shadow-sm">
              <div className="card-body p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold">爬取进度</h2>
                  <span className="text-sm text-base-content/60">
                    最近处理：{formatTime(stats?.last_crawl_at)}
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={progress}
                  max={100}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-base-content/70">
                  <span>成功：{stats?.total_crawled ?? 0}</span>
                  <span>跳过：{stats?.total_skipped ?? 0}</span>
                  <span>错误：{stats?.total_errors ?? 0}</span>
                </div>
              </div>
            </section>

            <section className="card bg-base-100 shadow-sm">
              <div className="card-body p-0">
                <div className="p-4 border-b border-base-200">
                  <h2 className="font-bold">最近 10 条错误</h2>
                </div>
                {errors.length === 0 ? (
                  <div className="p-8 text-center text-base-content/50">
                    暂无未解决错误
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Game ID</th>
                          <th>错误</th>
                          <th>重试</th>
                          <th>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.map((error) => (
                          <tr key={error.id}>
                            <td>{error.id}</td>
                            <td>{error.gstone_id}</td>
                            <td className="max-w-xl truncate">{error.error}</td>
                            <td>{error.retry_count}</td>
                            <td>{formatTime(error.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-base-content/60">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2 bg-base-200 rounded-lg">{icon}</div>
        </div>
      </div>
    </div>
  );
}
