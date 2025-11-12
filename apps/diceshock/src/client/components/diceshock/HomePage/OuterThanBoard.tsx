import { animated } from "@react-spring/web";
import { ClientOnly } from "@tanstack/react-router";
import useSticky from "@/client/hooks/useSticky";
import { reRange } from "@/shared/utils/math";
import ZdogShapes from "./ZdogShapes";

const texts = [
  "好桌子, 大桌子, 再大桌游也好开!",
  "椅子牢固又舒服, 老板家同款",
  "带桌游来玩? 免费! 带团的 GM/DM/KP 统统都免费!",
  "来我家跑团啥都不用带. 骰子, tokens, 地图板, 白板, 还有棋子都给你包圆了",
  "想玩什么和我们说, 能解决的都解决",
];

const colors = ["#36ffa1", "#4fdfb8", "#6abecd", "#849fe4", "#9d7efa"];

const OuterThanBoard = () => {
  const { ref, progress } = useSticky();

  return (
    <div className="w-full h-[250vh]" ref={ref}>
      <div className="w-full h-screen sticky top-0">
        <ClientOnly>
          <ZdogShapes className="cursor-move w-[80vw] h-[80vw] md:w-[80vh] md:h-[80vh] pointer-events-none md:pointer-events-auto opacity-70 lg:opacity-100 absolute right-1/2 lg:right-10 top-1/2 translate-x-1/2 lg:-translate-x-0 -translate-y-1/2" />
        </ClientOnly>

        <div className="absolute left-4 top-[5rem] md:top-[10rem] [&]:text-5xl md:[&]:text-7xl [&]:text-base-content">
          <h2>
            用心之处,
            <br className="md:hidden" />{" "}
            <span className="text-primary">不止桌游</span>
          </h2>
        </div>

        <div className="absolute left-10 top-[12rem] md:top-[17rem] flex flex-col chat chat-start">
          {texts.map((tx, idx) => (
            <animated.p
              key={idx}
              style={{
                backgroundColor: colors[idx % colors.length],
                transform: progress.to(
                  (p) => `scale(${0.8 + 0.2 * reRange(p, idx, texts.length)})`,
                ),
                opacity: progress.to((p) => reRange(p, idx, texts.length)),
              }}
              className="chat-bubble text-xl mb-5 rounded-lg font-bold text-base-100 px-4 py-5 origin-left"
            >
              {tx}
            </animated.p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OuterThanBoard;
