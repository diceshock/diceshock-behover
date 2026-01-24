import { useEffect, useRef, useState } from "react";

export type EmojiPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = [
    "🏷️",
    "📝",
    "📌",
    "⭐",
    "🔥",
    "💡",
    "🎯",
    "✅",
    "❌",
    "⚠️",
    "📅",
    "📊",
    "📈",
    "📉",
    "🎉",
    "🎊",
    "🎁",
    "🎈",
    "🎀",
    "🎪",
    "🏠",
    "🏢",
    "🏫",
    "🏥",
    "🏪",
    "🏨",
    "🏰",
    "⛪",
    "🕌",
    "🕍",
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "🥳",
    "🤗",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
  ];

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = evt.target.value;
    if (selectedValue && selectedValue !== "") {
      onChange(selectedValue);
      setInputValue(selectedValue);
      if (selectRef.current) {
        selectRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative flex gap-1">
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered input-sm w-20"
        placeholder="Emoji"
        value={inputValue}
        onChange={handleInputChange}
      />
      <select
        ref={selectRef}
        defaultValue=""
        className="select select-bordered select-sm w-20"
        onChange={handleSelectChange}
      >
        <option value="" disabled>
          😀
        </option>
        {commonEmojis.map((emoji, idx) => (
          <option key={idx} value={emoji}>
            {emoji}
          </option>
        ))}
      </select>
    </div>
  );
}
