import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReferencePageData } from "@/server/apis/shortlink";

export const Route = createFileRoute("/x/$id")({
  component: ReferencePage,
});

type FetchState =
  | { status: "loading" }
  | { status: "error"; code: string }
  | { status: "ok"; data: ReferencePageData };

function ReferencePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    fetch(`/edge/shortlink/${id}/data`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res
            .json()
            .catch(() => ({ error: "unknown" }))) as { error?: string };
          setState({ status: "error", code: body.error ?? "unknown" });
          return;
        }
        const data = (await res.json()) as ReferencePageData;
        setState({ status: "ok", data });
      })
      .catch(() => {
        setState({ status: "error", code: "network" });
      });
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (state.status === "error") {
    if (state.code === "expired") {
      return <ExpiredView />;
    }
    return <NotFoundView />;
  }

  return (
    <div className="min-h-screen bg-base-100">
      <ReferenceContent data={state.data} />
    </div>
  );
}

function ReferenceContent({ data }: { data: ReferencePageData }) {
  const toc = useMemo(() => buildToc(data), [data]);
  const expiresLabel = useMemo(() => {
    const remaining = data.expiresAt - Date.now();
    if (remaining <= 0) return "已过期";
    const hours = Math.floor(remaining / 3600000);
    if (hours >= 1) return `${hours} 小时后过期`;
    const minutes = Math.floor(remaining / 60000);
    return `${minutes} 分钟后过期`;
  }, [data.expiresAt]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-base-content/50 font-mono">
            DiceShock AI 引用页
          </span>
          <span className="badge badge-sm badge-ghost">{expiresLabel}</span>
        </div>
        <h1 className="text-xl font-bold mb-3">{data.userQuery}</h1>
      </header>

      <section className="bg-base-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-base-content/60 mb-3">
          AI 回复
        </h2>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {data.agentReply}
        </div>
      </section>

      {toc.length > 1 && (
        <nav className="mb-8 bg-base-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-2">
            引用目录
          </h3>
          <ul className="flex flex-col gap-1">
            {toc.map((item, i) => (
              <li key={i}>
                <a
                  href={`#ref-${i}`}
                  className="text-sm text-primary hover:underline"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-bold">参考资料</h2>
        {data.references.map((ref, i) => (
          <ReferenceCard key={i} ref_={ref} index={i} />
        ))}
      </section>

      <footer className="mt-12 pt-6 border-t border-base-300 text-center text-xs text-base-content/40">
        由 DiceShock AI 助手生成 · 内容来自知识库检索 ·{" "}
        {new Date(data.createdAt).toLocaleString("zh-CN")}
      </footer>
    </div>
  );
}

function buildToc(data: ReferencePageData): string[] {
  return data.references.map((ref, i) => ref.source || `参考资料 ${i + 1}`);
}

type ReferenceRef = ReferencePageData["references"][number];

function ReferenceCard({
  ref_,
  index,
}: {
  ref_: ReferenceRef;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasIframe = !!ref_.originalUrl;
  const label = ref_.source || `来源 ${index + 1}`;

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  return (
    <article
      id={`ref-${index}`}
      className="border border-base-300 rounded-xl overflow-hidden scroll-mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/50">
        <span className="text-xs font-mono text-base-content/50 truncate">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="badge badge-xs badge-outline">
            相关度 {Math.round(ref_.score * 100)}%
          </span>
          {hasIframe && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={toggleExpanded}
            >
              {expanded ? "收起" : "展开"}
            </button>
          )}
        </div>
      </div>

      {/* Body: iframe or fallback text */}
      {hasIframe ? (
        <>
          {expanded && (
            <div className="w-full h-[70vh] min-h-[400px]">
              <iframe
                src={ref_.originalUrl!}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                title={label}
              />
            </div>
          )}
          <div className="px-4 py-3 border-t border-base-300 bg-base-200/30">
            <a
              href={ref_.originalUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm btn-outline gap-1"
            >
              在原站查看 ↗
            </a>
          </div>
        </>
      ) : (
        <div className="p-4 text-sm whitespace-pre-wrap text-base-content/80">
          {ref_.text}
        </div>
      )}
    </article>
  );
}

function ExpiredView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="text-6xl">⏰</div>
      <h1 className="text-xl font-bold">引用页已过期</h1>
      <p className="text-base-content/60 text-center max-w-sm">
        此引用页已超过 72 小时有效期，内容已被清理。
      </p>
      <a href="/" className="btn btn-primary btn-sm">
        返回主页
      </a>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="text-6xl">🔗</div>
      <h1 className="text-xl font-bold">页面不存在</h1>
      <p className="text-base-content/60 text-center max-w-sm">
        此链接不存在或已被删除。
      </p>
      <a href="/" className="btn btn-primary btn-sm">
        返回主页
      </a>
    </div>
  );
}
