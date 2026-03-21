import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BoardGameCardView from "./BoardGameCardView";

export interface BoardGameCardAttrs {
  gameId: string;
  gameName: string;
  playerNum?: string;
  rating?: number;
}

export const BoardGameCard = Node.create({
  name: "boardGameCard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      gameId: { default: "" },
      gameName: { default: "" },
      playerNum: { default: null },
      rating: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="board-game-card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "board-game-card" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardGameCardView);
  },
});
