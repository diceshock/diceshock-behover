const HALF_HOUR_MS = 30 * 60 * 1000;

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
  identity?: ("temporary" | "registered")[];
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
  points: number;
  cap_enabled: boolean;
  cap_unit: "per_day" | "split_day_night" | null;
  cap_price: number | null;
  cap_price_day: number | null;
  cap_price_night: number | null;
  cap_points: number | null;
  cap_points_day: number | null;
  cap_points_night: number | null;
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
  unitPoints: number;
  totalMinutes: number;
  billableHalfHours: number;
  rawPrice: number;
  rawPoints: number;
  capApplied: boolean;
  capType: string | null;
  finalPrice: number;
  finalPoints: number;
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
  if (!snapshot || !Array.isArray(snapshot.plans) || snapshot.plans.length === 0) return null;

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

  // Free period: if effective time ≤ 30 min, entire session is free.
  // Once it exceeds 30 min, ALL time is billed (no deduction for the first half hour).
  if (effectiveMs <= HALF_HOUR_MS) {
    // Find any matching plan just for metadata
    const startDate = new Date(startAt);
    const plan = findMatchingPlan(startDate, tableScope, snapshot);
    if (!plan) return null;
    return {
      planName: plan.name,
      planType: plan.plan_type,
      billingType: plan.billing_type,
      unitPrice: plan.price,
      unitPoints: plan.points ?? 0,
      totalMinutes,
      billableHalfHours: 0,
      rawPrice: 0,
      rawPoints: 0,
      capApplied: false,
      capType: null,
      finalPrice: 0,
      finalPoints: 0,
    };
  }

  // Beyond 30 min: bill every half-hour segment independently.
  // Each segment matches conditions based on its own start timestamp.
  const billableHalfHours = Math.ceil(effectiveMs / HALF_HOUR_MS);

  // Build active (non-paused) segments by removing paused intervals
  // We need to map each billable half-hour back to a real timestamp for plan matching.
  const activeSegmentStarts = computeActiveSegmentStarts(
    startAt,
    endAt,
    billableHalfHours,
    pauseLogs,
  );

  let rawPrice = 0;
  let rawPoints = 0;
  // Count half-hour segments per plan, then price = plan.price × (segments × 0.5)
  const planSegments = new Map<string, { halfHours: number; plan: PlanEntry }>();
  let lastMatchedPlan: PlanEntry | null = null;

  for (const segTs of activeSegmentStarts) {
    const segDate = new Date(segTs);
    const matched = findMatchingPlan(segDate, tableScope, snapshot);
    const plan: PlanEntry = matched ?? lastMatchedPlan!;
    if (!matched && !lastMatchedPlan) continue;
    lastMatchedPlan = plan;

    if (plan.billing_type === "fixed") {
      // Fixed plans charge once regardless of segments
      if (!planSegments.has(plan.name)) {
        planSegments.set(plan.name, { halfHours: 0, plan });
      }
    } else {
      const existing = planSegments.get(plan.name);
      if (existing) {
        existing.halfHours += 1;
      } else {
        planSegments.set(plan.name, { halfHours: 1, plan });
      }
    }
  }

  // Compute price per plan: price = plan.price × (halfHours × 0.5)
  // Then apply caps, then sum all plans.
  let capApplied = false;
  let capType: string | null = null;
  let dominantPlan: PlanEntry | null = null;
  let maxContribution = -1;
  let finalPrice = 0;
  let finalPoints = 0;

  for (const [, entry] of planSegments) {
    const plan = entry.plan;
    let price: number;
    let points: number;

    if (plan.billing_type === "fixed") {
      price = plan.price;
      points = plan.points ?? 0;
    } else {
      // Round half-hours to billable hours (四舍五入: 1段=1h, 2段=1h, 3段=2h, 4段=2h, 5段=3h...)
      const billableHoursForPlan = Math.round(entry.halfHours * 0.5);
      price = plan.price * billableHoursForPlan;
      points = (plan.points ?? 0) * billableHoursForPlan;
    }

    rawPrice += price;
    rawPoints += points;

    // Apply caps
    if (plan.billing_type === "hourly" && plan.cap_enabled) {
      if (plan.cap_unit === "per_day") {
        if (plan.cap_price != null && price > plan.cap_price) {
          price = plan.cap_price;
          capApplied = true;
          capType = "per_day";
        }
        if (plan.cap_points != null && points > plan.cap_points) {
          points = plan.cap_points;
          capApplied = true;
          capType = "per_day";
        }
      } else if (plan.cap_unit === "split_day_night") {
        // Determine day/night based on the majority of this plan's segments
        const refDate = new Date(activeSegmentStarts[0]);
        const isDay = isDaytime(refDate, snapshot.config);
        const capVal = isDay ? plan.cap_price_day : plan.cap_price_night;
        if (capVal != null && price > capVal) {
          price = capVal;
          capApplied = true;
          capType = isDay ? "daytime" : "nighttime";
        }
        const capPts = isDay ? plan.cap_points_day : plan.cap_points_night;
        if (capPts != null && points > capPts) {
          points = capPts;
          capApplied = true;
          capType = isDay ? "daytime" : "nighttime";
        }
      }
    }

    finalPrice += price;
    finalPoints += points;

    if (price > maxContribution) {
      maxContribution = price;
      dominantPlan = plan;
    }
  }

  // Use the dominant plan (highest contribution) for metadata
  if (!dominantPlan) {
    const startDate = new Date(startAt);
    dominantPlan = findMatchingPlan(startDate, tableScope, snapshot);
    if (!dominantPlan) return null;
  }

  return {
    planName: dominantPlan.name,
    planType: dominantPlan.plan_type,
    billingType: dominantPlan.billing_type,
    unitPrice: dominantPlan.price,
    unitPoints: dominantPlan.points ?? 0,
    totalMinutes,
    billableHalfHours,
    rawPrice,
    rawPoints,
    capApplied,
    capType,
    finalPrice,
    finalPoints,
  };
}

