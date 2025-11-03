import Agents from "@/client/components/diceshock/Agents";
import Credits from "@/client/components/diceshock/Credits";
import BladeRunner from "@/client/components/diceshock/HomePage/BladeRunner";
import BoardGame from "@/client/components/diceshock/HomePage/BoardGame";
import GameStart from "@/client/components/diceshock/HomePage/GameStart";
import HomeHero from "@/client/components/diceshock/HomePage/HomeHero";
import JPMahjong from "@/client/components/diceshock/HomePage/JPMahjong";
import MahjongMatch from "@/client/components/diceshock/HomePage/MahjongMatch";
import OuterThanBoard from "@/client/components/diceshock/HomePage/OuterThanBoard";
import VideoGame from "@/client/components/diceshock/HomePage/VideoGame";
import VideoGameList from "@/client/components/diceshock/HomePage/VideoGameList";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with-home-lo/")({
    component: Home,
});

function Home() {
    return (
        <main className="min-h-screen w-full overflow-x-clip">
            <HomeHero />

            <BladeRunner
                texts={[
                    [
                        "多个位面的居民声称",
                        "他们突然遭遇了来自其他世界的异能人士.",
                    ],
                    [
                        "传闻这些异能人士",
                        "通过一间名为 DiceShock© 的店铺往返多元位面.",
                    ],
                    [
                        "经调查, 这间名为 DiceShock© 的店铺",
                        "是一个连接多元位面的实体.",
                    ],
                    ["而遭遇者们将这些传闻中的异能人士称为"],
                    ["The Shock"],
                ]}
            />

            <BoardGame />

            <OuterThanBoard />

            <JPMahjong />

            <MahjongMatch />

            <GameStart />

            <VideoGame />

            <VideoGameList />

            <Agents className="pt-[30rem]" />

            <Credits />
        </main>
    );
}
