import { useEffect } from "react";
import { useInView, useSpringValue, animated } from "@react-spring/web";

import FourK from "@/client/assets/svg/video-games/4k.svg?react";
import Dolby from "@/client/assets/svg/video-games/dolby.svg?react";
import GamePass from "@/client/assets/svg/video-games/GamePassSq.svg?react";

const VideoGame = () => {
    const [refStart, inViewStart] = useInView();
    const [refEnd, inViewEnd] = useInView();

    const opacity1 = useSpringValue(0.1, {
        config: { damping: 5, friction: 20 },
    });
    const opacity2 = useSpringValue(0.1, {
        config: { damping: 15, friction: 40 },
    });
    const opacity3 = useSpringValue(0.1, {
        config: { damping: 25, friction: 60 },
    });

    useEffect(() => {
        if (inViewStart || inViewEnd) {
            opacity1.start(1);
            opacity2.start(1);
            opacity3.start(1);
            return;
        }

        if (!inViewEnd && !inViewStart) {
            opacity1.start(0);
            opacity2.start(0);
            opacity3.start(0);
            return;
        }
    }, [inViewEnd, inViewStart, opacity1, opacity2, opacity3]);

    return (
        <>
            <h2 id="VideoGame" style={{ fontSize: 0 }}>
                主机
            </h2>

            <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col mt-[4rem] [&:not(.text-primary)]:text-neutral-content">
                <h2 className="absolute left-4 top-[10vh] [&]:text-4xl lg:[&]:text-7xl [&]:text-base-content">
                    <p>好游戏配上好设备</p>
                    <p className="text-primary">开最快的车, 战最烈的斗</p>
                </h2>

                <div className="absolute left-1/2 lg:left-[40vw] top-[20rem] lg:top-0 h-[65rem] w-[70vw] flex flex-col lg:flex-row items-center justify-between -translate-x-1/2">
                    <animated.div
                        style={{
                            opacity: opacity1,
                            scale: opacity1.to((p) => 0.8 + 0.2 * p),
                        }}
                        className="flex flex-col items-center lg:items-start"
                    >
                        <span className="size-20 rounded-full bg-primary flex justify-center items-center text-base-100">
                            <FourK className="size-16" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            大电视,
                            <br /> 大震撼
                        </h3>

                        <p
                            ref={refStart}
                            className="w-56 text-base-content/70 text-xl"
                        >
                            DiceShock© 为电玩区购置{" "}
                            <span className="text-base-content"> 75 英寸</span>
                            超大电视, 配合
                            <span className="text-base-content"> 4K 高清</span>
                            分辨率,
                            <span className="text-base-content"> HDR10 </span>
                            高动态范围, 水晶般画质尽收眼底.
                        </p>
                    </animated.div>

                    <animated.div
                        style={{
                            opacity: opacity2,
                            scale: opacity2.to((p) => 0.8 + 0.2 * p),
                        }}
                        className="flex flex-col items-center lg:items-start"
                    >
                        <span className="size-20 rounded-full bg-primary flex justify-center items-center text-base-100">
                            <Dolby className="size-20" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            双响临门,
                            <br /> 音效磅礴
                        </h3>

                        <p className="w-56 text-base-content/70 text-xl">
                            <span className="text-base-content">
                                漫步者 Hi-Res{" "}
                            </span>
                            金标音响的磅礴音效可以让游戏中每一颗弹壳的掉落声,
                            每一个冲程的轰鸣声都透过四周鼓动你的耳膜.
                        </p>
                    </animated.div>

                    <animated.div
                        style={{
                            opacity: opacity3,
                            scale: opacity3.to((p) => 0.8 + 0.2 * p),
                        }}
                        className="flex flex-col items-center lg:items-start"
                    >
                        <span className="size-20 rounded-full bg-primary flex justify-center items-center text-base-100">
                            <GamePass className="size-16" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            海量游戏,
                            <br /> 酣畅劲玩
                        </h3>

                        <p
                            ref={refEnd}
                            className="w-56 text-base-content/70 text-xl"
                        >
                            店内订阅{" "}
                            <span className="text-base-content">
                                XBOX GAME PASS 终极版会员
                            </span>
                            . 还拥有丰富的{" "}
                            <span className="text-base-content">
                                Nintendo Switch
                            </span>{" "}
                            与 XBOX 游戏库存. 玩尽兴, 玩过瘾.
                        </p>
                    </animated.div>
                </div>
            </div>
        </>
    );
};

export default VideoGame;