/**
 * Compute the real-time start timestamp for each active half-hour segment,
 * skipping paused intervals. Used for per-segment plan matching.
 */
function computeActiveSegmentStarts(
  startAt: number,
  endAt: number,
  billableHalfHours: number,
  pauseLogs?: Array<{ pausedAt: number; resumedAt: number | null }>,
): number[] {
  if (!pauseLogs || pauseLogs.length === 0) {
    // No pauses: segments are contiguous from startAt
    const starts: number[] = [];
    for (let i = 0; i < billableHalfHours; i++) {
      starts.push(startAt + i * HALF_HOUR_MS);
    }
    return starts;
  }

  // Sort pauses and build list of active intervals
  const sortedPauses = pauseLogs
    .map((l) => ({
      start: Math.max(l.pausedAt, startAt),
      end: Math.min(l.resumedAt ?? endAt, endAt),
    }))
    .filter((p) => p.end > p.start)
    .sort((a, b) => a.start - b.start);

  // Walk through time, accumulating active half-hours
  const starts: number[] = [];
  let cursor = startAt;
  let pauseIdx = 0;
  let activeAccum = 0;

  while (starts.length < billableHalfHours && cursor < endAt) {
    // Skip into any pause that covers cursor
    while (pauseIdx < sortedPauses.length && sortedPauses[pauseIdx].end <= cursor) {
      pauseIdx++;
    }
    if (pauseIdx < sortedPauses.length && sortedPauses[pauseIdx].start <= cursor) {
      cursor = sortedPauses[pauseIdx].end;
      pauseIdx++;
      continue;
    }

    // Find end of current active chunk
    const chunkEnd = pauseIdx < sortedPauses.length
      ? Math.min(sortedPauses[pauseIdx].start, endAt)
      : endAt;

    // Walk this active chunk in half-hour segments
    while (cursor < chunkEnd && starts.length < billableHalfHours) {
      if (activeAccum === 0) {
        starts.push(cursor);
      }
      const remaining = HALF_HOUR_MS - activeAccum;
      const available = chunkEnd - cursor;
      if (available >= remaining) {
        cursor += remaining;
        activeAccum = 0;
      } else {
        cursor += available;
        activeAccum += available;
        break; // chunk exhausted, move to next active chunk
      }
    }
  }

  return starts;
}

export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function formatPoints(points: number): string {
  return `${points}点`;
}

/**
 * Format dual price display: shows whichever is non-zero, or both if both are present.
 * Supports negative values for deductions.
 */
export function formatDualPrice(cents: number | null | undefined, points: number | null | undefined): string {
  const c = cents ?? 0;
  const p = points ?? 0;
  const parts: string[] = [];
  if (c !== 0) parts.push(formatPrice(c));
  if (p !== 0) parts.push(formatPoints(p));
  if (parts.length === 0) return "¥0.00";
  return parts.join(" ");
}
