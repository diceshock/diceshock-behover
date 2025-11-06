import useSticky from "@/client/hooks/useSticky";
import { animated } from "@react-spring/web";
import MainLogo from "@/client/assets/svg/main-logo.svg?react";
import { reRange } from "@/shared/utils/math";

const COUNT = 15;

const Credits = () => {
    const { ref: ref1, progress: progress1 } = useSticky();
    const { ref: ref2, progress: progress2 } = useSticky();

    return (
        <>
            <div ref={ref1} className="w-full h-[200vh]">
                <div className="sticky top-0 w-full h-screen flex justify-center items-center">
                    <animated.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
                        style={{
                            opacity: progress1.to(
                                (p) => 1 - reRange(p, 4, COUNT)
                            ),
                        }}
                    >
                        DiceShock©
                    </animated.div>

                    <animated.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 w-full text-xl text-center"
                        style={{
                            opacity: progress1.to((p) =>
                                Math.min(
                                    reRange(p, 5, COUNT),
                                    1 - reRange(p, 7, COUNT)
                                )
                            ),
                        }}
                    >
                        一家位于光谷总部国际2栋203室的桌游店
                    </animated.div>

                    <animated.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                            opacity: progress1.to((p) => reRange(p, 8, COUNT)),
                        }}
                    >
                        <MainLogo className="w-[20rem]" />
                    </animated.div>
                </div>
            </div>

            <div className="w-full py-20 flex flex-col items-center justify-center">
                <div className="my-5 flex [&]:text-xl">
                    <h5 className="font-bold mr-2">主理人</h5>
                    <div>
                        <p>辣条</p>
                        <p>薯条</p>
                        <p>Nerd</p>
                    </div>
                </div>
            </div>

            <div className="w-full py-20 flex flex-col items-center justify-center">
                <div className="my-5 flex [&]:text-xl">
                    <h5 className="font-bold">网页设计/开发/运维</h5>
                </div>
                <p className="text-xl">Nerd</p>
            </div>

            <div className="w-full py-20 flex flex-col items-center justify-center">
                <div className="my-5 flex [&]:text-xl">
                    <h5 className="font-bold">店长</h5>
                </div>
                <p className="text-xl">小武</p>
            </div>

            <div ref={ref2} className="w-full h-[150vh]">
                <div className="sticky top-0 w-full h-screen flex justify-center items-center">
                    <animated.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
                        style={{
                            opacity: progress2.to(
                                (p) => 1 - reRange(p, 4, COUNT)
                            ),
                        }}
                    >
                        以及最重要的
                    </animated.div>

                    <animated.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-nowrap"
                        style={{
                            opacity: progress2.to((p) => reRange(p, 5, COUNT)),
                        }}
                    >
                        热爱桌游和生活的你
                    </animated.div>
                </div>
            </div>
        </>
    );
};

export default Credits;
