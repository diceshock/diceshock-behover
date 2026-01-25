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
    order?: number | null; // 标签顺序，用于排序
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

  // 对标签进行排序：置顶的在前，然后按 order 排序
  const sortedTags = [...tags].sort((a, b) => {
    const tagA = a.tag;
    const tagB = b.tag;
    
    // 如果标签不存在，排到最后
    if (!tagA && !tagB) return 0;
    if (!tagA) return 1;
    if (!tagB) return -1;
    
    // 置顶标签排在前面
    if (tagA.is_pinned && !tagB.is_pinned) return -1;
    if (!tagA.is_pinned && tagB.is_pinned) return 1;
    
    // 对于相同置顶状态的标签，按 order 排序
    const orderA =
      tagA.order !== null && tagA.order !== undefined
        ? tagA.order
        : Number.MAX_SAFE_INTEGER;
    const orderB =
      tagB.order !== null && tagB.order !== undefined
        ? tagB.order
        : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    
    // 如果 order 相同，按 id 排序
    return (tagA.id || "").localeCompare(tagB.id || "");
  });

  const displayTags = maxTags ? sortedTags.slice(0, maxTags) : sortedTags;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayTags.map((tagMapping) => {
        const tag = tagMapping.tag;
        if (!tag) return null;
        const title = tagTitle(tag.title);
        return (
          <span
            key={tagMapping.tag_id}
            className={`badge shrink-0 text-nowrap ${sizeClass} gap-1 badge-neutral inline-flex items-center whitespace-nowrap`}
          >
            <span>{title.emoji}</span>
            {title.tx}
          </span>
        );
      })}
    </div>
  );
}
