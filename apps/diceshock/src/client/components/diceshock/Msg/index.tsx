import { CheckCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { animated, useSpringValue } from "@react-spring/web";
import { ClientOnly } from "@tanstack/react-router";
import { atom, useSetAtom } from "jotai";
import type React from "react";
import useAMoment from "@/client/hooks/useAMoment";
import ClientSide from "./ClientSide";
import { useCallback, useMemo } from "react";

const Msg = () => (
  <ClientOnly>
    <ClientSide />
  </ClientOnly>
);

export default Msg;

export const msgA = atom(null as React.ReactNode);

export const useMsg = () => {
  const progress = useSpringValue(1);
  const setComp = useSetAtom(msgA);
  const { styles, show } = useAMoment(progress, {
    onRest: () => {
      progress.set(1);
      setComp(null);
    },
  });

  const containerMouseDown = useCallback<React.MouseEventHandler<HTMLDivElement>>((evt) => {
    if (evt.button !== 1) return;

    evt.preventDefault();

    setComp(null);
  }, [setComp]);

  return useMemo(() => ({
    info: (tx: string) =>
      show(() =>
        setComp(
          <animated.div
            onMouseDown={containerMouseDown}
            style={styles}
            role="alert"
            className="alert"
          >
            <CheckCircleIcon className="size-8 text-info" />
            <span>{tx}</span>
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
      ),
    success: (tx: string) =>
      show(() =>
        setComp(
          <animated.div
            onMouseDown={containerMouseDown}
            style={styles}
            role="alert"
            className="alert"
          >
            <CheckCircleIcon className="size-8 text-success" />
            <span>{tx}</span>
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
      ),
    warning: (tx: string) =>
      show(() =>
        setComp(
          <animated.div
            onMouseDown={containerMouseDown}
            style={styles}
            role="alert"
            className="alert"
          >
            <CheckCircleIcon className="size-8 text-warning" />
            <span>{tx}</span>
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
      ),
    error: (tx: string) =>
      show(() =>
        setComp(
          <animated.div
            onMouseDown={containerMouseDown}
            style={styles}
            role="alert"
            className="alert"
          >
            <CheckCircleIcon className="size-8 text-error" />
            <span>{tx}</span>
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
      ),
  }), [show, setComp, styles, containerMouseDown]);
};
