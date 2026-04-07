import db, {
  accounts,
  mahjongMatchesTable,
  mahjongRegistrationsTable,
  userInfoTable,
} from "@lib/db";
import { TRPCError } from "@trpc/server";
import { eq, like } from "drizzle-orm";
import z from "zod/v4";
import { getSmsTmpCodeKey } from "@/server/utils/auth";
import { protectedProcedure } from "./baseTRPC";
import { type GszPageResult, gszFetch } from "./gszApi";

const saveMatch = protectedProcedure
  .input(
    z.object({
      tableId: z.string().optional(),
      matchType: z.enum(["store", "tournament"]),
      mode: z.enum(["3p", "4p"]),
      format: z.enum(["tonpuu", "hanchan"]),
      startedAt: z.number(),
      endedAt: z.number(),
      terminationReason: z.enum([
        "score_complete",
        "vote",
        "admin_abort",
        "order_invalid",
      ]),
      players: z.array(
        z.object({
          userId: z.string(),
          nickname: z.string(),
          seat: z.string().nullable(),
          finalScore: z.number(),
        }),
      ),
      config: z.object({
        type: z.string(),
        mode: z.string(),
        format: z.string(),
      }),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [match] = await tdb
      .insert(mahjongMatchesTable)
      .values({
        table_id: input.tableId ?? null,
        match_type: input.matchType,
        mode: input.mode,
        format: input.format,
        started_at: new Date(input.startedAt),
        ended_at: new Date(input.endedAt),
        termination_reason: input.terminationReason,
        players: input.players,
        config: input.config,
      })
      .returning();
    return match;
  });

const getMyMatches = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const matches = await tdb.query.mahjongMatchesTable.findMany({
    where: (m) => like(m.players, `%"userId":"${ctx.userId}"%`),
    orderBy: (m, { desc }) => desc(m.created_at),
    limit: 50,
  });
  return matches;
});

const getMatchById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    return tdb.query.mahjongMatchesTable.findFirst({
      where: (m, { eq }) => eq(m.id, input.id),
    });
  });

const checkRegistration = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const userInfo = await tdb.query.userInfoTable.findFirst({
    where: (u, { eq }) => eq(u.id, ctx.userId),
    columns: { phone: true, nickname: true },
  });

  const registration = await tdb.query.mahjongRegistrationsTable.findFirst({
    where: (r, { eq }) => eq(r.user_id, ctx.userId),
  });

  return {
    hasPhone: !!userInfo?.phone,
    phone: userInfo?.phone ?? null,
    nickname: userInfo?.nickname ?? null,
    registered: !!registration,
    gszName: registration?.gsz_name ?? null,
    gszId: registration?.gsz_id ?? null,
    gszSynced: registration?.gsz_synced ?? false,
    gszError: registration?.gsz_error ?? null,
  };
});

const register = protectedProcedure
  .input(
    z.object({
      phone: z.string().nonempty(),
      smsCode: z.string().nonempty(),
      gszName: z.string().nonempty(),
      syncNickname: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { KV } = ctx.env;

    const existing = await tdb.query.mahjongRegistrationsTable.findFirst({
      where: (r, { eq }) => eq(r.user_id, ctx.userId),
    });
    if (existing) {
      return {
        registered: true,
        gszName: existing.gsz_name,
        gszId: existing.gsz_id,
        gszSynced: existing.gsz_synced,
        gszError: existing.gsz_error,
        alreadyExisted: true,
      };
    }

    const userInfo = await tdb.query.userInfoTable.findFirst({
      where: (u, { eq }) => eq(u.id, ctx.userId),
      columns: { phone: true },
    });

    const hasPhone = !!userInfo?.phone;
    if (!hasPhone) {
      const devSmsCode = ctx.env.DEV_SMS_CODE;
      const kvKey = getSmsTmpCodeKey(input.phone);
      const storedCode = devSmsCode || (await KV.get(kvKey));
      if (!storedCode || storedCode !== input.smsCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "验证码错误或已过期",
        });
      }
      await KV.delete(kvKey);
    }

    const phoneToUse = hasPhone ? userInfo.phone! : input.phone;

    let gszId: number | null = null;
    let gszName = input.gszName;
    let gszSynced = false;
    let gszError: string | null = null;

    try {
      const gszResult = await gszFetch<GszPageResult>(
        ctx.env,
        "/gszapi/open/customer/page",
        { params: { phone: phoneToUse } },
        { pageNo: 1, pageSize: 1 },
      );

      if (gszResult.records.length > 0) {
        const record = gszResult.records[0];
        gszId = record.id;
        gszName = record.name;
      } else {
        gszId = await gszFetch<number>(ctx.env, "/gszapi/open/register", {
          params: { username: input.gszName, phone: phoneToUse },
        });
      }
      gszSynced = true;
    } catch (err) {
      gszError = err instanceof Error ? err.message : "立直麻将系统暂时不可用";
    }

    if (!hasPhone) {
      await tdb
        .update(userInfoTable)
        .set({ phone: phoneToUse })
        .where(eq(userInfoTable.id, ctx.userId));

      const existingAccount = await tdb.query.accounts.findFirst({
        where: (acc, { eq, and }) =>
          and(eq(acc.userId, ctx.userId), eq(acc.provider, "SMS")),
      });
      if (existingAccount) {
        await tdb
          .update(accounts)
          .set({ providerAccountId: phoneToUse })
          .where(eq(accounts.userId, ctx.userId));
      } else {
        await tdb.insert(accounts).values({
          userId: ctx.userId,
          type: "credentials" as never,
          provider: "SMS",
          providerAccountId: phoneToUse,
        });
      }
    }

    const [reg] = await tdb
      .insert(mahjongRegistrationsTable)
      .values({
        user_id: ctx.userId,
        phone: phoneToUse,
        gsz_id: gszId,
        gsz_name: gszName,
        gsz_synced: gszSynced,
        gsz_error: gszError,
        gsz_synced_at: gszSynced ? new Date() : null,
      })
      .returning();

    let nicknameSynced = false;
    if (input.syncNickname && gszName) {
      await tdb
        .update(userInfoTable)
        .set({ nickname: gszName })
        .where(eq(userInfoTable.id, ctx.userId));
      nicknameSynced = true;
    }

    return {
      registered: true,
      gszName: reg.gsz_name,
      gszId: reg.gsz_id,
      gszSynced: reg.gsz_synced,
      gszError: reg.gsz_error,
      alreadyExisted: false,
      nicknameSynced,
    };
  });

export default {
  saveMatch,
  getMyMatches,
  getMatchById,
  checkRegistration,
  register,
};
