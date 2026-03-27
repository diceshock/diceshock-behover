import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  headingsPlugin,
  InsertImage,
  InsertThematicBreak,
  imagePlugin,
  ListsToggle,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

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
  return (
    <MDXEditor
      className="dark-theme"
      contentEditableClassName="mdx-content"
      markdown={content ?? ""}
      onChange={(val) => onChange?.(val ?? "")}
      placeholder={placeholder}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        imagePlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertThematicBreak />
            </>
          ),
        }),
      ]}
    />
  );
}
