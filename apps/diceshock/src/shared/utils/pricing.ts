const HALF_HOUR_MS = 30 * 60 * 1000;
const FREE_PERIOD_MS = HALF_HOUR_MS;

interface PlanConditions {
  date:
    | { type: "fixed"; start: string; end: string }
    | { type: "workdays" }
    | { type: "holidays" }
    | { type: "weekly"; days: number[] }
    | { type: "monthly"; nth: number; unit: "natural" | "workday" | "holiday" };
  time:
    | { type: "all_day" }
    | { type: "daytime" }
    | { type: "nighttime" }
    | { type: "custom"; start: string; end: string };
  member:
    | { type: "irrelevant" }
    | { type: "non_member" }
    | { type: "any_member" }
    | { type: "specific"; planTypes: string[] };
  scope: string[];
}

interface PlanEntry {
  plan_type: "fallback" | "conditional";
  name: string;
  sort_order: number;
  enabled: boolean;
  conditions?: unknown;
  billing_type: "hourly" | "fixed";
  price: number;
  cap_enabled: boolean;
  cap_unit: "per_day" | "split_day_night" | null;
  cap_price: number | null;
  cap_price_day: number | null;
  cap_price_night: number | null;
}

export interface SnapshotData {
  config: {
    daytime_start: string;
    daytime_end: string;
  };
  plans: PlanEntry[];
}

export interface PriceBreakdown {
  planName: string;
  planType: "fallback" | "conditional";
  billingType: "hourly" | "fixed";
  unitPrice: number;
  totalMinutes: number;
  billableHalfHours: number;
  rawPrice: number;
  capApplied: boolean;
  capType: string | null;
  finalPrice: number;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isDaytime(date: Date, config: SnapshotData["config"]): boolean {
  const mins = date.getHours() * 60 + date.getMinutes();
  const start = timeToMinutes(config.daytime_start);
  const end = timeToMinutes(config.daytime_end);
  return mins >= start && mins < end;
}

function matchDateCondition(date: Date, cond: PlanConditions["date"]): boolean {
  switch (cond.type) {
    case "workdays": {
      const day = date.getDay();
      return day >= 1 && day <= 5;
    }
    case "holidays": {
      const day = date.getDay();
      return day === 0 || day === 6;
    }
    case "weekly":
      return cond.days.includes(date.getDay());
    case "fixed": {
      const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return mmdd >= cond.start && mmdd <= cond.end;
    }
    case "monthly": {
      if (cond.unit === "natural") return date.getDate() === cond.nth;
      return false;
    }
    default:
      return false;
  }
}

function matchTimeCondition(
  date: Date,
  cond: PlanConditions["time"],
  config: SnapshotData["config"],
): boolean {
  switch (cond.type) {
    case "all_day":
      return true;
    case "daytime":
      return isDaytime(date, config);
    case "nighttime":
      return !isDaytime(date, config);
    case "custom": {
      const mins = date.getHours() * 60 + date.getMinutes();
      return (
        mins >= timeToMinutes(cond.start) && mins < timeToMinutes(cond.end)
      );
    }
    default:
      return true;
  }
}

function matchScopeCondition(tableScope: string, scope: string[]): boolean {
  if (scope.length === 0) return true;
  return scope.includes(tableScope);
}

function findMatchingPlan(
  startDate: Date,
  tableScope: string,
  snapshot: SnapshotData,
): PlanEntry | null {
  const conditionals = snapshot.plans
    .filter((p) => p.plan_type === "conditional" && p.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const plan of conditionals) {
    const cond = plan.conditions as PlanConditions | null;
    if (!cond) continue;

    const dateMatch = matchDateCondition(startDate, cond.date);
    const timeMatch = matchTimeCondition(startDate, cond.time, snapshot.config);
    const scopeMatch = matchScopeCondition(tableScope, cond.scope);

    if (dateMatch && timeMatch && scopeMatch) return plan;
  }

  return snapshot.plans.find((p) => p.plan_type === "fallback") ?? null;
}

export function calculatePrice(
  startAt: number,
  endAt: number,
  tableScope: string,
  snapshot: SnapshotData | null,
  pauseLogs?: Array<{ pausedAt: number; resumedAt: number | null }>,
): PriceBreakdown | null {
  if (!snapshot || snapshot.plans.length === 0) return null;

  const totalMs = Math.max(0, endAt - startAt);
  const totalMinutes = Math.floor(totalMs / 60000);

  let pausedMs = 0;
  if (pauseLogs && pauseLogs.length > 0) {
    for (const log of pauseLogs) {
      const pStart = Math.max(log.pausedAt, startAt);
      const pEnd = Math.min(log.resumedAt ?? endAt, endAt);
      if (pEnd > pStart) pausedMs += pEnd - pStart;
    }
  }

  const effectiveMs = Math.max(0, totalMs - pausedMs);
  const billableMs = Math.max(0, effectiveMs - FREE_PERIOD_MS);
  const billableHalfHours = Math.ceil(billableMs / HALF_HOUR_MS);

  const startDate = new Date(startAt);
  const plan = findMatchingPlan(startDate, tableScope, snapshot);
  if (!plan) return null;

  let rawPrice: number;
  if (plan.billing_type === "fixed") {
    rawPrice = plan.price;
  } else {
    const pricePerHalfHour = Math.round(plan.price / 2);
    rawPrice = pricePerHalfHour * billableHalfHours;
  }

  let finalPrice = rawPrice;
  let capApplied = false;
  let capType: string | null = null;

  if (plan.billing_type === "hourly" && plan.cap_enabled) {
    if (plan.cap_unit === "per_day" && plan.cap_price != null) {
      if (finalPrice > plan.cap_price) {
        finalPrice = plan.cap_price;
        capApplied = true;
        capType = "per_day";
      }
    } else if (plan.cap_unit === "split_day_night") {
      const isDay = isDaytime(startDate, snapshot.config);
      const capVal = isDay ? plan.cap_price_day : plan.cap_price_night;
      if (capVal != null && finalPrice > capVal) {
        finalPrice = capVal;
        capApplied = true;
        capType = isDay ? "daytime" : "nighttime";
      }
    }
  }

  return {
    planName: plan.name,
    planType: plan.plan_type,
    billingType: plan.billing_type,
    unitPrice: plan.price,
    totalMinutes,
    billableHalfHours,
    rawPrice,
    capApplied,
    capType,
    finalPrice,
  };
}

export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}
