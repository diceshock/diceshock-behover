import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  DownloadSimpleIcon,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import useSeatTimer from "@/client/hooks/useSeatTimer";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type TableDetail = Awaited<
  ReturnType<typeof trpcClientDash.tablesManagement.getById.query>
>;
type Occupancy = TableDetail["occupancies"][number];

const TYPE_LABELS: Record<string, string> = {
  mahjong: "麻将台",
  boardgame: "桌游台",
  solo: "散人台",
};

export const Route = createFileRoute("/dash/tables_/$id")({
  component: TableDetailPage,
});

function formatDuration(startAt: unknown): string {
  if (!startAt) return "—";
  const start = dayjs(startAt as string | number | Date);
  if (!start.isValid()) return "—";
  const now = dayjs();
  const diffMin = now.diff(start, "minute");
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function TableDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"basic" | "qrcode" | "occupancy">(
    "basic",
  );

  const [editForm, setEditForm] = useState({
    name: "",
    capacity: 1,
    description: "",
  });
  const [editPending, setEditPending] = useState(false);

  const [statusTogglePending, setStatusTogglePending] = useState(false);

  const regenerateDialogRef = useRef<HTMLDialogElement>(null);
  const [regeneratePending, setRegeneratePending] = useState(false);

  const addOccDialogRef = useRef<HTMLDialogElement>(null);
  const [addOccForm, setAddOccForm] = useState({ userId: "", seats: 1 });
  const [addOccPending, setAddOccPending] = useState(false);

  const endOccDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingEndOcc, setPendingEndOcc] = useState<Occupancy | null>(null);
  const [orderActionPending, setOrderActionPending] = useState(false);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.tablesManagement.getById.query({ id });
      setTable(data);
      setEditForm({
        name: data.name,
        capacity: data.capacity,
        description: data.description ?? "",
      });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载桌台失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

  const { state: wsState } = useSeatTimer({
    code: table?.code ?? "",
    role: "dash",
    enabled: !!table?.code,
  });

  useEffect(() => {
    if (!wsState?.occupancies || !table) return;
    void fetchTable();
  }, [wsState?.occupancies]);

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      msg.error("请输入桌台名称");
      return;
    }
    setEditPending(true);
    try {
      await trpcClientDash.tablesManagement.update.mutate({
        id,
        name: editForm.name.trim(),
        capacity: editForm.capacity,
        description: editForm.description.trim() || null,
      });
      msg.success("桌台信息已更新");
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditPending(false);
    }
  };

  const handleToggleStatus = async () => {
    setStatusTogglePending(true);
    try {
      const res = await trpcClientDash.tablesManagement.toggleStatus.mutate({
        id,
      });
      msg.success(res.status === "active" ? "已上架" : "已下架");
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setStatusTogglePending(false);
    }
  };

  const handleRegenerateCode = async () => {
    setRegeneratePending(true);
    try {
      await trpcClientDash.tablesManagement.regenerateCode.mutate({ id });
      msg.success("编号已重新生成");
      regenerateDialogRef.current?.close();
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "重新生成失败");
    } finally {
      setRegeneratePending(false);
    }
  };

  const handleAddOccupancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOccForm.userId.trim()) {
      msg.error("请输入用户 ID");
      return;
    }
    setAddOccPending(true);
    try {
      await trpcClientDash.tablesManagement.addOccupancy.mutate({
        table_id: id,
        user_id: addOccForm.userId.trim(),
        seats: addOccForm.seats,
      });
      msg.success("已添加使用");
      addOccDialogRef.current?.close();
      setAddOccForm({ userId: "", seats: 1 });
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setAddOccPending(false);
    }
  };

  const openEndOccDialog = (occ: Occupancy) => {
    setPendingEndOcc(occ);
    setTimeout(() => endOccDialogRef.current?.showModal(), 0);
  };

  const confirmEndOcc = async () => {
    if (!pendingEndOcc) return;
    setOrderActionPending(true);
    try {
      await trpcClientDash.ordersManagement.endOrder.mutate({
        id: pendingEndOcc.id,
      });
      msg.success("已终止");
      endOccDialogRef.current?.close();
      setPendingEndOcc(null);
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "终止失败");
    } finally {
      setOrderActionPending(false);
    }
  };

  const handlePauseOrder = async (occId: string) => {
    setOrderActionPending(true);
    try {
      await trpcClientDash.ordersManagement.pauseOrder.mutate({ id: occId });
      msg.success("已暂停");
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "暂停失败");
    } finally {
      setOrderActionPending(false);
    }
  };

  const handleResumeOrder = async (occId: string) => {
    setOrderActionPending(true);
    try {
      await trpcClientDash.ordersManagement.resumeOrder.mutate({ id: occId });
      msg.success("已继续");
      await fetchTable();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "继续失败");
    } finally {
      setOrderActionPending(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!table) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">桌台不存在</p>
        <Link to="/dash/tables" className="btn btn-primary btn-sm">
          返回桌台列表
        </Link>
      </main>
    );
  }

  const totalOccupiedSeats = table.occupancies.reduce(
    (sum, o) => sum + (o.seats ?? 1),
    0,
  );

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/tables" label="返回桌台列表" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-20">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{table.name}</h1>
              <p className="text-sm text-base-content/60 font-mono">
                {table.id}
              </p>
            </div>
            <span
              className={`badge ${table.type === "mahjong" ? "badge-accent" : table.type === "solo" ? "badge-secondary" : "badge-info"}`}
            >
              {TYPE_LABELS[table.type] ?? table.type}
            </span>
            {table.status === "active" ? (
              <span className="badge badge-success">上架</span>
            ) : (
              <span className="badge badge-ghost">下架</span>
            )}
          </div>

          <div role="tablist" className="tabs tabs-bordered mb-6">
            <button
              type="button"
              role="tab"
              className={clsx("tab", activeTab === "basic" && "tab-active")}
              onClick={() => setActiveTab("basic")}
            >
              基本信息
            </button>
            <button
              type="button"
              role="tab"
              className={clsx("tab", activeTab === "qrcode" && "tab-active")}
              onClick={() => setActiveTab("qrcode")}
            >
              编号与二维码
            </button>
            <button
              type="button"
              role="tab"
              className={clsx("tab", activeTab === "occupancy" && "tab-active")}
              onClick={() => setActiveTab("occupancy")}
            >
              使用 ({table.occupancies.length})
            </button>
          </div>

          {activeTab === "basic" && (
            <form onSubmit={handleBasicSubmit} className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">桌台名称</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="桌台名称"
                  maxLength={50}
                />
              </label>

              <div className="flex items-center justify-between">
                <span className="label text-sm font-semibold">上架状态</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-base-content/60">
                    {table.status === "active" ? "上架中" : "已下架"}
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-success"
                    checked={table.status === "active"}
                    onChange={() => void handleToggleStatus()}
                    disabled={statusTogglePending}
                  />
                </div>
              </div>

              {table.type !== "solo" && (
                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">适用人数</span>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editForm.capacity}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        capacity: Number(e.target.value),
                      }))
                    }
                    min={1}
                    max={20}
                  />
                </label>
              )}

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">
                  描述（可选）
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="桌台描述..."
                  rows={4}
                />
              </label>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate({ to: "/dash/tables" })}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={clsx("btn btn-primary", editPending && "loading")}
                  disabled={editPending}
                >
                  {editPending ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "qrcode" && (
            <QrCodeTab
              table={table}
              editName={editForm.name}
              onEditName={(name: string) =>
                setEditForm((p) => ({ ...p, name }))
              }
              onRegenerate={() => regenerateDialogRef.current?.showModal()}
            />
          )}

          {activeTab === "occupancy" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  使用情况 (
                  {table.type === "solo"
                    ? totalOccupiedSeats
                    : `${totalOccupiedSeats}/${table.capacity}`}
                  )
                </h3>
                <div className="flex items-center gap-2">
                  <Link
                    to="/dash/orders"
                    className="btn btn-xs btn-ghost btn-primary"
                  >
                    查看全部订单
                  </Link>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setAddOccForm({ userId: "", seats: 1 });
                      addOccDialogRef.current?.showModal();
                    }}
                  >
                    <PlusIcon className="size-4" />
                    添加使用
                  </button>
                </div>
              </div>

              {table.occupancies.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  暂无使用
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {table.occupancies.map((occ) => (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/dash/users/$id"
                            params={{ id: occ.user_id ?? "" }}
                            className="font-medium link link-hover"
                          >
                            {occ.nickname}
                          </Link>
                          {occ.uid && (
                            <span className="text-xs text-base-content/60">
                              UID: {occ.uid}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-base-content/70">
                          <span>使用 {occ.seats} 个位置</span>
                          <span>{formatDuration(occ.start_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => void handlePauseOrder(occ.id)}
                          disabled={orderActionPending}
                        >
                          <PauseIcon className="size-3.5" />
                          暂停
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => openEndOccDialog(occ)}
                          disabled={orderActionPending}
                        >
                          <StopIcon className="size-3.5" />
                          终止
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <dialog ref={regenerateDialogRef} className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">重新生成编号</h3>
            <p>重新生成编号后，之前的二维码将失效。确定要继续吗？</p>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => regenerateDialogRef.current?.close()}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => void handleRegenerateCode()}
                disabled={regeneratePending}
              >
                {regeneratePending ? "生成中..." : "确认重新生成"}
              </button>
            </div>
          </div>
        </dialog>

        <dialog ref={addOccDialogRef} className="modal">
          <form
            method="dialog"
            className="modal-box"
            onSubmit={handleAddOccupancy}
          >
            <div className="modal-action flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">添加使用</h3>
              <button
                type="button"
                className="btn btn-ghost btn-square"
                onClick={() => addOccDialogRef.current?.close()}
              >
                <XIcon />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">用户 ID</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={addOccForm.userId}
                  onChange={(e) =>
                    setAddOccForm((p) => ({ ...p, userId: e.target.value }))
                  }
                  placeholder="输入用户 ID"
                />
              </label>

              {table.type !== "solo" && (
                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">
                    使用位置数
                  </span>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={addOccForm.seats}
                    onChange={(e) =>
                      setAddOccForm((p) => ({
                        ...p,
                        seats: Number(e.target.value),
                      }))
                    }
                    min={1}
                    max={table.capacity}
                  />
                </label>
              )}
            </div>

            <div className="modal-action mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addOccPending}
              >
                {addOccPending ? "添加中..." : "添加"}
              </button>
            </div>
          </form>
        </dialog>

        <dialog ref={endOccDialogRef} className="modal">
          {pendingEndOcc && (
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">确认终止</h3>
              <p>
                确定要终止 <strong>{pendingEndOcc.nickname}</strong> 的订单吗？
              </p>
              <div className="modal-action mt-6">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    endOccDialogRef.current?.close();
                    setPendingEndOcc(null);
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={() => void confirmEndOcc()}
                  disabled={orderActionPending}
                >
                  {orderActionPending ? "终止中..." : "确认终止"}
                </button>
              </div>
            </div>
          )}
        </dialog>
      </main>
    </ClientOnly>
  );
}

const STICKER_W = 600;
const STICKER_H = 660;

const BRAND_GREEN = "#42B68D";
const BRAND_DARK = "#0E1836";
const FONT = "Sarasa, sans-serif";

const LIGHTNING_SVG_PATH =
  "M27.09,105.6h29.37c-13.21,25.72-26.43,51.44-39.64,77.16,30.74-31.88,61.48-63.76,92.22-95.63h-32.09c14.4-25.53,28.8-51.05,43.2-76.58-31.02,31.68-62.04,63.37-93.06,95.05Z";

const FAVICON_PATHS = [
  "M185.56.65c-41.63,42.52-83.26,85.04-124.89,127.57h39.42c-3.05,5.94-6.1,11.87-9.15,17.81h38.64c13.69-14.2,27.39-28.4,41.08-42.6h-43.07c19.32-34.26,38.65-68.52,57.97-102.78Z",
  "M111.34,164.94h-30.12c-4.02,7.82-8.03,15.64-12.05,23.46h19.55c7.54-7.82,15.08-15.64,22.62-23.46Z",
  "M59.46,207.3c-4.19,8.16-8.38,16.32-12.58,24.48,7.87-8.16,15.74-16.32,23.61-24.48h-11.03Z",
];

function drawLightning(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(LIGHTNING_SVG_PATH));
  ctx.restore();
}

function drawFaviconIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
  bgColor: string,
  fgColor: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  const svgSize = 232.43;
  const scale = (diameter * 0.82) / svgSize;
  const ox = cx - (svgSize * scale) / 2;
  const oy = cy - (svgSize * scale) / 2;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.fillStyle = fgColor;
  for (const d of FAVICON_PATHS) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderStickerCanvas(
  code: string,
  name: string,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = STICKER_W;
  canvas.height = STICKER_H;
  const ctx = canvas.getContext("2d")!;
  const R = 24;

  ctx.beginPath();
  ctx.roundRect(0, 0, STICKER_W, STICKER_H, R);
  ctx.clip();

  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = BRAND_GREEN;
  ctx.fillRect(0, 0, STICKER_W, 120);

  const lightningGrid: [number, number, number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      const lx = col * 80 + (row % 2 === 0 ? 0 : 40);
      const ly = row * 38 + 4;
      lightningGrid.push([lx, ly, 0.11, 0.05 + Math.random() * 0.04]);
    }
  }
  for (const [lx, ly, sc, al] of lightningGrid) {
    drawLightning(ctx, lx, ly, sc, "#ffffff", al);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 36px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(name, STICKER_W / 2, 60);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(`#${code}`, STICKER_W / 2, 98);

  const qrUrl = `${window.location.origin}/t/${code}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 440,
    margin: 1,
    color: { dark: BRAND_DARK, light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 440;
  const qrX = (STICKER_W - qrSize) / 2;
  const qrY = 140;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.05)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  ctx.restore();

  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  const faviconDiam = 60;
  const faviconCx = STICKER_W / 2;
  const faviconCy = qrY + qrSize / 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(faviconCx, faviconCy, faviconDiam / 2 + 5, 0, Math.PI * 2);
  ctx.fill();
  drawFaviconIcon(
    ctx,
    faviconCx,
    faviconCy,
    faviconDiam,
    BRAND_GREEN,
    BRAND_DARK,
  );

  const bottomY = STICKER_H - 16;

  const logoSvgW = 535.3;
  const logoSvgH = 213.65;
  const textLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logoSvgW} ${logoSvgH}" width="${logoSvgW}" height="${logoSvgH}"><g fill="${BRAND_DARK}"><path d="M57.84,167.51c-.24.47-.48.93-.72,1.4h24.29c.45-.47.9-.93,1.35-1.4h-24.92Z"/><path d="M66.71,147.32h34.02c7.52-7.8,15.04-15.6,22.56-23.39-11.06,0-22.12,0-33.18,0,14.89-26.4,29.78-52.79,44.67-79.19-32.07,32.76-64.15,65.52-96.22,98.29,10.12,0,20.25,0,30.37,0-.74,1.43-1.47,2.86-2.21,4.29Z"/><path d="M63.5,151.89c-.66,1.28-1.32,2.57-1.98,3.85h32.07c1.24-1.28,2.48-2.57,3.71-3.85h-33.81Z"/><path d="M60.67,160.32c-.45.88-.9,1.75-1.35,2.63h28.18c.84-.88,1.69-1.75,2.53-2.63h-29.36Z"/><path d="M224.09,167.64c5.32-7.22,11.26-16.22,16.6-26.61,4.8-9.34,7.97-17.59,10.12-24.41,6.16,0,12.32,0,18.48,0-3.41,6.32-6.82,12.63-10.23,18.95,2.88.48,6.41.85,10.59.86,4.39.01,8.44-.37,11.89-.86,3.15-6.32,6.3-12.63,9.46-18.95,6.15,0,12.29,0,18.44,0-5.5,6.75-12.32,16.17-17.94,27.54-4.62,9.36-7.11,17.36-8.49,23.48-6.23,0-12.46,0-18.69,0,3.73-6.9,7.47-13.8,11.2-20.71-2.88-.46-6.36-.8-10.44-.82-4.43-.02-8.54.34-12.06.82-3.5,6.9-6.99,13.8-10.49,20.71h-18.44Z"/><path d="M421.11,155.2c-1.4,1.29-3.46,3.4-5.22,6.17-1.61,2.54-2.35,4.66-2.71,6.05-6.27.8-11.72,1.2-16.34,1.2-4.24,0-7.76-.21-11.74-1.51-2.28-.75-5.67-1.91-8.22-4.97-2.87-3.44-3.01-7.27-3.03-8.13-.08-4.29,1.7-8.03,2.89-10.47,1.43-2.93,5.25-10.5,14.45-17.24,6.05-4.43,11.59-6.43,14.81-7.56,8.05-2.83,14.03-2.97,19.08-3.08,3.76-.09,8.9.11,14.44,1.42-1.08,1.4-2.49,3.46-3.55,5.97-1.08,2.54-1.39,4.59-1.47,5.95-2.89-.7-5.28-1.17-7.15-1.42-1.73-.23-3.4-.41-5.38-.37-2.3.04-9.04.17-16.28,4.57-3.87,2.36-6.37,5.02-7.42,6.23-2.37,2.72-3.42,4.99-3.69,5.61-.46,1.05-2.61,5.89-.36,9.58,2.31,3.78,7.8,3.99,10.86,4.1,2.14.08,4.06-.13,6.58-.43,2.43-.29,5.58-.84,9.44-1.66Z"/><path d="M450.15,116.62c-1.74,6.22-4.46,13.85-8.82,22.55-5.75,11.48-12.52,21.17-18.27,28.47,6.13,0,12.27,0,18.4,0l11.93-23.1,15.16-27.92c-6.13,0-12.27,0-18.4,0Z"/><path d="M470.8,144.51l25.96-23.47h-18.63s-20.34,18.39-20.34,18.39c1.33,9.4.96,18.81,2.29,28.21h14.69c-1.32-7.71-2.65-15.42-3.97-23.13Z"/><path d="M178.4,104.18c4.74-7.41,9.6-15.91,13.99-25.3,1.95-4.17,3.63-8.15,5.08-11.9,1.43-3.63,2.86-7.25,4.29-10.88,5.51,0,11.02,0,16.52,0-2.86,4.39-5.89,9.35-8.9,14.79-2.08,3.77-5.53,10.05-9,18.3-1.85,4.41-3.74,9.44-5.42,14.98-5.53,0-11.05,0-16.58,0Z"/><path d="M252.66,92.45c-.74,1.68-1.73,3.65-3.06,5.84-1.33,2.18-2.7,4.09-3.95,5.68-5.58.75-10.43,1.13-14.55,1.13-3.78,0-6.91-.2-10.46-1.43-2.03-.71-5.05-1.8-7.34-4.68-2.57-3.25-2.75-6.87-2.73-7.66.07-2.94.92-6.22,2.53-9.86,1.06-2.4,3.01-6.65,7.56-11.47,1.21-1.27,5-5.13,10.89-8.49,3.29-1.87,5.9-2.83,7.51-3.42,7.27-2.64,12.8-2.81,16.97-2.9,3.36-.07,7.93.12,12.87,1.34-.94,1.2-2.25,3.08-3.2,5.4-1.06,2.59-1.23,4.62-1.22,5.83-2.58-.66-4.7-1.1-6.38-1.34-1.67-.23-3.27-.35-4.79-.35-2.09,0-5.44.11-9.78,1.9-1.32.55-5,2.1-8.7,5.53-3.57,3.3-5.19,6.51-5.84,8.03-.68,1.58-1.85,4.32-1.14,6.89.72,2.62,2.98,3.56,5.15,4.46,4.07,1.7,8.46,1.37,11.25,1.14,3.4-.29,6.35-.99,8.4-1.57Z"/><path d="M301.03,93.4c-1.83,3.48-3.67,7.07-5.51,10.78-5.96-.05-12.51-.07-19.64-.07l-16.2.04-5.24.04c7.51-14.99,15.02-29.99,22.53-44.98l1.34-3.1c13.68,0,27.35,0,41.03,0l-.59,1.16c-.15.28-.66,1.3-1.54,3.05l-1.91,3.83c-.41.82-.8,1.65-1.18,2.49-8.27-.04-16.54-.07-24.81-.11l-4.03,8.1c7.05-.05,14.09-.09,21.14-.14-1.58,3.01-3.39,6.59-5.45,10.74-7.07.06-14.14.12-21.21.18l-4.23,8.56"/><path d="M186.3,70.06c.21-1.69.53-4.18-.35-6.67-.69-1.95-1.92-3.35-3.28-4.36l-42.35,45.13c.47,0,.96,0,1.42.02,3.67.19,6.88-.1,9.2-.42,3.66-.5,6.82-.96,10.94-2.78.99-.44,3.49-1.6,6.45-3.65,6.04-4.19,9.4-8.93,11.35-11.73.69-1,2.64-3.88,4.27-7.66.75-1.73,1.92-4.5,2.35-7.87Z"/><path d="M175.77,56.26c-1.6-.26-3.76-.3-7.46-.38-6.7-.13-9.75.29-17.24.32-3.26.01-5.85-.05-7.38-.11-1.54,5.96-3.96,13.29-7.88,21.67-4.96,10.6-10.76,19.58-15.74,26.41,1.36-.03,2.72-.06,4.09-.08,2.28-.03,4.52-.03,6.75-.03l44.85-47.8Z"/><path d="M313.88,167.4l50-50.12s-.05-.02-.07-.02c-3.57-1.07-7.56-1.61-11.96-1.61-6.88,0-13.62,1.16-20.21,3.48-6.59,2.32-12.26,5.54-17,9.66-4.75,4.12-8.41,8.91-10.99,14.37-1.76,3.71-2.69,7.09-2.81,10.13-.12,3.04.81,5.8,2.79,8.28,1.98,2.48,4.84,4.27,8.58,5.38.55.16,1.1.31,1.67.45Z"/><path d="M375.08,130.53c-.06-3.06-1.07-5.77-3.01-8.13-.4-.48-.83-.93-1.3-1.35l-47.43,47.55c.48.01.97.02,1.47.02,4.71,0,9.51-.57,14.39-1.7,4.89-1.13,9.48-2.92,13.77-5.36,4.29-2.44,8.1-5.41,11.42-8.91,3.32-3.5,5.97-7.34,7.95-11.53,1.89-3.99,2.8-7.51,2.73-10.58Z"/><path d="M176.61,165.34c1.53-5.38,2.62-9.68,3.28-12.91,2.78,1.26,5.35,2.14,7.7,2.63,2.35.49,4.47.74,6.38.74,2.51,0,4.62-.32,6.33-.97,1.71-.64,2.79-1.6,3.24-2.86.15-.43.22-.84.22-1.23,0-.39-.12-.83-.35-1.33-.23-.49-.62-1.03-1.16-1.61l-5.94-6.21c-1.4-1.41-2.37-2.44-2.89-3.07-1.07-1.29-1.84-2.49-2.3-3.6-.46-1.11-.68-2.24-.66-3.39.02-1.15.25-2.37.71-3.65.54-1.54,1.39-3.05,2.53-4.53,1.14-1.48,2.56-2.86,4.25-4.15,1.69-1.29,3.73-2.4,6.1-3.33,2.37-.93,4.79-1.57,7.24-1.91,2.45-.34,4.92-.51,7.39-.51,4.86,0,9.99.49,15.36,1.48-.53,1.74-1,3.34-1.39,4.79-.4,1.45-1.03,3.99-1.88,7.63-2.32-.93-4.51-1.58-6.56-1.95-2.06-.37-3.88-.55-5.46-.55-2.24,0-4.24.37-5.98,1.1-1.74.73-2.8,1.64-3.19,2.73-.18.51-.24,1-.18,1.48.06.48.29,1.04.7,1.69.4.64.99,1.35,1.75,2.12.76.77,1.99,1.91,3.67,3.43l2.34,2.16c.69.66,1.4,1.45,2.13,2.39.73.93,1.33,1.86,1.78,2.76s.76,1.74.91,2.5c.15.76.19,1.52.12,2.29-.07.77-.26,1.6-.58,2.48-.8,2.27-2.19,4.44-4.16,6.49-1.97,2.06-4.32,3.75-7.06,5.07-2.74,1.33-5.57,2.25-8.48,2.78s-5.87.8-8.89.8c-4.66,0-10.34-.59-17.03-1.78Z"/></g></svg>`;
  const logoBlob = new Blob([textLogoSvg], { type: "image/svg+xml" });
  const logoBlobUrl = URL.createObjectURL(logoBlob);
  const logoImg = await loadImage(logoBlobUrl);
  URL.revokeObjectURL(logoBlobUrl);

  const logoDrawW = 140;
  const logoDrawH = logoDrawW * (logoSvgH / logoSvgW);
  const logoX = 14;
  const logoY = bottomY - logoDrawH + 6;
  ctx.drawImage(logoImg, logoX, logoY, logoDrawW, logoDrawH);

  ctx.fillStyle = BRAND_DARK;
  ctx.font = `italic 22px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("diceshock.com", STICKER_W - 14, bottomY);

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, STICKER_W - 1, STICKER_H - 1, R);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

function TableLinkDisplay({ code }: { code: string }) {
  const msg = useMsg();
  const url = `${window.location.origin}/t/${code}`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(url);
      msg.success("链接已复制");
    } catch {
      msg.error("没有剪贴板访问权限, 请查看你的浏览器设置");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="label text-sm font-semibold">营收链接</span>
      <div className="flex items-center gap-2 bg-base-200 rounded-lg px-4 py-2">
        <span className="font-mono text-sm truncate flex-1">{url}</span>
        <button
          type="button"
          className="btn btn-xs btn-ghost btn-square"
          onClick={handleCopy}
          title="复制链接"
        >
          <CopyIcon className="size-4" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-xs btn-ghost btn-square"
          title="新窗口打开"
        >
          <ArrowSquareOutIcon className="size-4" />
        </a>
      </div>
    </div>
  );
}

function QrCodeTab({
  table,
  editName,
  onEditName,
  onRegenerate,
}: {
  table: TableDetail;
  editName: string;
  onEditName: (name: string) => void;
  onRegenerate: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [stickerDataUrl, setStickerDataUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const displayName = editName || table.name;
  const safeFileName = displayName
    .replace(/[<>:"/\\|?*\s]+/g, "_")
    .replace(/^_+|_+$/g, "");

  useEffect(() => {
    let cancelled = false;
    renderStickerCanvas(table.code, displayName).then((canvas) => {
      if (!cancelled) setStickerDataUrl(canvas.toDataURL("image/png"));
    });
    return () => {
      cancelled = true;
    };
  }, [table.code, displayName]);

  const handleDownloadPng = async () => {
    const canvas = await renderStickerCanvas(table.code, displayName);
    const link = document.createElement("a");
    link.download = `diceshock-${safeFileName}-${table.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadPdf = async () => {
    const canvas = await renderStickerCanvas(table.code, displayName);
    const dataUrl = canvas.toDataURL("image/png");

    const pdfWidth = STICKER_W;
    const pdfHeight = STICKER_H;
    const margin = 40;
    const pageW = pdfWidth + margin * 2;
    const pageH = pdfHeight + margin * 2;

    let pdf = `%PDF-1.4\n`;
    const objects: string[] = [];
    let objCount = 0;
    const offsets: number[] = [];

    const addObj = (content: string) => {
      objCount++;
      offsets.push(pdf.length);
      pdf += `${objCount} 0 obj\n${content}\nendobj\n`;
      return objCount;
    };

    addObj(`<< /Type /Catalog /Pages 2 0 R >>`);
    addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
    addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>`,
    );

    const stream = `q ${pdfWidth} 0 0 ${pdfHeight} ${margin} ${margin} cm /Img Do Q`;
    addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    const raw = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const imgStream = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("");
    addObj(
      `<< /Type /XObject /Subtype /Image /Width ${STICKER_W} /Height ${STICKER_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgStream.length} >>`,
    );

    const jpegCanvas = await renderStickerCanvas(table.code, displayName);
    const jpegBlob = await new Promise<Blob>((resolve) =>
      jpegCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95),
    );
    const jpegArr = new Uint8Array(await jpegBlob.arrayBuffer());

    let pdfBinary = `%PDF-1.4\n`;
    const binOffsets: number[] = [];
    let binObjCount = 0;

    const addBinObj = (content: Uint8Array | string) => {
      binObjCount++;
      binOffsets.push(pdfBinary.length);
      if (typeof content === "string") {
        pdfBinary += `${binObjCount} 0 obj\n${content}\nendobj\n`;
      }
      return binObjCount;
    };

    addBinObj(`<< /Type /Catalog /Pages 2 0 R >>`);
    addBinObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
    addBinObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>`,
    );
    addBinObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${STICKER_W} /Height ${STICKER_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegArr.length} >>\nstream\n`;
    const imgFooter = `\nendstream\nendobj\n`;

    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(pdfBinary + imgHeader);
    const footerBytes = encoder.encode(imgFooter);

    const xrefStart = headerBytes.length + jpegArr.length + footerBytes.length;
    binOffsets.push(pdfBinary.length);

    const xref = `xref\n0 ${binObjCount + 2}\n0000000000 65535 f \n${binOffsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}\ntrailer\n<< /Size ${binObjCount + 2} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const xrefBytes = encoder.encode(xref);

    const finalPdf = new Uint8Array(
      headerBytes.length +
        jpegArr.length +
        footerBytes.length +
        xrefBytes.length,
    );
    finalPdf.set(headerBytes, 0);
    finalPdf.set(jpegArr, headerBytes.length);
    finalPdf.set(footerBytes, headerBytes.length + jpegArr.length);
    finalPdf.set(
      xrefBytes,
      headerBytes.length + jpegArr.length + footerBytes.length,
    );

    const blob = new Blob([finalPdf], { type: "application/pdf" });
    const link = document.createElement("a");
    link.download = `diceshock-${safeFileName}-${table.code}.pdf`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="label text-sm font-semibold">桌台名称</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          placeholder="桌台名称"
          maxLength={50}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="label text-sm font-semibold">当前编号</span>
        <p className="font-mono text-sm bg-base-200 rounded-lg px-4 py-2">
          {table.code}
        </p>
      </div>

      <TableLinkDisplay code={table.code} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label text-sm font-semibold">贴纸预览</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={zoomOut}
              disabled={zoom <= 0.25}
            >
              <MagnifyingGlassMinus className="size-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={zoomIn}
              disabled={zoom >= 3}
            >
              <MagnifyingGlassPlus className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={previewRef}
          className="border border-base-300 rounded-lg bg-base-200/50 overflow-auto"
          style={{ height: "500px" }}
        >
          <div
            className="flex items-center justify-center p-8"
            style={{ minHeight: "100%", minWidth: "100%" }}
          >
            {stickerDataUrl ? (
              <img
                src={stickerDataUrl}
                alt="贴纸预览"
                style={{
                  width: `${STICKER_W * zoom * 0.5}px`,
                  height: `${STICKER_H * zoom * 0.5}px`,
                  imageRendering: zoom > 1.5 ? "pixelated" : "auto",
                }}
                className="shadow-2xl rounded-lg"
                draggable={false}
              />
            ) : (
              <span className="loading loading-spinner loading-md" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-center">
        <button
          type="button"
          className="btn btn-sm btn-neutral"
          onClick={onRegenerate}
        >
          <ArrowCounterClockwiseIcon className="size-4" />
          重新生成编号
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => void handleDownloadPng()}
        >
          <DownloadSimpleIcon className="size-4" />
          下载 PNG
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => void handleDownloadPdf()}
        >
          <DownloadSimpleIcon className="size-4" />
          下载 PDF
        </button>
      </div>
    </div>
  );
}
