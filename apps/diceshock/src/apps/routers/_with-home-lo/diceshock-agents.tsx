import { createFileRoute, Link } from "@tanstack/react-router";
import AgentLogo from "@/client/assets/svg/agent-logo.svg?react";
import TableAgent from "@/client/assets/svg/agents/DiceshockItems_table-agent-icon.svg?react";
import TablePassCC from "@/client/assets/svg/agents/DiceshockItems_table-pass-cc-icon.svg?react";
import TablePass from "@/client/assets/svg/agents/DiceshockItems_table-pass-icon.svg?react";
import TablePassLTS from "@/client/assets/svg/agents/DiceshockItems_table-pass-lts-icon.svg?react";
import AgentsChannel from "@/client/assets/svg/agents_channel.svg?react";

export const Route = createFileRoute("/_with-home-lo/diceshock-agents")({
  component: RouteComponent,
});

const PLANS = [
  {
    icon: TableAgent,
    name: "Table AGENT 储值卡",
    desc: "充值福利, 付费折扣.",
  },
  {
    icon: TablePassCC,
    name: "CC桌面通行证",
    desc: "超低廉价格, 办理20个工作日畅玩.",
  },
  {
    icon: TablePass,
    name: "桌面通行证",
    desc: "办理30天畅玩无限!",
  },
  {
    icon: TablePassLTS,
    name: "桌面通行证 LTS",
    desc: "办理365天畅玩无限.",
  },
] as const;

function RouteComponent() {
  return (
    <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-16 sm:pt-24 md:pt-32 pb-12">
      <div className="mx-auto w-full max-w-lg flex flex-col items-center">
        <AgentLogo className="w-8 sm:w-10 mb-3" />
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-center mb-2">
          成为 <span className="text-primary">DiceShock Agents©</span> 会员
        </h1>
        <p className="text-xs sm:text-sm text-base-content/60 mb-4">
          选择你的会员计划
        </p>

        <Link to="/contact-us" className="btn btn-sm btn-primary mb-6">
          联系我们了解详情
        </Link>

        <div className="w-full flex flex-col gap-3 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className="flex items-center gap-4 bg-base-200 rounded-2xl p-3 sm:p-4 border border-base-content/5"
              >
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                  <Icon className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-bold truncate">
                    {plan.name}
                  </p>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    {plan.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-neutral rounded-2xl py-6 sm:py-8 px-4 flex flex-col items-center text-center">
          <AgentsChannel className="w-8 sm:w-10 mb-3 text-neutral-content" />
          <p className="text-neutral-content text-xs sm:text-sm">
            加入任意会员计划即可享用{" "}
            <span className="text-primary font-bold">Agents Channel</span>{" "}
            会员专属频道
          </p>
          <p className="text-neutral-content text-xs sm:text-sm mt-1">
            会员活动, 会员折扣, 会员福利, 一网打尽.
          </p>
        </div>

        <Link to="/contact-us" className="btn btn-sm btn-primary mt-6">
          联系我们
        </Link>
      </div>
    </main>
  );
}
