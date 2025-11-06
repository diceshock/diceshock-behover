import {
  ArrowBendUpRightIcon,
  MagicWandIcon,
  PencilLineIcon,
  PlusIcon,
  PushPinIcon,
  ToggleRightIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import _ from "lodash";

export const Route = createFileRoute("/dash/acitve")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="size-full">
      <form className="w-full flex flex-col items-center gap-6 px-4 pt-4 bg-base-100 z-10">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <input
            type="text"
            placeholder="搜索"
            className="input input-lg w-full sm:w-1/3"
          />

          <ul className="sm:w-2/3 h-auto overflow-x-auto flex flex-row items-center gap-2 py-1">
            <p className="sticky w-20 left-0 h-full py-2 bg-base-100 text-nowrap pointer-events-none">
              标签:
            </p>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-neutral">
                  <PushPinIcon className="size-4" />
                  置顶
                  <XIcon className="size-4" />
                </div>
              </button>
            </li>

            <div className="divider divider-horizontal divider-neutral" />

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>

            <li className="w-fit flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-primary p-0 size-fit"
              >
                <div className="badge shrink-0 text-nowrap badge-lg gap-1 badge-warning">
                  <MagicWandIcon className="size-4" />
                  跑团
                </div>
              </button>
            </li>
          </ul>
        </div>

        <div role="tablist" className="tabs tabs-border">
          <a role="tab" className="tab text-error">
            <TrashIcon />
            垃圾桶
          </a>
          <a role="tab" className="tab tab-active">
            无论状态
          </a>
          <a role="tab" className="tab">
            <ToggleRightIcon weight="fill" />
            已发布
          </a>
        </div>
      </form>

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th></th>
              <td>名称</td>
              <td>状态</td>
              <td>简介</td>
              <td>Tags</td>
              <td>发布日期</td>
              <td>
                <div className="flex items-center gap-4 py-2 h-full">
                  操作
                  <button type="button" className="btn btn-neutral btn-sm">
                    <PlusIcon />
                    新增
                  </button>
                </div>
              </td>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {_.range(200).map((i) => (
              <tr key={i}>
                <th className="z-10">
                  <label className="size-full hover:cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="checkbox"
                    />
                  </label>
                </th>
                <td className="p-0">
                  <button
                    type="button"
                    className="btn btn-ghost w-40 justify-start m-0 truncate line-clamp-1"
                  >
                    🔺三角机构: 地基
                  </button>
                </td>
                <td>
                  <label className="size-full hover:cursor-pointer flex items-center gap-2 text-nowrap">
                    <input type="checkbox" defaultChecked className="toggle" />
                    未发布
                  </label>
                </td>
                <td className="p-0">
                  <button
                    type="button"
                    className="btn btn-ghost justify-start w-full"
                  >
                    <p className="w-full max-w-80 m-0 truncate line-clamp-1">
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                      三角机构船新版本, 玩家一刀000, 员工已解决异像存活
                    </p>
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost w-full justify-start m-0"
                  >
                    <div className="badge shrink-0 text-nowrap badge-sm gap-1 badge-neutral">
                      <PushPinIcon className="size-4" />
                      置顶
                    </div>

                    <div className="badge shrink-0 text-nowrap badge-sm gap-1 badge-warning">
                      <MagicWandIcon className="size-4" />
                      跑团
                    </div>

                    <div className="badge shrink-0 text-nowrap badge-sm gap-1">
                      <UsersIcon className="size-4" />
                      招募
                    </div>
                  </button>
                </td>
                <td>Canada</td>
                <td>
                  <div className="flex items-center gap-4 py-2 h-full">
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-primary"
                    >
                      编辑
                      <PencilLineIcon />
                    </button>

                    <button type="button" className="btn btn-xs btn-ghost">
                      查看
                      <ArrowBendUpRightIcon />
                    </button>

                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-error"
                    >
                      删除
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
