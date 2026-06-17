import { animated, useInView, useSpringValue } from "@react-spring/web";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import type React from "react";
import { useEffect } from "react";
import AgentLogo from "@/client/assets/svg/agent-logo.svg?react";
import TableAgent from "@/client/assets/svg/agents/DiceshockItems_table-agent-icon.svg?react";
import TablePassCC from "@/client/assets/svg/agents/DiceshockItems_table-pass-cc-icon.svg?react";
import TablePass from "@/client/assets/svg/agents/DiceshockItems_table-pass-icon.svg?react";
import TablePassLTS from "@/client/assets/svg/agents/DiceshockItems_table-pass-lts-icon.svg?react";
import AgentsChannel from "@/client/assets/svg/agents_channel.svg?react";
import Swing from "./Swing";

const Agents: React.FC<{ className?: string }> = ({ className }) => {
  const [ref, inView] = useInView();

  const opacity1 = useSpringValue(0.1, {
    config: { damping: 5, friction: 20 },
  });
  const opacity2 = useSpringValue(0.1, {
    config: { damping: 15, friction: 40 },
  });
  const opacity3 = useSpringValue(0.1, {
    config: { damping: 25, friction: 60 },
  });
  const opacity4 = useSpringValue(0.1, {
    config: { damping: 35, friction: 80 },
  });

  useEffect(() => {
    if (inView) {
      opacity1.start(1);
      opacity2.start(1);
      opacity3.start(1);
      opacity4.start(1);
      return;
    } else {
      opacity1.start(0);
      opacity2.start(0);
      opacity3.start(0);
      opacity4.start(0);
      return;
    }
  }, [inView, opacity1, opacity2, opacity3, opacity4]);

  return (
    <>
      <animated.div
        style={{
          opacity: opacity1,
          scale: opacity1.to((p) => 0.8 + 0.2 * p),
        }}
        className={clsx(
          "w-full pb-20 sm:pb-52 flex flex-col justify-center items-center px-4",
          className,
        )}
      >
        <AgentLogo className="w-8 sm:w-10 mb-3 sm:mb-4" />
        <h2 className="text-sm sm:text-xl md:text-3xl mb-3 sm:mb-5 text-center">
          现在加入成为{" "}
          <span className="text-primary font-bold">DiceShock Agents©</span> 会员
        </h2>
        <p className="text-xs sm:text-xl mb-8 sm:mb-20">选择你的会员计划</p>

        <div
          ref={ref}
          className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-5xl mx-auto"
        >
          <animated.div
            style={{
              opacity: opacity1,
              scale: opacity1.to((p) => 0.8 + 0.2 * p),
              transform: opacity1.to((p) => `rotateY(${(1 - p) * 120}deg)`),
            }}
          >
            <Swing
              className={{
                inner:
                  "card bg-base-200 w-full h-64 sm:h-80 md:h-[28rem] shadow-xl [transform-style:preserve-3d]",
              }}
            >
              <figure className="[transform:translateZ(1.5rem)] sm:[transform:translateZ(3rem)] flex-1 flex items-center justify-center p-2 sm:p-4">
                <TableAgent className="w-full max-w-[8rem] sm:max-w-[14rem]" />
              </figure>

              <div className="card-body p-3 sm:p-5">
                <h2 className="card-title text-xs sm:text-base">储值卡</h2>
                <p className="text-[10px] sm:text-sm">充值福利, 付费折扣.</p>
                <div className="card-actions justify-end mt-auto">
                  <Link
                    to="/contact-us"
                    className="btn btn-xs sm:btn-sm bg-black text-primary"
                  >
                    联系我们
                  </Link>
                </div>
              </div>
            </Swing>
          </animated.div>

          <animated.div
            style={{
              opacity: opacity2,
              scale: opacity2.to((p) => 0.8 + 0.2 * p),
              transform: opacity2.to((p) => `rotateY(${(1 - p) * 120}deg)`),
            }}
          >
            <Swing
              className={{
                inner:
                  "card bg-base-200 w-full h-64 sm:h-80 md:h-[28rem] shadow-xl [transform-style:preserve-3d]",
              }}
            >
              <figure className="[transform:translateZ(1.5rem)] sm:[transform:translateZ(3rem)] flex-1 flex items-center justify-center p-2 sm:p-4">
                <TablePassCC className="w-full max-w-[8rem] sm:max-w-[14rem]" />
              </figure>

              <div className="card-body p-3 sm:p-5">
                <h2 className="card-title text-xs sm:text-base">CC通行证</h2>
                <p className="text-[10px] sm:text-sm">20个工作日畅玩.</p>
                <div className="card-actions justify-end mt-auto">
                  <Link
                    to="/contact-us"
                    className="btn btn-xs sm:btn-sm bg-black text-primary"
                  >
                    联系我们
                  </Link>
                </div>
              </div>
            </Swing>
          </animated.div>

          <animated.div
            style={{
              opacity: opacity3,
              scale: opacity3.to((p) => 0.8 + 0.2 * p),
              transform: opacity3.to((p) => `rotateY(${(1 - p) * 120}deg)`),
            }}
          >
            <Swing
              className={{
                inner:
                  "card bg-base-200 w-full h-64 sm:h-80 md:h-[28rem] shadow-xl [transform-style:preserve-3d]",
              }}
            >
              <figure className="[transform:translateZ(1.5rem)] sm:[transform:translateZ(3rem)] flex-1 flex items-center justify-center p-2 sm:p-4">
                <TablePass className="w-full max-w-[8rem] sm:max-w-[14rem]" />
              </figure>

              <div className="card-body p-3 sm:p-5">
                <h2 className="card-title text-xs sm:text-base">桌面通行证</h2>
                <p className="text-[10px] sm:text-sm">30天畅玩无限!</p>
                <div className="card-actions justify-end mt-auto">
                  <Link
                    to="/contact-us"
                    className="btn btn-xs sm:btn-sm bg-black text-primary"
                  >
                    联系我们
                  </Link>
                </div>
              </div>
            </Swing>
          </animated.div>

          <animated.div
            style={{
              opacity: opacity4,
              scale: opacity4.to((p) => 0.8 + 0.2 * p),
              transform: opacity4.to((p) => `rotateY(${(1 - p) * 120}deg)`),
            }}
          >
            <Swing
              className={{
                inner:
                  "card bg-base-200 w-full h-64 sm:h-80 md:h-[28rem] shadow-xl [transform-style:preserve-3d]",
              }}
            >
              <figure className="[transform:translateZ(1.5rem)] sm:[transform:translateZ(3rem)] flex-1 flex items-center justify-center p-2 sm:p-4">
                <TablePassLTS className="w-full max-w-[8rem] sm:max-w-[14rem]" />
              </figure>

              <div className="card-body p-3 sm:p-5">
                <h2 className="card-title text-xs sm:text-base">通行证 LTS</h2>
                <p className="text-[10px] sm:text-sm">365天畅玩无限</p>
                <div className="card-actions justify-end mt-auto">
                  <Link
                    to="/contact-us"
                    className="btn btn-xs sm:btn-sm bg-black text-primary"
                  >
                    联系我们
                  </Link>
                </div>
              </div>
            </Swing>
          </animated.div>
        </div>
      </animated.div>

      <div className="w-full py-10 sm:py-16 md:h-[40vh] bg-neutral flex flex-col justify-center items-center px-4">
        <AgentsChannel className="w-8 sm:w-10 mb-3 sm:mb-4 text-neutral-content" />

        <p className="text-neutral-content text-sm sm:text-xl px-4 text-center">
          加入任意会员计划即可享用{" "}
          <span className="text-primary">Agents Channel</span> 会员专属频道
        </p>
        <p className="text-neutral-content text-sm sm:text-xl px-4 text-center mt-1">
          会员活动, 会员折扣, 会员福利, 一网打尽.
        </p>
      </div>
    </>
  );
};

export default Agents;
