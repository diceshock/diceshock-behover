import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import type React from "react";
import { useMsg } from "@/client/components/diceshock/Msg";

const CopyItem: React.FC<{ tx: string }> = ({ tx }) => {
  const msg = useMsg();

  return (
    <div className="mt-2 border border-base-300 rounded-xl shadow-inner py-1 pr-1 pl-4 flex justify-between items-center">
      <span>{tx}</span>
      <button
        type="button"
        onClick={() => {
          try {
            navigator.clipboard.writeText(tx);
            msg.success("复制成功");
          } catch {
            msg.error("没有剪贴板访问权限, 请查看你的浏览器设置");
          }
        }}
        className="btn btn-sm btn-square btn-ghost"
      >
        <CopyIcon size={32} />
      </button>
    </div>
  );
};

export default CopyItem;
