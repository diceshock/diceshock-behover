import { animated, useSpring, useInView } from "@react-spring/web";
import { useEffect, useRef } from "react";
import dayjs from "dayjs";

interface GameCountAnimationProps {
  count: number;
  label?: string;
  updateDate?: Date | string;
}

const GameCountAnimation: React.FC<GameCountAnimationProps> = ({
  count,
  label = "桌游",
  updateDate,
}) => {
  const [ref, inView] = useInView();
  const prevCountRef = useRef(count);
  const isFirstMount = useRef(true);

  const { number, scale, opacity, y } = useSpring({
    from: {
      number: 0,
      scale: 0.3,
      opacity: 0,
      y: -20,
    },
    to: {
      number: inView ? count : 0,
      scale: inView ? 1 : 0.3,
      opacity: inView ? 1 : 0,
      y: inView ? 0 : -20,
    },
    config: {
      tension: 100,
      friction: 20,
    },
    reset: !isFirstMount.current && prevCountRef.current !== count,
    delay: isFirstMount.current ? 200 : 0,
  });

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
    }
    prevCountRef.current = count;
  }, [count]);

  const formattedDate = updateDate
    ? dayjs(updateDate).format("MM月DD日")
    : dayjs().format("MM月DD日");

  return (
    <div
      ref={ref}
      className="card bg-base-200/80 backdrop-blur-sm shadow-2xl border border-base-300/50 w-full max-w-2xl mx-auto hover:shadow-3xl transition-shadow duration-300"
    >
      <div className="card-body p-6 md:p-10">
        <div className="flex flex-col items-center gap-5">
          <animated.div
            className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-lg"
            style={{
              scale,
              opacity,
              transform: y.to((y) => `translateY(${y}px)`),
            }}
          >
            {number.to((n) => Math.floor(n).toLocaleString())}
          </animated.div>
          <animated.div
            className="flex flex-col items-center gap-3"
            style={{
              opacity,
              transform: y.to((y) => `translateY(${y * 0.5}px)`),
            }}
          >
            <p className="text-xl md:text-2xl text-base-content font-semibold">
              {label}
            </p>
            <div className="flex items-center gap-2 text-sm md:text-base text-base-content/60">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>截止 {formattedDate} 更新</span>
            </div>
          </animated.div>
        </div>
      </div>
    </div>
  );
};

export default GameCountAnimation;

