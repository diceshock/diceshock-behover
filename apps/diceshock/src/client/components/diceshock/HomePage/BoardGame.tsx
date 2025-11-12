import {
  ArrowRightIcon,
  BalloonIcon,
  HeadsetIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/dist/ssr";
import { animated, useInView, useSpringValue } from "@react-spring/web";
import { ClientOnly, Link } from "@tanstack/react-router";

import { useEffect } from "react";
import GameList from "../GameList";

const BoardGame = () => {
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
      <h2 id="BoardGame" style={{ fontSize: 0 }}>
        桌游
      </h2>
      <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col mt-[4rem] [&:not(.text-primary)]:text-neutral-content">
        <h2 className="absolute left-4 top-[10vh] [&]:text-5xl lg:[&]:text-7xl [&]:text-base-content">
          <p>
            <span className="text-primary">懂桌游</span>的桌游店
          </p>
          <p>
            有意思的
            <span className="text-primary">好桌游</span>
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
              <SquaresFourIcon size={40} weight="light" />
            </span>

            <h3 className="text-3xl my-2 text-base-content">
              各类桌游,
              <br /> 精挑细选
            </h3>

            <p ref={refStart} className="w-56 text-base-content/70 text-xl">
              DiceShock© 拥有
              <span className="text-base-content">超过 600 款</span>
              精挑细选的桌游. 无论是一场
              <span className="text-base-content">冒险</span>, 一局
              <span className="text-base-content">精算</span>, 或是一场
              <span className="text-base-content">派对狂欢</span>,
              你想玩的这里都有.
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
              <BalloonIcon size={40} weight="light" />
            </span>

            <h3 className="text-3xl my-2 text-base-content">
              大学包围,
              <br /> 即刻约局
            </h3>

            <p className="w-56 text-base-content/70 text-xl">
              DiceShock© 被多所大学包围, 主理人耕耘桌游行业多年.
              玩桌游的人开的桌游店,
              <span className="text-base-content"> 组局不等人!</span>
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
              <HeadsetIcon size={40} weight="light" />
            </span>

            <h3 className="text-3xl my-2 text-base-content">
              贴心店员,
              <br /> 啥都能开
            </h3>

            <p ref={refEnd} className="w-56 text-base-content/70 text-xl">
              专职店员贴心服务. 无论是
              <span className="text-base-content">推荐桌游</span>,{" "}
              <span className="text-base-content">讲解规则</span>, 组织游戏进行;
              还是扮演游戏
              <span className="text-base-content">主持人</span>. 什么桌游都能开,
              什么桌游都好玩.
            </p>
          </animated.div>
        </div>
      </div>
      <div className="relative mt-[55rem] lg:mt-[20rem] m-2">
        <ClientOnly>
          <GameList
            className={{
              outer:
                "w-auto h-[calc(100vh-5rem)] m-2 overflow-y-hidden bg-gradient-to-b from-transparent pl-2",
            }}
          />
        </ClientOnly>

        <div className="absolute top-0 size-full bg-gradient-to-b from-transparent to-base-100 pointer-events-none" />

        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <Link to="/inventory" className="btn btn-lg btn-primary">
            查看库存 <ArrowRightIcon weight="bold" size={24} />
          </Link>
        </div>
      </div>
    </>
  );
};

export default BoardGame;
