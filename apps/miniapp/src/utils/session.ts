import type {
  BookingFieldsFragment,
  SessionFieldsFragment,
} from "../graphql/__generated__/operations";
import { pricingFor } from "./pricing";

const labels: Record<string, string> = {
  interested: "已登记意向",
  pending: "待门店审核",
  confirmed: "报名已确认",
  rejected: "报名已退回",
  withdrawn: "报名已取消",
};

export type SessionRow = SessionFieldsFragment & Partial<BookingFieldsFragment>;

export type SessionView<T extends SessionRow = SessionRow> = T & {
  timeText: string;
  deadlineText: string;
  typeText: string;
  feeText: string;
  feeDetail: string;
  progressText: string;
  bookingText: string;
  joinText: string;
  canJoin: boolean;
  canWithdraw: boolean;
  priorityText: string;
};

export function localTime(iso: string | null | undefined): string {
  return iso
    ? new Date(Date.parse(iso) + 28800000)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")
    : "时间待定";
}

export function sessionView<T extends SessionRow>(row: T): SessionView<T> {
  const price = pricingFor(row.sessionType);
  const booking = row.booking ?? null;
  return {
    ...row,
    timeText: localTime(row.startsAt),
    deadlineText: localTime(row.deadline),
    typeText: price.label,
    feeText: price.summary,
    feeDetail: price.detail,
    progressText:
      row.confirmedCount >= row.minimum
        ? "已成团"
        : `还差 ${row.minimum - row.confirmedCount} 人成团`,
    bookingText:
      row.status === "cancelled"
        ? "场次已取消"
        : row.status === "completed"
          ? "已结团"
          : (booking && labels[booking.status]) || "",
    joinText:
      booking?.status === "interested" && row.startsAt
        ? "确认正式报名"
        : row.startsAt
          ? "报名参加"
          : "登记意向",
    canJoin:
      row.registrationOpen &&
      (!booking ||
        ["withdrawn", "rejected"].includes(booking.status) ||
        (booking.status === "interested" && !!row.startsAt)),
    canWithdraw:
      row.registrationOpen &&
      ["interested", "pending", "confirmed"].includes(booking?.status ?? ""),
    priorityText:
      row.priorityUntil && Date.parse(row.priorityUntil) > Date.now()
        ? `意向玩家优先确认至 ${localTime(row.priorityUntil)}`
        : "",
  };
}
