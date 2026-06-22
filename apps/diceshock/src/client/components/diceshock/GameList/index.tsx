import { useApolloClient } from "@apollo/client";
import type { BoardGame } from "@lib/db";
import { useInView } from "@react-spring/web";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import uniqBy from "lodash/uniqBy";
import React, { useEffect, useState } from "react";
import { GetOwnedBoardGamesDocument } from "@/client/graphql/__generated__";
import Filter, { filterCfgA } from "./Filter";
import RawList, { type GameWithDbId } from "./RawList";

const GameList: React.FC<{
  className?: { outer?: string; filter?: string };
}> = ({ className }) => {
  const filter = useAtomValue(filterCfgA);
  const client = useApolloClient();

  const [games, setGames] = useState<GameWithDbId[] | null>(null);
  const [isLoadEnd, setIsLoadEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ref, inView] = useInView();

  const lastFilterRef = React.useRef<typeof filter | null>(null);
  useEffect(() => {
    const isSameFilter = lastFilterRef.current === filter;

    const timeout = setTimeout(() => {
      if ((isLoadEnd && isSameFilter) || (!inView && isSameFilter) || isLoading)
        return;

      setIsLoading(true);
      if (!isSameFilter) setIsLoadEnd(false);

      const page = isSameFilter ? Math.ceil((games?.length ?? 0) / 20) + 1 : 1;
      client
        .query({
          query: GetOwnedBoardGamesDocument,
          variables: {
            input: {
              pagination: { offset: (page - 1) * 20, limit: 20 },
              searchWords: filter.searchWords || undefined,
              numOfPlayers: filter.numOfPlayers ?? undefined,
              isBestNumOfPlayers: filter.isBestNumOfPlayers || undefined,
              tags: filter.tags?.length ? filter.tags : undefined,
            },
          },
        })
        .then((res) => {
          const ownedBoardGames = res.data.ownedBoardGames as Array<{
            id: string;
            content: string | null;
            schName: string | null;
            engName: string | null;
          }>;
          if (ownedBoardGames.length < 20) setIsLoadEnd(true);

          const gameArr = ownedBoardGames
            .filter((game) => game.content)
            .map((game) => ({
              ...(JSON.parse(game.content!) as BoardGame.BoardGameCol),
              dbId: game.id,
            }));

          if (!isSameFilter) setGames(gameArr);

          setGames((prev) => uniqBy([...(prev ?? []), ...gameArr], "id"));
        })
        .finally(() => {
          setIsLoading(false);
          lastFilterRef.current = filter;
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [filter, games, isLoadEnd, isLoading, inView, client]);

  return (
    <div
      className={clsx(
        "bg-neutral rounded-xl shadow-lg p-2 min-h-[calc(100vh-10rem)]",
        "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-2",
        className?.outer,
      )}
    >
      <Filter className={className?.filter} />

      <RawList games={games} />

      <div
        ref={ref}
        className="w-full h-24 col-span-full flex items-center justify-center"
      >
        {isLoading && <span className="loading loading-dots text-primary" />}
      </div>
    </div>
  );
};

export default GameList;
