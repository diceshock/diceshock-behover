import { animated } from "@react-spring/web";

import useSticky from "@/client/hooks/useSticky";
import { reRange } from "@/shared/utils/math";

import XboxGraph from "@/client/assets/svg/video-games/xbox-graph.svg?react";
import SeriesX from "@/client/assets/svg/video-games/series-x.svg?react";

import GamePass from "@/client/assets/svg/video-games/xbox-game-pass.svg?react";
import Ultimate from "@/client/assets/svg/video-games/Ultimate.svg?react";

import SwitchL from "@/client/assets/svg/video-games/switch-l.svg?react";
import SwitchR from "@/client/assets/svg/video-games/switch-r.svg?react";
import SwitchText from "@/client/assets/svg/video-games/switch-text.svg?react";

const COUNT = 18;

const GameStart = () => {
    const { ref, progress } = useSticky();

    return (
        <div ref={ref} className="w-full h-[400vh] [&]:text-white">
            <animated.div
                style={{
                    opacity: progress.to((p) =>
                        Math.min(
                            reRange(p, 2, COUNT),
                            1 - reRange(p, 16, COUNT)
                        )
                    ),
                    transform: progress.to(
                        (p) =>
                            `scale(${0.9 + 0.1 * (1 - reRange(p, 16, COUNT))})`
                    ),
                    borderRadius: progress.to((p) =>
                        Math.min(reRange(p, 16, COUNT) * 100, 50)
                    ),
                }}
                className="sticky top-0 w-full h-screen bg-black"
            >
                <animated.div
                    style={{
                        opacity: progress.to((p) =>
                            Math.min(
                                reRange(p, 4, COUNT),
                                1 - reRange(p, 6, COUNT)
                            )
                        ),
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 text-2xl text-white text-nowrap"
                >
                    DiceShock© 巨献
                </animated.div>

                <animated.div
                    style={{
                        opacity: progress.to((p) =>
                            Math.min(
                                reRange(p, 7, COUNT),
                                1 - reRange(p, 9, COUNT)
                            )
                        ),
                    }}
                    className="absolute left-1/2 top-[40vh] -translate-x-1/2 text-2xl text-white"
                >
                    <XboxGraph className="size-40" />
                </animated.div>
                <animated.div
                    style={{
                        opacity: progress.to((p) =>
                            Math.min(
                                reRange(p, 8, COUNT),
                                1 - reRange(p, 9, COUNT)
                            )
                        ),
                    }}
                    className="absolute left-1/2 top-[calc(40vh+5rem)] -translate-x-1/2 text-2xl text-white"
                >
                    <SeriesX className="size-52 pl-2" />
                </animated.div>

                <animated.div
                    style={{
                        opacity: progress.to((p) =>
                            Math.min(
                                reRange(p, 10, COUNT),
                                1 - reRange(p, 12, COUNT)
                            )
                        ),
                    }}
                    className="absolute left-[calc(50vw-4.5rem)] top-[45vh] -translate-x-1/2 text-2xl text-white"
                >
                    <GamePass className="size-32" />
                </animated.div>
                <animated.div
                    style={{
                        opacity: progress.to((p) =>
                            Math.min(
                                reRange(p, 11, COUNT),
                                1 - reRange(p, 12, COUNT)
                            )
                        ),
                    }}
                    className="absolute left-[calc(50vw+4.5rem)] top-[calc(45vh-1rem)] -translate-x-1/2 text-2xl text-white"
                >
                    <Ultimate className="size-40" />
                </animated.div>

                <animated.div
                    style={{
                        opacity: progress.to((p) => reRange(p, 13, COUNT)),
                    }}
                    className="absolute left-[calc(50vw-2rem)] top-[40vh] -translate-x-1/2 text-2xl text-white"
                >
                    <SwitchL className="size-32" />
                </animated.div>
                <animated.div
                    style={{
                        opacity: progress.to((p) => reRange(p, 13, COUNT)),
                    }}
                    className="absolute left-[calc(50vw+2rem)] top-[40vh] -translate-x-1/2 text-2xl text-white"
                >
                    <animated.div
                        style={{
                            transform: progress.to(
                                (p) =>
                                    `translateY(${
                                        (reRange(p, 14, COUNT) - 1) * 20
                                    }px)`
                            ),
                        }}
                    >
                        <SwitchR className="size-32" />
                    </animated.div>
                </animated.div>
                <animated.div
                    style={{
                        opacity: progress.to((p) => reRange(p, 14, COUNT)),
                    }}
                    className="absolute left-[calc(50vw)] top-[calc(40vh+6rem)] -translate-x-1/2 text-2xl text-white"
                >
                    <SwitchText className="size-40" />
                </animated.div>
            </animated.div>
        </div>
    );
};

export default GameStart;
