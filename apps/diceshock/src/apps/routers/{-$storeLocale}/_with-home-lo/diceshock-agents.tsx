import { createFileRoute, Link } from "@tanstack/react-router";
import AgentLogo from "@/client/assets/svg/agent-logo.svg?react";
import TableAgent from "@/client/assets/svg/agents/DiceshockItems_table-agent-icon.svg?react";
import TablePassCC from "@/client/assets/svg/agents/DiceshockItems_table-pass-cc-icon.svg?react";
import TablePass from "@/client/assets/svg/agents/DiceshockItems_table-pass-icon.svg?react";
import TablePassLTS from "@/client/assets/svg/agents/DiceshockItems_table-pass-lts-icon.svg?react";
import AgentsChannel from "@/client/assets/svg/agents_channel.svg?react";
import { useTranslation } from "@/client/hooks/useTranslation";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/diceshock-agents",
)({
  component: RouteComponent,
});

const PLANS = [
  {
    icon: TableAgent,
    nameKey: "agents.agentStoredValue" as const,
    descKey: "agents.agentStoredValueDesc" as const,
  },
  {
    icon: TablePassCC,
    nameKey: "agents.ccPass" as const,
    descKey: "agents.ccPassDesc" as const,
  },
  {
    icon: TablePass,
    nameKey: "agents.tablePass" as const,
    descKey: "agents.tablePassDesc" as const,
  },
  {
    icon: TablePassLTS,
    nameKey: "agents.ltsPass" as const,
    descKey: "agents.ltsPassDesc" as const,
  },
] as const;

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-16 sm:pt-24 md:pt-32 pb-12">
      <div className="mx-auto w-full max-w-lg flex flex-col items-center">
        <AgentLogo className="w-8 sm:w-10 mb-3" />
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-center mb-2">
          {t("agents.become")}{" "}
          <span className="text-primary">DiceShock Agents©</span>{" "}
          {t("agents.member")}
        </h1>
        <p className="text-xs sm:text-sm text-base-content/60 mb-4">
          {t("agents.choosePlan")}
        </p>

        <Link
          to="/{-$storeLocale}/contact-us"
          className="btn btn-sm btn-primary mb-6"
        >
          {t("agents.contactForDetails")}
        </Link>

        <div className="w-full flex flex-col gap-3 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.nameKey}
                className="flex items-center gap-4 bg-base-200 rounded-2xl p-3 sm:p-4 border border-base-content/5"
              >
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                  <Icon className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-bold truncate">
                    {t(plan.nameKey)}
                  </p>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    {t(plan.descKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-neutral rounded-2xl py-6 sm:py-8 px-4 flex flex-col items-center text-center">
          <AgentsChannel className="w-8 sm:w-10 mb-3 text-neutral-content" />
          <p className="text-neutral-content text-xs sm:text-sm">
            {t("agents.joinAnyPlan")}{" "}
            <span className="text-primary font-bold">Agents Channel</span>{" "}
            {t("agents.exclusiveChannel")}
          </p>
          <p className="text-neutral-content text-xs sm:text-sm mt-1">
            {t("agents.allBenefits")}
          </p>
        </div>

        <Link
          to="/{-$storeLocale}/contact-us"
          className="btn btn-sm btn-primary mt-6"
        >
          {t("agents.contactUs")}
        </Link>
      </div>
    </main>
  );
}
