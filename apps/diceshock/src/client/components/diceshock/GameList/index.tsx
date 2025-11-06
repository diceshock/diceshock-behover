import Filter, { filterCfgA } from './Filter';
import React, { useEffect, useState } from 'react';
import RawList from './RawList';
import { useAtomValue } from 'jotai';
import { BoardGame } from '@lib/db';
import trpcClientPublic from '@/shared/utils/trpc';
import { useInView } from '@react-spring/web';
import uniqBy from 'lodash/uniqBy';
import clsx from 'clsx';

const GameList: React.FC<{
  className?: { outer?: string; filter?: string };
}> = ({ className }) => {
  const filter = useAtomValue(filterCfgA);

  const [games, setGames] = useState<BoardGame.BoardGameCol[] | null>(null);
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

      trpcClientPublic.owned.get
        .query({
          page: isSameFilter ? Math.ceil((games?.length ?? 0) / 20) + 1 : 1,
          pageSize: 20,
          params: filter,
        })
        .then((res) => {
          if (res.length < 20) setIsLoadEnd(true);

          const gameArr = res.map((game) => game.content!).filter(Boolean);

          if (!isSameFilter) setGames(gameArr);

          setGames((prev) => uniqBy([...(prev ?? []), ...gameArr], 'id'));
        })
        .finally(() => {
          setIsLoading(false);
          lastFilterRef.current = filter;
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [filter, games, isLoadEnd, isLoading, inView]);

  return (
    <div
      className={clsx(
        'bg-neutral rounded-xl shadow-lg p-2 min-h-[calc(100vh-10rem)]',
        'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-2',
        className?.outer
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
