import type React from "react";
import TableAgent from "@/client/assets/svg/agents/DiceshockItems_table-agent-icon.svg?react";
import TablePassCC from "@/client/assets/svg/agents/DiceshockItems_table-pass-cc-icon.svg?react";
import TablePass from "@/client/assets/svg/agents/DiceshockItems_table-pass-icon.svg?react";
import TablePassLTS from "@/client/assets/svg/agents/DiceshockItems_table-pass-lts-icon.svg?react";

export type PlanType = "monthly" | "monthly_cc" | "yearly" | "stored_value";

export interface MembershipPlan {
  id: string;
  user_id: string;
  plan_type: PlanType;
  amount: number | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  create_at: Date | string | null;
  update_at: Date | string | null;
}

const PLAN_CONFIG: Record<
  PlanType,
  {
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    badgeClass: string;
    priority: number;
  }
> = {
  yearly: {
    label: "桌面通行证 LTS",
    icon: TablePassLTS,
    badgeClass: "badge-warning",
    priority: 1,
  },
  monthly: {
    label: "桌面通行证",
    icon: TablePass,
    badgeClass: "badge-primary",
    priority: 2,
  },
  monthly_cc: {
    label: "CC桌面通行证",
    icon: TablePassCC,
    badgeClass: "badge-secondary",
    priority: 3,
  },
  stored_value: {
    label: "Table AGENT",
    icon: TableAgent,
    badgeClass: "badge-accent",
    priority: 4,
  },
};

export function getPlanConfig(planType: PlanType) {
  return PLAN_CONFIG[planType];
}

export function isActivePlan(plan: MembershipPlan): boolean {
  const now = Date.now();
  const start = plan.start_date ? new Date(plan.start_date).getTime() : 0;
  const end = plan.end_date ? new Date(plan.end_date).getTime() : null;
  if (plan.plan_type === "stored_value") return (plan.amount ?? 0) > 0;
  return start <= now && (end === null || end >= now);
}

export function getHighestPriorityPlan(
  plans: MembershipPlan[],
): MembershipPlan | null {
  const active = plans.filter(isActivePlan);
  if (active.length === 0) return null;
  return active.sort(
    (a, b) =>
      PLAN_CONFIG[a.plan_type].priority - PLAN_CONFIG[b.plan_type].priority,
  )[0];
}

export function getStoredValueBalance(plans: MembershipPlan[]): number {
  return plans
    .filter((p) => p.plan_type === "stored_value")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
}

const MembershipBadge: React.FC<{
  plans: MembershipPlan[];
  showAll?: boolean;
  className?: string;
}> = ({ plans, showAll = false, className }) => {
  const activePlans = plans.filter(isActivePlan);

  if (activePlans.length === 0) return null;

  if (!showAll) {
    const highest = getHighestPriorityPlan(plans);
    if (!highest) return null;
    const config = PLAN_CONFIG[highest.plan_type];
    return (
      <span
        className={`badge ${config.badgeClass} badge-sm gap-1 ${className ?? ""}`}
      >
        <config.icon className="size-3" />
        {config.label}
      </span>
    );
  }

  const sorted = [...activePlans].sort(
    (a, b) =>
      PLAN_CONFIG[a.plan_type].priority - PLAN_CONFIG[b.plan_type].priority,
  );

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
      {sorted.map((plan) => {
        const config = PLAN_CONFIG[plan.plan_type];
        return (
          <span
            key={plan.id}
            className={`badge ${config.badgeClass} badge-sm gap-1`}
          >
            <config.icon className="size-3" />
            {config.label}
            {plan.plan_type === "stored_value" && plan.amount != null && (
              <span className="font-mono">
                ¥{(plan.amount / 100).toFixed(0)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default MembershipBadge;
