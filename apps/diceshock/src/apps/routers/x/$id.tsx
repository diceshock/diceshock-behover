import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
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
          const body = await res.json().catch(() => ({ error: "unknown" }));
          setState({ status: "error", code: (body as any).error ?? "unknown" });
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
      <div className="flex items-center justify-center min-h-screen">
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

  return <ReferenceContent data={state.data} />;
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
          <article
            key={i}
            id={`ref-${i}`}
            className="border border-base-300 rounded-xl p-5 scroll-mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-base-content/50">
                {ref.source || `来源 ${i + 1}`}
              </span>
              <span className="badge badge-xs badge-outline">
                相关度 {Math.round(ref.score * 100)}%
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {ref.text}
              </ReactMarkdown>
            </div>
          </article>
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
