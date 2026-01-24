import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useMemo, useRef, useState } from "react";

export type EmojiPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const commonEmojis = [
  // 骰子和游戏核心
  "🎲",
  "🎯",
  "🎪",
  "🎮",
  "🎰",
  "🎭",
  "🎨",
  // 卡片和麻将
  "🃏",
  "🎴",
  "🀄",
  // 武器和战斗
  "⚔️",
  "🗡️",
  "🛡️",
  "🏹",
  "💣",
  "🔫",
  "🏴‍☠️",
  "⚡",
  // 魔法和神秘
  "✨",
  "🔮",
  "🪄",
  "⭐",
  "🌟",
  "💫",
  "🌙",
  "☀️",
  "🔥",
  "💧",
  "🌊",
  "🌈",
  // 角色扮演 - 职业
  "🧙",
  "🧙‍♀️",
  "🧙‍♂️",
  "🧝",
  "🧝‍♀️",
  "🧝‍♂️",
  "🧚",
  "🧚‍♀️",
  "🧚‍♂️",
  "🧛",
  "🧛‍♀️",
  "🧛‍♂️",
  "🧟",
  "🧟‍♀️",
  "🧟‍♂️",
  "🧞",
  "🧞‍♀️",
  "🧞‍♂️",
  "🧜",
  "🧜‍♀️",
  "🧜‍♂️",
  // 神话生物和建筑
  "🐉",
  "🐲",
  "🦄",
  "👑",
  "🏰",
  "🗼",
  "⛩️",
  // 火箭和科技
  "🚀",
  "🛸",
  "👾",
  "🤖",
  "🦾",
  "🦿",
  // 棋类和策略
  "♟️",
  "♞",
  "♝",
  "♜",
  "♛",
  "♚",
  // 表情和状态
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "🤣",
  "😂",
  "🥳",
  "🤩",
  "😎",
  "🤔",
  "😏",
  "😤",
  "😠",
  "😡",
  "🤬",
  "😱",
  "😨",
  "😰",
  "😢",
  "😭",
  "🥺",
  "😴",
  "🤤",
  "😋",
  "🤗",
  // 手势
  "🤝",
  "👍",
  "👎",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "👊",
  "✊",
  "🤛",
  "🤜",
  "👏",
  "🙌",
  "👐",
  "🤲",
  "🙏",
  // 常用符号
  "✅",
  "❌",
  "⚠️",
  "💡",
  "🏷️",
  "📝",
  "📌",
  "📅",
  "📊",
  "📈",
  "📉",
  "🎉",
  "🎊",
  "🎁",
  "🎈",
  "🎀",
];

