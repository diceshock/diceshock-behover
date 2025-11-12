import { animated } from "@react-spring/web";
import type React from "react";
import useSticky from "@/client/hooks/useSticky";
import { reRange } from "@/shared/utils/math";

const BladeRunner: React.FC<{ texts: string[][] }> = ({ texts }) => {
  const { ref, progress } = useSticky();

  const count = texts.flat().length;

  return (
    <div className="w-full h-[300vh] mt-2" ref={ref}>
      <div className="sticky top-0 w-full h-screen flex flex-col justify-center py-24 px-4 [&>*]:text-xl [&>*]:font-bold">
        {texts.map((p, pid) => (
          <p key={pid} className="md:ml-[10vw] max-w-[45rem] mb-8">
            {p.map((tx, sid) => {
              const idx = texts.slice(0, pid).flat().length + sid;
              return (
                <animated.span
                  key={sid}
                  className={
                    idx === count - 1 ? "text-primary !text-3xl mt-4" : void 0
                  }
                  style={{
                    opacity: progress.to((p) => reRange(p, idx, count)),
                  }}
                >
                  {tx}
                </animated.span>
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
};

export default BladeRunner;
