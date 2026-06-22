import { useQuery } from "@apollo/client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import GameCountAnimation from "@/client/components/diceshock/GameCountAnimation";
import GameList from "@/client/components/diceshock/GameList";
import { useGetOwnedBoardGameCountQuery } from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/inventory",
)({
  head: () => ({
    meta: [
      { title: "桌游库 - DiceShock 骰子奇兵" },
      {
        name: "description",
        content: "DiceShock 骰子奇兵桌游库存，查看我们拥有的所有桌游",
      },
      { property: "og:title", content: "桌游库 - DiceShock 骰子奇兵" },
      {
        property: "og:description",
        content: "查看 DiceShock 骰子奇兵的桌游库存",
      },
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
  const { t } = useTranslation();
  const [count, setCount] = useState<number>(0);
  const [updateDate, setUpdateDate] = useState<Date | undefined>(undefined);

  const { data } = useGetOwnedBoardGameCountQuery();

  useEffect(() => {
    if (data?.ownedBoardGameCount) {
      const { current, latestDate } = data.ownedBoardGameCount;
      setCount(current ?? 0);
      if (latestDate) {
        setUpdateDate(new Date(latestDate));
      } else {
        setUpdateDate(new Date());
      }
    } else {
      setCount(0);
      setUpdateDate(new Date());
    }
  }, [data]);

  return (
    <main className="max-w-full min-h-screen overflow-x-clip py-8 md:py-14 px-4">
      <div className="mb-8">
        <GameCountAnimation
          count={count}
          label={t("inventory.inLibrary")}
          updateDate={updateDate}
        />
      </div>
      <GameList className={{ filter: "top-24" }} />
    </main>
  );
}
