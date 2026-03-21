import {
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react/dist/ssr";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { useCallback, useRef } from "react";
import { BoardGameCard } from "./BoardGameCardExtension";

function parseContent(content?: string) {
  if (!content) return undefined;
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

type TiptapEditorProps = {
  content?: string;
  onChange?: (json: string) => void;
  placeholder?: string;
  onInsertBoardGame?: () => void;
};

export default function TiptapEditor({
  content,
  onChange,
  placeholder = "描述你的约局...",
  onInsertBoardGame,
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Underline,
      BoardGameCard,
    ],
    content: parseContent(content),
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange?.(JSON.stringify(e.getJSON()));
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-content prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-base-300 bg-base-200/50">
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <TextHTwoIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextBIcon className="size-4" weight="bold" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalicIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <TextUnderlineIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <TextStrikethroughIcon className="size-4" />
        </ToolbarBtn>

        <div className="w-px bg-base-300 mx-1" />

        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListBulletsIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbersIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuotesIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeIcon className="size-4" />
        </ToolbarBtn>

        <div className="w-px bg-base-300 mx-1" />

        <ToolbarBtn active={false} onClick={handleImageUpload}>
          <ImageIcon className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("链接地址");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon className="size-4" />
        </ToolbarBtn>
        {onInsertBoardGame && (
          <ToolbarBtn active={false} onClick={onInsertBoardGame}>
            <span className="text-xs font-semibold px-1">🎲</span>
          </ToolbarBtn>
        )}
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "btn btn-ghost btn-xs btn-square",
        active && "bg-primary/20 text-primary",
      )}
    >
      {children}
    </button>
  );
}
