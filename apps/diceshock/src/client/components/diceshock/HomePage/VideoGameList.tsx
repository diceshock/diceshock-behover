import { animated } from "@react-spring/web";
import Cod from "@/client/assets/svg/video-games/cod.svg?react";
import Forza from "@/client/assets/svg/video-games/forza.svg?react";

import Image from "@/client/components/image";
import useSticky from "@/client/hooks/useSticky";

import { reRange } from "@/shared/utils/math";

const COUNT = 28;

const VideoGameList = () => {
  const { ref, progress } = useSticky();

  return (
    <div
      ref={ref}
      className="w-full h-[250vw] md:h-[220vh] mb-[52vh] md:mb-[40vh] mt-20 pt-20"
    >
      <div className="w-full h-[60vw] max-h-[35rem] mt-[40rem] lg:mt-0 relative [perspective:1000px]">
        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, -4, COUNT)),
          }}
        >
          <Image
            className="absolute top-0 left-[calc(50%-5rem)] md:left-[calc(50%-10rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem] rounded-lg shadow-2xl"
            width={1600}
            height={900}
            src="https://assets.diceshock.com/images/xlarge_FH_5_Evergreen_Key_Art_Horizontal_9600x5400_RGB_2_adfcd010d0.webp"
            alt="FH 5 Evergreen Key Art Horizontal"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, -3, COUNT)),
          }}
        >
          <Image
            className="absolute top-[10rem] lg:top-[15rem] left-[calc(50%+5rem)] md:left-[calc(50%+10rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem] rounded-lg shadow-2xl"
            width={1600}
            height={900}
            src="https://assets.diceshock.com/images/xlarge_Forza_Motorsport_Key_Art_16x9_RGB_F02_3840x2160_8bf1f444b2.webp"
            alt="Forza Motorsport"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, -2, COUNT)),
          }}
        >
          <Forza className="w-1/3 max-w-64 absolute top-[10rem] lg:top-[15rem] left-1/2 -translate-x-1/2 text-primary" />
        </animated.div>
      </div>

      <div className="w-full h-[60vw] max-h-[35rem] mt-[2rem] sm:-mt-[2rem] relative [perspective:1000px]">
        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, -1, COUNT)),
          }}
        >
          <Image
            className="absolute top-0 left-[calc(50%-5rem)] md:left-[calc(50%-10rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem] rounded-lg shadow-2xl"
            width={1600}
            height={900}
            src="https://assets.diceshock.com/images/Store_BO6PDP_Hero.webp"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 1, COUNT)),
          }}
        >
          <Image
            className="absolute top-[10rem] lg:top-[15rem] left-[calc(50%+5rem)] md:left-[calc(50%+10rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem] rounded-lg shadow-2xl"
            width={1600}
            height={900}
            src="https://assets.diceshock.com/images/COD-Store_PDP-WZ_Hero_01.webp"
            alt="BLACK OPS 6"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 2, COUNT)),
          }}
        >
          <Cod className="w-1/2 max-w-[30rem] absolute top-[10rem] lg:top-[15rem] left-1/2 -translate-x-1/2 text-primary" />
        </animated.div>
      </div>

      <div className="w-full h-[80vw] max-h-[35rem] -mt-[2rem] relative [perspective:1000px]">
        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 5, COUNT)),
          }}
          className="w-full h-[20rem] md:h-[40rem] absolute top-[10rem] md:top-[10rem] bg-primary"
        />

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 13, COUNT)),
          }}
        >
          <Image
            className="absolute left-1/2 top-[15rem] md:top-[10rem] -translate-x-1/2 w-full scale-125"
            width={2418}
            height={1320}
            src="https://assets.diceshock.com/images/bg-astarion.png"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 9, COUNT)),
          }}
        >
          <Image
            className="absolute top-0 left-[calc(50%-5rem)] md:left-[calc(50%-10rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/hero-dark.png"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 10, COUNT)),
          }}
        >
          <Image
            className="absolute top-[10rem] lg:top-[15rem] right-0 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/hero-astarion.png"
            alt="BLACK OPS 6"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 11, COUNT)),
          }}
        >
          <Image
            className="absolute top-[10rem] lg:top-[15rem] -left-20 sm:left-0 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1600}
            height={900}
            src="https://assets.diceshock.com/images/hero-gale.png"
            alt="BLACK OPS 6"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 11, COUNT)),
          }}
        >
          <Image
            className="absolute top-[20rem] left-[calc(50%+5rem)] md:left-[calc(60%+4rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/hero-karlach.png"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 12, COUNT)),
          }}
        >
          <Image
            className="absolute top-[25rem] md:top-[30rem] left-[calc(50%-2rem)] md:left-1/2 -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/hero-laezel.png"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 12, COUNT)),
          }}
        >
          <Image
            className="absolute top-[22rem] sm:top-[25rem] left-[calc(20%)] md:left-[calc(50%-20rem)] -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/hero-shadowheart.png"
            alt="Warzone"
          />
        </animated.div>

        <animated.div
          style={{
            opacity: progress.to((p) => reRange(p, 15, COUNT)),
          }}
        >
          <Image
            className="absolute top-[15rem] md:top-[20rem] left-1/2 -translate-x-1/2 w-2/3 min-w-[20rem] max-w-[40rem]"
            width={1710}
            height={1380}
            src="https://assets.diceshock.com/images/logo-bg3.png"
            alt="Warzone"
          />
        </animated.div>
      </div>
    </div>
  );
};

export default VideoGameList;
