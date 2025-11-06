import { CopyrightIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import _ from "lodash";
import BlackSimplifyLogo from "@/client/assets/svg/black-simplify-logo.svg?react";
import Lighting from "@/client/assets/svg/lighting.svg?react";
import LongTextLogo from "@/client/assets/svg/long-text-logo.svg?react";
import Rainbow from "@/client/components/diceshock/Rainbow";
import Gradient from "../Gradient";

const HomeHero = () => (
  <>
    <div className="relative w-full h-screen max-h-screen overflow-hidden -mt-[4rem] hidden lg:block">
      <div className="relative w-full h-2/3 overflow-hidden">
        <div className="absolute left-0 top-12 flex w-[240rem] justify-around overflow-hidden">
          {_.range(0, 30).map((r) => (
            <div key={r} className="flex h-[240rem] flex-col justify-around">
              {_.range(0, 30).map((c) => (
                <Lighting key={`${r}-${c}`} className="w-4" />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute top-24 left-5">
          <h1 className="font-bold flex text-8xl justify-center bg-base-100">
            DiceShock <CopyrightIcon />
          </h1>
          <p className="w-max text-3xl pl-2 bg-base-100">桌游 · 日麻 · 主机</p>
          <p className="w-max text-3xl pl-2 bg-base-100">我们都是认真的</p>
        </div>

        <div className="absolute bottom-0 w-148 left-5 bg-base-100 flex justify-between pl-6 [&>*]:text-2xl [&>*]:hover:text-base-100 [&>*]:hover:bg-base-content">
          <Link to="." hash="BoardGame">
            桌游
          </Link>
          <Link to="." hash="JPMahjong">
            日麻
          </Link>
          <Link to="." hash="VideoGame">
            主机
          </Link>
        </div>

        <BlackSimplifyLogo className="absolute -bottom-5 left-200 w-[20rem] bg-base-100" />
      </div>

      <div className="w-full h-1/3 bg-base-content">
        <Rainbow className="w-full h-36" direction="col" gradient={8} />
      </div>

      <div className="absolute  -bottom-[2vh]">
        <span className="font-bold text-base-100 text-[12vh]">F02</span>

        <span className="font-light text-base-100 text-[5vh] ml-2">203</span>

        <span className="font-light text-base-100 text-[3vh] ml-2">
          位于光谷总部国际2栋
        </span>
      </div>

      <LongTextLogo className="absolute text-base-100 h-[8vh] bottom-0 right-0" />
    </div>

    <div className="relative w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden flex lg:hidden">
      <div className="relative w-1/2 h-full bg-base-content flex justify-between overflow-hidden rounded-br-2xl">
        <div className="relative size-full flex flex-col items-start justify-between">
          <div className="-mt-[2vw]">
            <div className="font-light text-base-100 text-[3vw] ml-[0.5vw] mt-3 -mb-[2.5vw]">
              光谷总部国际2栋
            </div>

            <div className="font-bold text-base-100 text-[8vw] -mb-[2vw]">
              F02
            </div>

            <div className="font-light text-base-100 text-[4vw] ml-[0.5vw]">
              203
            </div>
          </div>

          <LongTextLogo className="absolute h-[9vw] -left-[27.5vw] bottom-[24.5vw] rotate-90 text-base-100" />
        </div>

        <Rainbow
          className="absolute w-1/2 h-full -right-1 rotate-180"
          gradient={12}
        />
      </div>

      <div className="relative w-1/2 h-full">
        <div className="absolute top-0 left-[2vw] bg-base-100">
          <h1 className="font-bold flex text-[7vw] justify-center items-center">
            DiceShock <CopyrightIcon />
          </h1>
          <p className="text-[4vw] pl-[calc(1vw-0.75rem)]">
            桌游 · 日麻 · 主机
          </p>
          <p className="text-[4vw] pl-[calc(1vw-0.75rem)]">我们都是认真的</p>
        </div>

        <div className="absolute left-[4vw] top-[25vw] flex w-[40vw] justify-around overflow-hidden">
          {_.range(0, 6).map((r) => (
            <div key={r} className="flex h-[40vw] flex-col justify-around">
              {_.range(0, 6).map((c) => (
                <Lighting key={`${r}-${c}`} className="w-4" />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 w-[40vw] left-0 bg-base-100 flex justify-between pl-6 [&>*]:text-[3vw] [&>*]:hover:text-base-100 [&>*]:hover:bg-base-content">
          <Link to="." hash="BoardGame">
            桌游
          </Link>
          <Link to="." hash="JPMahjong">
            日麻
          </Link>
          <Link to="." hash="VideoGame">
            主机
          </Link>
        </div>
      </div>
    </div>

    <Gradient
      direction="col"
      className={{
        main: "w-full h-40 bg-base-content hidden lg:flex",
        a: "bg-base-100",
        b: "bg-base-content",
      }}
    />
  </>
);

export default HomeHero;
