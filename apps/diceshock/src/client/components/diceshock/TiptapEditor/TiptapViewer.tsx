import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { BoardGameCard } from "./BoardGameCardExtension";

function parseContent(content?: string) {
  if (!content) return undefined;
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

type TiptapViewerProps = {
  content: string;
  className?: string;
};

export default function TiptapViewer({
  content,
  className,
}: TiptapViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: true }),
      Underline,
      BoardGameCard,
    ],
    content: parseContent(content),
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `tiptap-content prose prose-sm max-w-none ${className ?? ""}`,
      },
      handleClickOn(_view, _pos, node, _nodePos, event) {
        if (node.type.name === "image") {
          const src = node.attrs.src as string;
          if (src) {
            event.preventDefault();
            setLightboxSrc(src);
            return true;
          }
        }
        return false;
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement;
        if (target.tagName === "IMG") {
          const src = (target as HTMLImageElement).src;
          if (src) {
            event.preventDefault();
            setLightboxSrc(src);
            return true;
          }
        }
        return false;
      },
    },
  });

  if (!editor) return null;

  return (
    <>
      <EditorContent editor={editor} />
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