// 为每个 emoji 创建搜索关键词映射
const emojiKeywords: Record<string, string[]> = {
  "🎲": ["骰子", "dice", "游戏", "随机"],
  "🎯": ["靶子", "目标", "dart", "游戏"],
  "🎪": ["马戏团", "circus", "娱乐"],
  "🎮": ["游戏", "game", "手柄", "控制器"],
  "🎰": ["老虎机", "slot", "机器"],
  "🎭": ["戏剧", "theater", "面具"],
  "🎨": ["艺术", "art", "画笔"],
  "🃏": ["小丑", "joker", "卡牌"],
  "🎴": ["花牌", "card", "卡牌"],
  "🀄": ["麻将", "mahjong", "麻将牌"],
  "⚔️": ["剑", "sword", "武器", "战斗"],
  "🗡️": ["匕首", "dagger", "武器"],
  "🛡️": ["盾牌", "shield", "防御"],
  "🏹": ["弓箭", "bow", "arrow", "武器"],
  "💣": ["炸弹", "bomb", "爆炸"],
  "🔫": ["枪", "gun", "武器"],
  "🏴‍☠️": ["海盗", "pirate", "旗帜"],
  "✨": ["星星", "sparkle", "闪光", "魔法"],
  "🔮": ["水晶球", "crystal", "魔法"],
  "🪄": ["魔法棒", "wand", "魔法"],
  "⭐": ["星星", "star", "星级"],
  "🌟": ["闪星", "glowing", "星星"],
  "💫": ["流星", "dizzy", "星星"],
  "🌙": ["月亮", "moon", "夜晚"],
  "☀️": ["太阳", "sun", "白天"],
  "🔥": ["火", "fire", "火焰"],
  "💧": ["水滴", "water", "雨"],
  "🌊": ["波浪", "wave", "水"],
  "⚡": ["闪电", "lightning", "电"],
  "🌈": ["彩虹", "rainbow", "颜色"],
  "🧙": ["巫师", "wizard", "魔法师"],
  "🧙‍♀️": ["女巫", "witch", "魔法"],
  "🧙‍♂️": ["男巫", "wizard", "魔法"],
  "🧝": ["精灵", "elf", "角色"],
  "🧝‍♀️": ["女精灵", "elf", "角色"],
  "🧝‍♂️": ["男精灵", "elf", "角色"],
  "🧚": ["仙女", "fairy", "魔法"],
  "🧚‍♀️": ["女仙女", "fairy", "魔法"],
  "🧚‍♂️": ["男仙女", "fairy", "魔法"],
  "🧛": ["吸血鬼", "vampire", "角色"],
  "🧛‍♀️": ["女吸血鬼", "vampire", "角色"],
  "🧛‍♂️": ["男吸血鬼", "vampire", "角色"],
  "🧟": ["僵尸", "zombie", "不死"],
  "🧟‍♀️": ["女僵尸", "zombie", "不死"],
  "🧟‍♂️": ["男僵尸", "zombie", "不死"],
  "🧞": ["精灵", "genie", "魔法"],
  "🧞‍♀️": ["女精灵", "genie", "魔法"],
  "🧞‍♂️": ["男精灵", "genie", "魔法"],
  "🧜": ["人鱼", "mermaid", "海洋"],
  "🧜‍♀️": ["美人鱼", "mermaid", "海洋"],
  "🧜‍♂️": ["男人鱼", "merman", "海洋"],
  "🐉": ["龙", "dragon", "神话"],
  "🐲": ["龙", "dragon", "神话"],
  "🦄": ["独角兽", "unicorn", "神话"],
  "👑": ["皇冠", "crown", "国王"],
  "🏰": ["城堡", "castle", "建筑"],
  "🗼": ["塔", "tower", "建筑"],
  "⛩️": ["神社", "shrine", "建筑"],
  "🚀": ["火箭", "rocket", "太空"],
  "🛸": ["UFO", "飞碟", "太空"],
  "👾": ["外星人", "alien", "游戏"],
  "🤖": ["机器人", "robot", "科技"],
  "🦾": ["机械臂", "mechanical", "科技"],
  "🦿": ["机械腿", "mechanical", "科技"],
  "♟️": ["兵", "pawn", "国际象棋"],
  "♞": ["马", "knight", "国际象棋"],
  "♝": ["象", "bishop", "国际象棋"],
  "♜": ["车", "rook", "国际象棋"],
  "♛": ["后", "queen", "国际象棋"],
  "♚": ["王", "king", "国际象棋"],
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 过滤 emoji 列表
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return commonEmojis;
    }

    const query = searchQuery.toLowerCase().trim();
    return commonEmojis.filter((emoji) => {
      // 直接匹配 emoji
      if (emoji.includes(query)) {
        return true;
      }

      // 通过关键词搜索
      const keywords = emojiKeywords[emoji] || [];
      return keywords.some((keyword) => keyword.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
        setSearchQuery("");
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showPicker]);

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleEmojiClick = (emoji: string) => {
    onChange(emoji);
    setInputValue(emoji);
    setShowPicker(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          ref={inputRef}
          type="text"
          className="input input-bordered input-sm w-20"
          placeholder="Emoji"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowPicker(true)}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setShowPicker(!showPicker)}
        >
          <MagnifyingGlassIcon className="size-4" />
        </button>
      </div>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2"
          style={{ width: "300px", maxHeight: "400px" }}
        >
          <div className="mb-2">
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              placeholder="搜索图标..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-8 gap-1 overflow-y-auto max-h-80">
            {filteredEmojis.length === 0 ? (
              <div className="col-span-8 text-center text-sm text-base-content/60 py-4">
                未找到匹配的图标
              </div>
            ) : (
              filteredEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-sm btn-ghost p-1 min-h-0 h-auto aspect-square text-2xl hover:bg-base-200"
                  onClick={() => handleEmojiClick(emoji)}
                  title={emojiKeywords[emoji]?.join(", ") || emoji}
                >
                  {emoji}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
