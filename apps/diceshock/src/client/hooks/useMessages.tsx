import { CheckCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { animated, useSpringValue } from "@react-spring/web";
import { ClientOnly } from "@tanstack/react-router";
import { atom, useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import useAMoment from "./useAMoment";

export const messagesAtom = atom(null as React.ReactNode);

export const useMessages = () => {
  const progress = useSpringValue(1);
  const setComp = useSetAtom(messagesAtom);
  const { styles, show } = useAMoment(progress, {
    onRest: () => {
      progress.set(1);
      setComp(null);
    },
  });

  const containerMouseDown = useCallback<
    React.MouseEventHandler<HTMLDivElement>
  >(
    (evt) => {
      if (evt.button !== 1) return;

      evt.preventDefault();

      setComp(null);
    },
    [setComp],
  );

  const renderToast = useCallback(
    (type: "info" | "success" | "warning" | "error", message: string) => {
      const colorClass =
        type === "info"
          ? "text-info"
          : type === "success"
            ? "text-success"
            : type === "warning"
              ? "text-warning"
              : "text-error";

      show(() =>
        setComp(
          <animated.div
            onMouseDown={containerMouseDown}
            style={styles}
            role="alert"
            className="alert"
          >
            <CheckCircleIcon className={`size-8 ${colorClass}`} />
            <span>{message}</span>
            <div>
              <button
                type="button"
                onClick={() => setComp(null)}
                className="btn btn-sm btn-ghost btn-square"
              >
                <XIcon className="size-6" />
              </button>
            </div>
          </animated.div>,
        ),
      );
    },
    [show, setComp, styles, containerMouseDown],
  );

  return useMemo(
    () => ({
      info: (message: string) => renderToast("info", message),
      success: (message: string) => renderToast("success", message),
      warning: (message: string) => renderToast("warning", message),
      error: (message: string) => renderToast("error", message),
    }),
    [renderToast],
  );
};

// 全局 Toast 容器组件，使用 createPortal 和 dialog 元素挂载到 body，层级高于弹窗
export const MessagesContainer = () => {
  const comp = useAtomValue(messagesAtom);
  const hasMessage = comp !== null;

  return (
    <ClientOnly>
      {typeof window !== "undefined" &&
        createPortal(
          <dialog
            open={hasMessage}
            className="z-200 pointer-events-none backdrop:bg-transparent"
            style={{
              border: "none",
              background: "transparent",
              boxShadow: "none",
            }}
          >
            <div className="toast toast-bottom toast-end pointer-events-auto">
              {comp as React.ReactNode}
            </div>
          </dialog>,
          document.body,
        )}
    </ClientOnly>
  );
};
