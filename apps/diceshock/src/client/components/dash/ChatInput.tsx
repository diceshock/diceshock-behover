import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { type FormEvent, type KeyboardEvent, useCallback, useRef } from "react";

type ChatInputProps = {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
};

export default function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          formRef.current?.requestSubmit();
        }
      }
    },
    [input, isLoading],
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex items-end gap-2 p-3 border-t border-base-content/10"
    >
      <textarea
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="输入消息..."
        rows={1}
        className={clsx(
          "textarea textarea-bordered textarea-sm flex-1 min-h-[2.5rem] max-h-24 resize-none",
          "leading-snug py-2",
        )}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="btn btn-primary btn-sm btn-square shrink-0"
      >
        <PaperPlaneRightIcon className="size-4" weight="bold" />
      </button>
    </form>
  );
}
