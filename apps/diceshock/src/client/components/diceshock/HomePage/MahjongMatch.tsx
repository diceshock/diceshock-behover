import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { animated, useInView, useSpringValue } from "@react-spring/web";
import { useEffect } from "react";

import Lighting from "@/client/assets/svg/black-simplify-logo.svg?react";

const MahjongMatch = () => {
  const [ref, inViewStart] = useInView();

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
    if (inViewStart) {
      opacity1.start(1);
      opacity2.start(1);
      opacity3.start(1);
      return;
    }

    if (!inViewStart) {
      opacity1.start(0);
      opacity2.start(0);
      opacity3.start(0);
      return;
    }
  }, [inViewStart, opacity1, opacity2, opacity3]);

  return (
    <div className="w-full py-52 flex flex-col justify-center items-center mt-[40rem] lg:mt-0">
      <animated.div
        style={{
          opacity: opacity1,
        }}
        className="relative w-full h-40"
      >
        <Lighting className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/70 w-40" />

        <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-bold italic text-nowrap">
          公式战
        </h3>
      </animated.div>
      <animated.p
        style={{
          opacity: opacity1,
        }}
        className="text-xl mb-20 py-2 px-4"
      >
        全国公式战参与道馆
      </animated.p>

      <ul
        ref={ref}
        className="timeline timeline-vertical -translate-x-24 md:translate-x-0"
      >
        <animated.li
          style={{
            opacity: opacity2,
          }}
        >
          <div className="timeline-middle text-primary">
            <CheckCircleIcon className="h-5 w-5" weight="fill" />
          </div>
          <div className="timeline-end timeline-box text-nowrap">
            线下对局, 积累积分
          </div>
          <hr />
        </animated.li>
        <animated.li
          style={{
            opacity: opacity2,
          }}
        >
          <hr />
          <div className="timeline-middle text-primary">
            <CheckCircleIcon className="h-5 w-5" weight="fill" />
          </div>
          <div className="timeline-end timeline-box text-nowrap">
            挑战场馆日麻个人赛
          </div>
          <hr />
        </animated.li>
        <animated.li
          style={{
            opacity: opacity3,
          }}
        >
          <hr />
          <div className="timeline-middle text-primary">
            <CheckCircleIcon className="h-5 w-5" weight="fill" />
          </div>
          <div className="timeline-end timeline-box text-nowrap">
            参加全国立直麻将赛
          </div>
          <hr />
        </animated.li>
        <animated.li
          style={{
            opacity: opacity3,
          }}
        >
          <hr />
          <div className="timeline-middle text-primary">
            <CheckCircleIcon className="h-5 w-5" weight="fill" />
          </div>
          <div className="timeline-end timeline-box text-nowrap">
            参加全国立直麻将大师巅峰赛
          </div>
        </animated.li>
      </ul>
    </div>
  );
};

export default MahjongMatch;
