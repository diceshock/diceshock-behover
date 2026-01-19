import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useState } from "react";
import Modal from "../../modal";
import { themeA } from "../../ThemeSwap";

export default function LoginDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const theme = useAtomValue(themeA);

  const [activeTab, setActiveTab] = useState<"phonenumber" | "thirdparty">(
    "phonenumber",
  );

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) onClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
          "border border-base-content/30",
        )}
      >
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle absolute top-4 right-4"
        >
          <XIcon className="size-4" weight="bold" />
        </button>

        <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
          登录/注册
        </h3>

        <div role="tablist" className="tabs tabs-border ml-4">
          <button
            role="tab"
            className={clsx("tab", activeTab === "phonenumber" && "tab-active")}
            onClick={() => setActiveTab("phonenumber")}
          >
            手机登录
          </button>
          <button
            role="tab"
            className={clsx("tab", activeTab === "thirdparty" && "tab-active")}
            onClick={() => setActiveTab("thirdparty")}
          >
            第三方登录
          </button>
        </div>

        <div
          className="cf-turnstile"
          data-sitekey="0x4AAAAAACNaVUPcjZJ2BWv-"
          data-theme={theme === "dark" ? "dark" : "light"}
          data-size="normal"
        ></div>
      </div>
    </Modal>
  );
}
