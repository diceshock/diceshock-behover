import {
  BackspaceIcon,
  ConfettiIcon,
  FlagBannerIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ScrollIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { produce } from "immer";
import { atom, useAtom } from "jotai";
import type React from "react";
import { useCallback, useRef } from "react";
import z from "zod/v4";
import type { Recipe } from "@/shared/types/kits";
import { toggleArr } from "@/shared/utils/arr";

export const filterCfgZ = z.object({
  tags: z.array(z.enum(["SCORE_RACE", "RPG", "PARTY"])),
  numOfPlayers: z.number().nullish(),
  isBestNumOfPlayers: z.boolean(),
  searchWords: z.string(),
});

export type FilterCfg = z.infer<typeof filterCfgZ>;

export const filterCfgA = atom<FilterCfg>({
  tags: [],
  numOfPlayers: null,
  isBestNumOfPlayers: false,
  searchWords: "",
});

const Filter: React.FC<{ className?: string }> = ({ className }) => {
  const [filter, setFilter] = useAtom(filterCfgA);
  const setFilterIm = useCallback(
    (recipe: Recipe<FilterCfg>) => setFilter(produce(recipe)),
    [setFilter],
  );

  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div
      className={clsx(
        "sticky md-20 mb-6 col-span-full w-full flex flex-col z-20",
        className,
      )}
    >
      <div className="w-full flex flex-wrap justify-between">
        <label className="input input-bordered input-lg flex items-center w-full">
          <input
            type="text"
            className="grow"
            placeholder="搜索库存中的桌游"
            value={filter.searchWords}
            onChange={(evt) =>
              setFilterIm((draft) => {
                draft.searchWords = evt.target.value;
              })
            }
          />

          <button
            className="btn btn-md btn-square btn-ghost mx-3 lg:hidden"
            onClick={() => dialogRef.current?.showModal()}
          >
            <FunnelIcon className="size-8" weight="fill" />
          </button>

          <MagnifyingGlassIcon
            weight="bold"
            className="h-7 w-7 opacity-70 hidden sm:block"
          />
        </label>

        <dialog ref={dialogRef} className="modal">
          <div className="modal-box pt-0 px-0">
            <div className="modal-action flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg ml-4">过滤器</h3>

              <form method="dialog">
                <button className="btn btn-square btn-ghost mr-2">
                  <XIcon size={24} weight="regular" />
                </button>
              </form>
            </div>

            <div className="w-full -mx-2 flex flex-col justify-center items-center overflow-hidden">
              <div className="m-2 join [&_svg]:hidden md:[&_svg]:block">
                <label className="btn sm:btn-xl join-item bg-base-100 flex-row flex-nowrap text-nowrap">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={filter.tags.includes("PARTY")}
                    onChange={() =>
                      setFilterIm((draft) => {
                        draft.tags = toggleArr(draft.tags, "PARTY");
                      })
                    }
                  />
                  派对
                  <ConfettiIcon className="h-7 w-7" />
                </label>

                <label className="btn sm:btn-xl join-item bg-base-100 flex-row flex-nowrap text-nowrap">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={filter.tags.includes("SCORE_RACE")}
                    onChange={() =>
                      setFilterIm((draft) => {
                        draft.tags = toggleArr(draft.tags, "SCORE_RACE");
                      })
                    }
                  />
                  跑分
                  <FlagBannerIcon className="h-7 w-7" />
                </label>

                <label className="btn sm:btn-xl join-item bg-base-100 flex-row flex-nowrap text-nowrap">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={filter.tags.includes("RPG")}
                    onChange={() =>
                      setFilterIm((draft) => {
                        draft.tags = toggleArr(draft.tags, "RPG");
                      })
                    }
                  />
                  扮演
                  <ScrollIcon className="h-7 w-7" />
                </label>
              </div>

              <div>
                <div className="flex items-center shrink-0 m-2 p-2 bg-base-100 rounded-b-none md:rounded-b-lg rounded-lg">
                  <input
                    type="range"
                    step={1}
                    min={0}
                    max="10"
                    value={filter.numOfPlayers ?? "0"}
                    onChange={(evt) =>
                      setFilterIm((draft) => {
                        draft.numOfPlayers =
                          evt.target.value === "0"
                            ? null
                            : Number.parseInt(evt.target.value);
                      })
                    }
                    className="range range-lg w-56 sm:w-[20rem] mx-2"
                  />

                  <button
                    onClick={() =>
                      setFilterIm((draft) => {
                        draft.numOfPlayers = null;
                      })
                    }
                    className="btn btn-md w-20 hover:btn-secondary [&_.num]:hover:hidden [&_.del]:hidden [&_.del]:hover:block"
                  >
                    {typeof filter.numOfPlayers === "number" ? (
                      <>
                        <span className="num">
                          {`${filter.numOfPlayers}人`}
                        </span>
                        <BackspaceIcon className="del size-8" />
                      </>
                    ) : (
                      "无限制"
                    )}
                  </button>
                </div>

                <div className="form-control -mt-3 mx-4">
                  <label className="btn btn-lg w-full rounded-t-none m-2 bg-base-100">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={filter.isBestNumOfPlayers}
                      onChange={(evt) =>
                        setFilterIm((draft) => {
                          draft.isBestNumOfPlayers = evt.target.checked;
                        })
                      }
                    />
                    <span className="label-text">最佳游戏人数</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </dialog>

        <div className="mt-2 join hidden lg:flex items-center">
          <label className="btn btn-lg join-item bg-base-100 flex-row flex-nowrap text-nowrap">
            <input
              type="checkbox"
              className="checkbox"
              checked={filter.tags.includes("PARTY")}
              onChange={() =>
                setFilterIm((draft) => {
                  draft.tags = toggleArr(draft.tags, "PARTY");
                })
              }
            />
            派对
            <ConfettiIcon className="h-7 w-7" />
          </label>

          <label className="btn btn-lg join-item bg-base-100 flex-row flex-nowrap text-nowrap">
            <input
              type="checkbox"
              className="checkbox"
              checked={filter.tags.includes("SCORE_RACE")}
              onChange={() =>
                setFilterIm((draft) => {
                  draft.tags = toggleArr(draft.tags, "SCORE_RACE");
                })
              }
            />
            跑分
            <FlagBannerIcon className="h-7 w-7" />
          </label>

          <label className="btn btn-lg join-item bg-base-100 flex-row flex-nowrap text-nowrap">
            <input
              type="checkbox"
              className="checkbox"
              checked={filter.tags.includes("RPG")}
              onChange={() =>
                setFilterIm((draft) => {
                  draft.tags = toggleArr(draft.tags, "RPG");
                })
              }
            />
            扮演
            <ScrollIcon className="h-7 w-7" />
          </label>
        </div>

        <div className="hidden lg:flex items-center shrink-0 mt-2 px-1 bg-base-100 rounded-b-none md:rounded-b-lg rounded-lg">
          <div className="form-control hidden md:flex">
            <label className="btn btn-md">
              <input
                type="checkbox"
                className="checkbox"
                checked={filter.isBestNumOfPlayers}
                onChange={(evt) =>
                  setFilterIm((draft) => {
                    draft.isBestNumOfPlayers = evt.target.checked;
                  })
                }
              />
              <span className="label-text">最佳游戏人数</span>
            </label>
          </div>

          <input
            type="range"
            step={1}
            min={0}
            max="10"
            value={filter.numOfPlayers ?? "0"}
            onChange={(evt) =>
              setFilterIm((draft) => {
                draft.numOfPlayers =
                  evt.target.value === "0"
                    ? null
                    : Number.parseInt(evt.target.value);
              })
            }
            className="range range-lg w-56 sm:w-[20rem] mx-2"
          />

          <button
            onClick={() =>
              setFilterIm((draft) => {
                draft.numOfPlayers = null;
              })
            }
            className="btn btn-md w-20 hover:btn-secondary hover:[&_.num]:hidden [&_.del]:hidden hover:[&_.del]:block"
          >
            {typeof filter.numOfPlayers === "number" ? (
              <>
                <span className="num">{`${filter.numOfPlayers}人`}</span>
                <BackspaceIcon className="del size-8" />
              </>
            ) : (
              "无限制"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filter;
