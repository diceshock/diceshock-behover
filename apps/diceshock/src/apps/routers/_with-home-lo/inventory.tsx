import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import GameCountAnimation from "@/client/components/diceshock/GameCountAnimation";
import GameList from "@/client/components/diceshock/GameList";
import trpcClientPublic from "@/shared/utils/trpc";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute("/_with-home-lo/inventory")({
  head: () => ({
    meta: [
      { title: "桌游库 - DiceShock 骰子奇兵" },
      {
        name: "description",
        content: "DiceShock 骰子奇兵桌游库存，查看我们拥有的所有桌游",
      },
      { property: "og:title", content: "桌游库 - DiceShock 骰子奇兵" },
      { property: "og:description", content: "查看 DiceShock 骰子奇兵的桌游库存" },
      {
        property: "og:image",
        content: `${SITE_URL}/edge/media/card/inventory`,
      },
      { property: "og:url", content: `${SITE_URL}/inventory` },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const [count, setCount] = useState<number>(0);
  const [updateDate, setUpdateDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    trpcClientPublic.owned.getCount
      .query()
      .then(({ current, latestDate }) => {
        setCount(current ?? 0);
        if (latestDate) {
          // latestDate 可能是 Date 对象或字符串，需要转换
          const date =
            typeof latestDate === "string"
              ? new Date(latestDate)
              : new Date(latestDate);
          setUpdateDate(date);
        } else {
          setUpdateDate(new Date());
        }
      })
      .catch(() => {
        setCount(0);
        setUpdateDate(new Date());
      });
  }, []);

  return (
    <main className="max-w-full min-h-screen overflow-x-clip py-8 md:py-14 px-4">
      <div className="mb-8">
        <GameCountAnimation
          count={count}
          label="库内桌游"
          updateDate={updateDate}
        />
      </div>
      <GameList className={{ filter: "top-24" }} />
    </main>
  );
}
