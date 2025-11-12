import type { BoardGame } from "@lib/db";
import _ from "lodash";
import type React from "react";
import Swing from "../Swing";
import LoadingImg from "./LoadingImg";

const RawList: React.FC<{ games: BoardGame.BoardGameCol[] | null }> = ({
  games,
}) => {
  if (!games) return;

  return _.unionBy(games, "id").map(
    ({
      id,
      sch_name,
      eng_name,
      sch_cover_url,
      eng_cover_url,
      category,
      mode,
      gstone_rating,
    }) => (
      <div
        key={id}
        className="tooltip tooltip-bottom"
        data-tip={`${sch_name || eng_name}${sch_name ? ` (${eng_name})` : ""}`}
      >
        <Swing
          className={{
            outer:
              "size-min place-self-center [&_.game-meta]:hover:flex [&_.cover]:hover:flex hover:z-10",
            inner:
              "size-min m-2 w-[7.6rem] h-32 sm:w-48 sm:h-60 lg:w-[18vw] lg:h-[22.5vw] max-w-[24rem] max-h-120 transform-3d ",
          }}
        >
          <div className="card size-full relative bg-base-300 overflow-hidden">
            <LoadingImg
              className="size-full object-cover"
              width={1600}
              height={900}
              src={sch_cover_url || eng_cover_url}
              alt="Game"
            />

            <div className="cover hidden absolute top-0 size-full bg-linear-to-b from-black/10 to-black/70" />
          </div>

          <div className="absolute top-3 -left-2 transform-[translateZ(1rem)]">
            <h5 className="max-w-32 sm:max-w-48 text-sm lg:text-xl sm:text-md shadow-lg text-nowrap overflow-hidden text-ellipsis bg-primary text-black font-bold px-2 py-1">
              {sch_name || eng_name}
            </h5>
          </div>

          <div className="absolute top-12 lg:top-14 -left-2 [transform:translateZ(1rem)] w-[12rem] flex justify-start">
            {(Array.isArray(category) ? category : [category]).map(
              ({ sch_domain_value, eng_domain_value }) => (
                <span
                  key={eng_domain_value}
                  className="bg-accent text-black text-sm lg:text-md font-bold px-1 shadow-lg mr-1"
                >
                  {sch_domain_value || eng_domain_value}
                </span>
              ),
            )}

            {(Array.isArray(mode) ? mode : [mode])
              .map(({ sch_domain_value, eng_domain_value }) => (
                <span
                  key={eng_domain_value}
                  className="bg-primary text-black text-sm lg:text-md font-bold px-1 shadow-lg mr-1"
                >
                  {sch_domain_value}
                </span>
              ))
              .slice(0, 2)}
          </div>

          {gstone_rating >= 0.5 && (
            <div
              className="hidden lg:flex justify-center items-center absolute -bottom-2 -right-2 [transform:translateZ(1rem)] radial-progress text-primary border-0"
              style={
                {
                  "--value": gstone_rating * 10,
                } as React.CSSProperties
              }
              role="progressbar"
            >
              <span className="text-xl font-bold">
                {gstone_rating.toFixed(1)}
              </span>

              <span className="text-xs">/10</span>
            </div>
          )}
        </Swing>
      </div>
    ),
  );
};

export default RawList;
