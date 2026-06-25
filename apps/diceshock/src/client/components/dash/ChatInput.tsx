import { PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { type FormEvent, type KeyboardEvent, useCallback, useRef } from "react";
import { selectedTableDataAtom, selectionClearSignalAtom } from "./chatAtoms";

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
  const [selectedData, setSelectedData] = useAtom(selectedTableDataAtom);
  const setClearSignal = useSetAtom(selectionClearSignalAtom);

  const clearSelection = useCallback(() => {
    setSelectedData({ count: 0, entityType: "", rows: [] });
    setClearSignal((value) => value + 1);
  }, [setSelectedData, setClearSignal]);

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
      className="flex flex-col gap-2 p-3 border-t border-base-content/10"
    >
      {selectedData.count > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-xs">
          <span>
            已选 {selectedData.count} 条{selectedData.entityType}数据
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
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
      </div>
    </form>
  );
}
