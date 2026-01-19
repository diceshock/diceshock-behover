import { ClientOnly } from "@tanstack/react-router";
import clsx from "clsx";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToggleEvent = (evt: {
  open: boolean;
  target?: HTMLDialogElement;
}) => void;

export default function Modal({
  onClick,
  className,
  onToggle,
  isOpen,
  isCloseOnClick,
  ...props
}: Omit<
  React.ComponentProps<"dialog">,
  "onToggle" | "onClose" | "id" | "open"
> & {
  onToggle?: ToggleEvent;
  isCloseOnClick?: boolean;
  isOpen: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  const [isDelayOpen, setIsDelayOpen] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsDelayOpen(isOpen), 300);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  const click: React.MouseEventHandler<HTMLDialogElement> = useCallback(
    (evt) => {
      onClick?.(evt);

      if (!isCloseOnClick) return;

      const isSelfClick = evt.target === evt.currentTarget;
      const target = ref.current;

      if (!isSelfClick || !target) return;
      onToggle?.({ open: false, target });
    },
    [isCloseOnClick, onClick, onToggle],
  );

  const toggle: React.ToggleEventHandler<HTMLDialogElement> = useCallback(
    (evt) => {
      const target = evt.target as HTMLDialogElement;
      onToggle?.({
        target,
        open: target.open,
      });
    },
    [onToggle],
  );

  const close: React.ToggleEventHandler<HTMLDialogElement> = useCallback(
    (evt) => {
      const target = evt.target as HTMLDialogElement;
      onToggle?.({
        open: target.open,
        target,
      });
    },
    [onToggle],
  );

  return (
    <ClientOnly>
      {typeof window !== "undefined" &&
        (isOpen || isDelayOpen) &&
        createPortal(
          <dialog
            open={isOpen}
            onClick={click}
            onToggle={toggle}
            onClose={close}
            id={id}
            ref={ref}
            suppressHydrationWarning
            className={clsx(
              "z-100 modal overflow-hidden max-h-screen",
              "[&.modal-open,&[open],&:target]:bg-black/20",
              "[&.modal-open,&[open],&:target]:backdrop-blur-xs",
              className,
            )}
            {...props}
          ></dialog>,
          document.body,
        )}
    </ClientOnly>
  );
}
