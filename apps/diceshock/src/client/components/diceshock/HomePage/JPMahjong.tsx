import {
    EyesIcon,
    HandPeaceIcon,
    LightningAIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useInView, useSpringValue, animated } from "@react-spring/web";
import { useEffect } from "react";

const JPMahjong = () => {
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
            <h2 id="JPMahjong" style={{ fontSize: 0 }}>
                日麻
            </h2>

            <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col mt-[4rem] [&:not(.text-primary)]:text-neutral-content">
                <h2 className="absolute left-4 top-[10vh] [&]:text-5xl lg:[&]:text-7xl [&]:text-base-content">
                    <p>
                        <span className="text-primary">日麻机</span>上打日麻
                    </p>
                    <p>
                        <span className="text-primary">公式战</span>里鸣碰杀
                    </p>
                </h2>

                <div className="absolute left-1/2 lg:left-[40vw] top-[15rem] lg:top-0 h-[65rem] w-[70vw] flex flex-col lg:flex-row items-center justify-between -translate-x-1/2">
                    <animated.div
                        style={{
                            opacity: opacity1,
                            scale: opacity1.to((p) => 0.8 + 0.2 * p),
                        }}
                        className="flex flex-col items-center lg:items-start"
                    >
                        <span className="size-20 rounded-full bg-primary flex justify-center items-center text-base-100">
                            <HandPeaceIcon size={40} weight="light" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            日麻不来赌,
                            <br /> 日麻很好玩
                        </h3>

                        <p
                            ref={refStart}
                            className="w-56 text-base-content/70 text-xl"
                        >
                            日式立直麻将是一种在国际社会正规发展的智力运动.
                            有很好看的职业比赛和选手直播. 上手容易很好玩!
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
                            <LightningAIcon size={40} weight="light" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            专业日麻机,
                            <br /> 专门打日麻
                        </h3>

                        <p className="w-56 text-base-content/70 text-xl">
                            DiceShock© 购置两台
                            <span className="text-base-content">
                                专用日麻机
                            </span>
                            , 自动算分, 自动洗牌. 麻烦都揽下, 快乐留给你.
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
                            <EyesIcon size={40} weight="light" />
                        </span>

                        <h3 className="text-3xl my-2 text-base-content">
                            麻友馋馋,
                            <br /> 麻友多多
                        </h3>

                        <p
                            ref={refEnd}
                            className="w-56 text-base-content/70 text-xl"
                        >
                            从老板到群友, 馋日麻的人巨多. <br /> 你只要一呼,
                            我们绝对百应!
                        </p>
                    </animated.div>
                </div>
            </div>
        </>
    );
};

export default JPMahjong;
