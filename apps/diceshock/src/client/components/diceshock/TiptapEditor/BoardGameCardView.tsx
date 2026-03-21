import { GameControllerIcon, StarIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

export default function BoardGameCardView({ node }: ReactNodeViewProps) {
  const { gameName, playerNum, rating } = node.attrs as {
    gameName: string;
    playerNum?: string;
    rating?: number;
  };

  return (
    <NodeViewWrapper className="not-prose my-2">
      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-lg">
        <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
          <GameControllerIcon className="size-5 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm truncate">{gameName}</span>
          <div className="flex items-center gap-2 text-xs text-base-content/60">
            {playerNum && <span>{playerNum}人</span>}
            {rating != null && (
              <span className="flex items-center gap-0.5">
                <StarIcon className="size-3" weight="fill" />
                {Number(rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
