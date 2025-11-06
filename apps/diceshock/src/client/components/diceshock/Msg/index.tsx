import { atom, useSetAtom } from "jotai";
import React from "react";
import { useSpringValue, animated } from "@react-spring/web";

import useAMoment from "@/client/hooks/useAMoment";
import { CheckCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import ClientSide from "./ClientSide";
import { ClientOnly } from "@tanstack/react-router";

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

    const containerMouseDown: React.MouseEventHandler<HTMLDivElement> = (
        evt
    ) => {
        if (evt.button !== 1) return;

        evt.preventDefault();

        setComp(null);
    };

    return {
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
                                onClick={() => setComp(null)}
                                className="btn btn-sm btn-ghost btn-square"
                            >
                                <XIcon className="size-6" />
                            </button>
                        </div>
                    </animated.div>
                )
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
                                onClick={() => setComp(null)}
                                className="btn btn-sm btn-ghost btn-square"
                            >
                                <XIcon className="size-6" />
                            </button>
                        </div>
                    </animated.div>
                )
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
                                onClick={() => setComp(null)}
                                className="btn btn-sm btn-ghost btn-square"
                            >
                                <XIcon className="size-6" />
                            </button>
                        </div>
                    </animated.div>
                )
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
                                onClick={() => setComp(null)}
                                className="btn btn-sm btn-ghost btn-square"
                            >
                                <XIcon className="size-6" />
                            </button>
                        </div>
                    </animated.div>
                )
            ),
    };
};
