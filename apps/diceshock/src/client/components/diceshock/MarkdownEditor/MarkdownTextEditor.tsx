import { EyeIcon, PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownTextEditorProps = {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function MarkdownTextEditor({
  content,
  onChange,
  placeholder = "输入 Markdown 内容...",
}: MarkdownTextEditorProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 bg-base-200 border-b border-base-300">
        <button
          type="button"
          className={`btn btn-xs gap-1 ${tab === "edit" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("edit")}
        >
          <PencilSimpleIcon className="size-3.5" />
          编辑
        </button>
        <button
          type="button"
          className={`btn btn-xs gap-1 ${tab === "preview" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("preview")}
        >
          <EyeIcon className="size-3.5" />
          预览
        </button>
      </div>

      {tab === "edit" ? (
        <textarea
          className="w-full min-h-[16rem] p-4 bg-transparent resize-y outline-none font-mono text-sm leading-relaxed"
          placeholder={placeholder}
          value={content}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="p-4 min-h-[16rem]">
          {content.trim() ? (
            <div className="mdx-content">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          ) : (
            <p className="text-base-content/40 text-sm">暂无内容</p>
          )}
        </div>
      )}
    </div>
  );
}
