import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useState } from "react";
import { Markdown } from "tiptap-markdown";

type MarkdownViewerProps = {
  content: string;
  className?: string;
};

export default function MarkdownViewer({
  content,
  className,
}: MarkdownViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: true }),
      Image,
      Underline,
      Markdown.configure({ html: false }),
    ],
    content,
    editable: false,
  });

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

  if (!editor) return null;

  return (
    <>
      <div
        className={className}
        onClick={handleClick}
        onKeyDown={undefined}
        role="presentation"
      >
        <EditorContent editor={editor} className="mdx-content" />
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
