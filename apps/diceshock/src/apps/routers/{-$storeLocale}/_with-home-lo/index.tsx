import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
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
import useCrossData from "@/client/hooks/useCrossData";
import { useTranslation } from "@/client/hooks/useTranslation";

export const Route = createFileRoute("/{-$storeLocale}/_with-home-lo/")({
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const crossData = useCrossData();
  const isInWechat = useMemo(() => {
    const ua =
      crossData?.UserAgentMeta?.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : "");
    return /MicroMessenger/i.test(ua);
  }, [crossData?.UserAgentMeta?.userAgent]);

  useEffect(() => {
    if (isInWechat) {
      navigate({ to: "/me", replace: true });
    }
  }, [isInWechat, navigate]);

  return (
    <main className="min-h-screen w-full overflow-x-clip">
      <HomeHero />

      <BladeRunner
        texts={[
          [t("home.bladeRunnerText1a"), t("home.bladeRunnerText1b")],
          [t("home.bladeRunnerText2a"), t("home.bladeRunnerText2b")],
          [t("home.bladeRunnerText3a"), t("home.bladeRunnerText3b")],
          [t("home.bladeRunnerText4")],
          [t("home.bladeRunnerText5")],
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
