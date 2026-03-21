import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
