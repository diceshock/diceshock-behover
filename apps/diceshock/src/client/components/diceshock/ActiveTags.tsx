type TagTitle = { emoji: string; tx: string } | null | undefined;

const tagTitle = (tag?: TagTitle) => ({
  emoji: tag?.emoji ?? "🏷️",
  tx: tag?.tx ?? "未命名",
});

type TagMapping = {
  tag_id: string;
  tag?: {
    id?: string;
    title?: TagTitle;
    keywords?: string | null;
    is_pinned?: boolean | null;
  } | null;
};

type ActiveTagsProps = {
  tags?: TagMapping[] | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  maxTags?: number;
};

export function ActiveTags({
  tags,
  size = "sm",
  className = "",
  maxTags,
}: ActiveTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const sizeClass = {
    sm: "badge-sm",
    md: "badge-md",
    lg: "badge-lg",
  }[size];

  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;

  return (
    <>
      {displayTags.map((tagMapping) => {
        const tag = tagMapping.tag;
        if (!tag) return null;
        const title = tagTitle(tag.title);
        return (
          <span
            key={tagMapping.tag_id}
            className={`badge shrink-0 text-nowrap ${sizeClass} gap-1 badge-neutral inline-flex items-center whitespace-nowrap ${className}`}
          >
            <span>{title.emoji}</span>
            {title.tx}
          </span>
        );
      })}
    </>
  );
}
