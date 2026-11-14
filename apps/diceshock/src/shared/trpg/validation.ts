import { z } from "zod/v4";

export const trpgId = z.string().trim().min(1).max(100);
export const trpgOffset = z.number().int().min(0).max(10000).default(0);
export const trpgRevision = z.number().int().positive();
export const trpgReason = z.string().trim().max(300).default("");
export const sessionInput = z
  .object({
    requestId: z.uuid(),
    storeId: trpgId,
    tableId: trpgId.nullable(),
    hostId: trpgId.optional(),
    title: z.string().trim().min(1).max(100),
    moduleName: z.string().trim().max(100),
    gameSystem: z.string().trim().min(1).max(40),
    description: z.string().trim().min(1).max(1000),
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    deadline: z.iso.datetime({ offset: true }).nullable(),
    timeHint: z.string().trim().max(40).default(""),
    tags: z.array(z.string().trim().min(1).max(20)).max(8).default([]),
    capacity: z.number().int().min(1).max(6),
    minimum: z.number().int().min(1).max(6),
    durationMinutes: z.number().int().min(1).max(1440),
    feeCents: z.number().int().min(0).max(999999),
  })
  .refine(
    (v) =>
      v.minimum <= v.capacity &&
      (v.startsAt === null
        ? v.deadline === null && v.tableId === null
        : !!v.tableId &&
          !!v.deadline &&
          Date.parse(v.deadline) <= Date.parse(v.startsAt)),
    "请核对席位、桌位和报名时间",
  );
export type SessionInput = z.output<typeof sessionInput>;
export const sessionAction = z.enum([
  "approve",
  "return",
  "cancel",
  "complete",
]);
export const bookingAction = z.enum(["approve", "reject", "withdraw"]);
export const sessionLabels = {
  pending: "待审核",
  returned: "已退回",
  published: "已发布",
  cancelled: "已流团",
  completed: "已结团",
};
export const bookingLabels = {
  interested: "已登记意向",
  pending: "待审核",
  confirmed: "已确认",
  rejected: "已退回",
  withdrawn: "已取消",
};
