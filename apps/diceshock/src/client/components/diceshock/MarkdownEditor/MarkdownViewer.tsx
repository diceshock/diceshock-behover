import { useCallback, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownViewerProps = {
  content: string;
  className?: string;
};

export default function MarkdownViewer({
  content,
  className,
}: MarkdownViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        setLightboxSrc(src);
      }
    }
  }, []);

  return (
    <>
      <div
        className={className}
        onClick={handleClick}
        onKeyDown={undefined}
        role="presentation"
      >
        <div className="mdx-content">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>
      {lightboxSrc && (
        <dialog
          className="modal modal-open"
          onClick={() => setLightboxSrc(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxSrc(null)}
        >
          <div className="modal-box max-w-[90vw] w-fit p-2 bg-base-200">
            <img
              src={lightboxSrc}
              alt=""
              className="max-h-[85vh] max-w-full object-contain rounded"
            />
          </div>
          <form method="dialog" className="modal-backdrop bg-black/70">
            <button type="button" onClick={() => setLightboxSrc(null)}>
              close
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
