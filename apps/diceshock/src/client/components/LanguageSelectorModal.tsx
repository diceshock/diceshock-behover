import { CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";
import { LOCALES, type LocaleCode } from "@/shared/store-locale";
import Modal from "./modal";

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocale: LocaleCode;
  onSelect: (locale: LocaleCode) => void;
}

export default function LanguageSelectorModal({
  isOpen,
  onClose,
  currentLocale,
  onSelect,
}: LanguageSelectorModalProps) {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (locale: LocaleCode) => {
      onSelect(locale);
      onClose();
    },
    [onSelect, onClose],
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
          "modal-box max-w-none md:max-w-96 min-h-48 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-hidden",
          "border border-base-content/30",
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-base font-bold">
            {t("me.preferredLang") || "选择语言"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle"
          >
            <XIcon className="size-4" weight="bold" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 px-3 pb-2 overflow-y-auto">
          {(Object.values(LOCALES) as Array<(typeof LOCALES)[LocaleCode]>).map(
            (entry) => {
              const isActive = entry.code === currentLocale;
              return (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => handleSelect(entry.code)}
                  className={clsx(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-base-200 text-base-content",
                  )}
                >
                  <span className="w-5 shrink-0 flex items-center justify-center">
                    {isActive && <CheckIcon className="size-4" weight="bold" />}
                  </span>
                  <span>{entry.name}</span>
                </button>
              );
            },
          )}
        </div>
      </div>
    </Modal>
  );
}
