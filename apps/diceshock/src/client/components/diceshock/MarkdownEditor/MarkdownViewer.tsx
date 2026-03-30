import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

type MarkdownViewerProps = {
  content: string;
  className?: string;
};

const components = {
  img: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt="" />
  ),
};

export default function MarkdownViewer({
  content,
  className,
}: MarkdownViewerProps) {
  return (
    <div className={className}>
      <div className="mdx-content">
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
}
