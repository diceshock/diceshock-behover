import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  QuotesIcon,
  TextBolderIcon,
  TextHOneIcon,
  TextHThreeIcon,
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
import { useCallback, useRef } from "react";
import { Markdown } from "tiptap-markdown";

type MarkdownEditorProps = {
  content?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export default function MarkdownEditor({
  content,
  onChange,
  placeholder = "描述你的约局...",
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      Underline,
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content,
    onUpdate: ({ editor }) => {
      // biome-ignore lint: tiptap-markdown extends editor.storage at runtime
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      onChangeRef.current?.(md);
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("链接地址", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("图片地址");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-wrapper">
      <div className="tiptap-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销"
        >
          <ArrowUUpLeftIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做"
        >
          <ArrowUUpRightIcon size={16} />
        </button>

        <span className="tiptap-separator" />

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "is-active" : ""
          }
          title="标题1"
        >
          <TextHOneIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }
          title="标题2"
        >
          <TextHTwoIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={
            editor.isActive("heading", { level: 3 }) ? "is-active" : ""
          }
          title="标题3"
        >
          <TextHThreeIcon size={16} />
        </button>

        <span className="tiptap-separator" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="粗体"
        >
          <TextBolderIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="斜体"
        >
          <TextItalicIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "is-active" : ""}
          title="下划线"
        >
          <TextUnderlineIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="删除线"
        >
          <TextStrikethroughIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "is-active" : ""}
          title="行内代码"
        >
          <CodeIcon size={16} />
        </button>

        <span className="tiptap-separator" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
          title="无序列表"
        >
          <ListBulletsIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
          title="有序列表"
        >
          <ListNumbersIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
          title="引用"
        >
          <QuotesIcon size={16} />
        </button>

        <span className="tiptap-separator" />

        <button type="button" onClick={setLink} title="链接">
          <LinkIcon size={16} />
        </button>
        <button type="button" onClick={addImage} title="图片">
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          <MinusIcon size={16} />
        </button>
      </div>

      <EditorContent editor={editor} className="mdx-content" />
    </div>
  );
}
