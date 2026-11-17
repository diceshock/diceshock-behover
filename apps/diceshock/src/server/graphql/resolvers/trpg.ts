import { userInfoTable, users } from "@lib/db";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  bookingAction,
  sessionAction,
  sessionInput,
  trpgId,
  trpgOffset,
  trpgReason,
  trpgRevision,
} from "@/shared/trpg/validation";
import * as access from "../../services/trpg/access";
import * as queries from "../../services/trpg/queries";
import * as registrations from "../../services/trpg/registrations";
import * as sessions from "../../services/trpg/sessions";
import type { GQLContext } from "../context";
import { requireAuth } from "../guards";
import type { ResolverMap } from "../schema";
import { zodToGraphQLError as parse } from "../validate";

async function actor(ctx: GQLContext) {
  requireAuth(ctx);
  return access.operator(ctx.db, ctx.userId);
}
const idInput = z.object({ id: trpgId });
const storeInput = z.object({ storeId: trpgId });
const filters = z.object({
  storeId: trpgId.nullish(),
  offset: trpgOffset,
  date: z.iso.date().nullish(),
  rule: z.string().max(40).nullish(),
  tag: z.string().max(20).nullish(),
  available: z.boolean().nullish(),
  dateFrom: z.iso.date().nullish(),
  dateTo: z.iso.date().nullish(),
  status: z
    .enum(["pending", "returned", "published", "cancelled", "completed"])
    .nullish(),
  unscheduled: z.boolean().nullish(),
  hostId: trpgId.nullish(),
});
const ok = () => ({ success: true });
export const trpgResolvers: ResolverMap = {
  Query: {
    trpgStores: async (_source, args, ctx) =>
      queries.listStores(ctx.db, args.managed ? await actor(ctx) : undefined),
    trpgSessions: async (_source, args, ctx) => {
      const input = parse(filters, args.filters ?? {});
      return queries.listSessions(
        ctx.db,
        {
          offset: input.offset,
          storeId: input.storeId ?? undefined,
          date: input.date ?? undefined,
          rule: input.rule ?? undefined,
          tag: input.tag ?? undefined,
          available: input.available ?? undefined,
          dateFrom: input.dateFrom ?? undefined,
          dateTo: input.dateTo ?? undefined,
          status: input.status ?? undefined,
          unscheduled: input.unscheduled ?? undefined,
          hostId: input.hostId ?? undefined,
        },
        args.managed ? await actor(ctx) : undefined,
      );
    },
    trpgManagedSession: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const row = await queries.findSession(ctx.db, parse(idInput, args).id);
      await queries.roster(ctx.db, row.id, user, 0);
      return queries.present(row, user);
    },
    trpgSession: async (_source, args, ctx) =>
      queries.publicSession(ctx.db, parse(idInput, args).id),
    trpgTables: async (_source, args, ctx) =>
      queries.listTables(
        ctx.db,
        await actor(ctx),
        parse(storeInput, args).storeId,
      ),
    trpgRoster: async (_source, args, ctx) => {
      const input = parse(idInput.extend({ offset: trpgOffset }), args);
      return queries.roster(ctx.db, input.id, await actor(ctx), input.offset);
    },
    trpgProfile: async (_source, _args, ctx) => {
      const user = await actor(ctx);
      const profile = await ctx.db
        .select({
          id: userInfoTable.id,
          nickname: userInfoTable.nickname,
          points: sql<number>`coalesce(${userInfoTable.points},0)`,
          balanceCents: sql<number>`(SELECT coalesce(sum(amount),0)
        FROM user_membership_plans WHERE user_id=${userInfoTable.id} AND plan_type='stored_value')`,
        })
        .from(userInfoTable)
        .where(eq(userInfoTable.id, user.id))
        .get();
      return {
        ...profile,
        admin: user.role === "admin",
        canManage: access.canEnterDashboard(user),
        canHost:
          access.canEnterDashboard(user) || user.access.some((a) => a.host),
      };
    },
    trpgMyRecords: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const input = parse(
        z.object({ archive: z.boolean().default(false), offset: trpgOffset }),
        args,
      );
      return queries.playerRecords(
        ctx.db,
        user.id,
        input.archive,
        input.offset,
      );
    },
    trpgHosts: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const { storeId } = parse(storeInput, args);
      access.requireReviewer(user, storeId);
      return ctx.db
        .select({
          id: userInfoTable.id,
          uid: userInfoTable.uid,
          nickname: userInfoTable.nickname,
        })
        .from(userInfoTable)
        .innerJoin(users, eq(users.id, userInfoTable.id))
        .where(
          and(
            eq(users.disabled, false),
            or(
              eq(users.role, "admin"),
              sql`EXISTS(SELECT 1 FROM trpg_access a WHERE a.user_id=${users.id}
            AND (a.host=1 OR (a.store_id=${storeId} AND a.staff=1 AND ${users.role}='staff')))`,
            ),
          ),
        )
        .limit(100);
    },
    trpgDirectory: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const input = parse(
        z.object({
          storeId: trpgId.nullish(),
          search: z.string().trim().max(80).default(""),
          hostsOnly: z.boolean().default(false),
          membersOnly: z.boolean().default(false),
          offset: trpgOffset,
        }),
        args,
      );
      return queries.directory(ctx.db, user, input);
    },
    trpgMembers: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const { storeId, search } = parse(
        storeInput.extend({ search: z.string().trim().min(2).max(80) }),
        args,
      );
      access.requireReviewer(user, storeId);
      return ctx.db
        .select({
          id: userInfoTable.id,
          uid: userInfoTable.uid,
          nickname: userInfoTable.nickname,
        })
        .from(userInfoTable)
        .innerJoin(users, eq(users.id, userInfoTable.id))
        .where(
          and(
            eq(users.disabled, false),
            sql`(instr(lower(${userInfoTable.nickname}),lower(${search}))>0 OR instr(lower(${userInfoTable.uid}),lower(${search}))>0 OR ${userInfoTable.phone}=${search})`,
            user.role === "admin"
              ? undefined
              : sql`EXISTS(SELECT 1 FROM trpg_registrations r JOIN trpg_sessions s ON s.id=r.session_id
            WHERE r.user_id=${userInfoTable.id} AND s.store_id=${storeId})`,
          ),
        )
        .limit(20);
    },
    trpgMemberHistory: async (_source, args, ctx) => {
      const user = await actor(ctx);
      const input = parse(
        z.object({
          storeId: trpgId.nullish(),
          userId: trpgId,
          offset: trpgOffset,
        }),
        args,
      );
      access.requireDirectoryReviewer(user);
      return queries.playerRecords(
        ctx.db,
        input.userId,
        true,
        input.offset,
        undefined,
      );
    },
  },
  TrpgSession: {
    booking: async (source, _args, ctx) => {
      if (!ctx.userId) return null;
      await actor(ctx);
      return queries.personalBooking(
        ctx.db,
        (source as { id: string }).id,
        ctx.userId,
      );
    },
  },
  Mutation: {
    createTrpgSession: async (_source, args, ctx) =>
      sessions.createSession(
        ctx.db,
        await actor(ctx),
        parse(sessionInput, args.input),
      ),
    resubmitTrpgSession: async (_source, args, ctx) => {
      const input = parse(
        idInput.extend({ revision: trpgRevision, input: sessionInput }),
        args,
      );
      await sessions.resubmitSession(
        ctx.db,
        await actor(ctx),
        input.id,
        input.revision,
        input.input,
      );
      return ok();
    },
    transitionTrpgSession: async (_source, args, ctx) => {
      const input = parse(
        idInput.extend({
          revision: trpgRevision,
          action: sessionAction,
          reason: trpgReason,
        }),
        args,
      );
      await sessions.transition(
        ctx.db,
        await actor(ctx),
        input.id,
        input.revision,
        input.action,
        input.reason,
      );
      return ok();
    },
    scheduleTrpgSession: async (_source, args, ctx) => {
      const input = parse(
        idInput.extend({
          revision: trpgRevision,
          tableId: trpgId,
          startsAt: z.iso.datetime({ offset: true }),
          deadline: z.iso.datetime({ offset: true }),
          storeId: trpgId.nullish(),
        }),
        args,
      );
      await sessions.scheduleSession(
        ctx.db,
        await actor(ctx),
        input.id,
        input.revision,
        input.tableId,
        input.startsAt,
        input.deadline,
        input.storeId,
      );
      return ok();
    },
    joinTrpgSession: async (_source, args, ctx) => {
      const user = await actor(ctx);
      await registrations.joinSession(ctx.db, parse(idInput, args).id, user.id);
      return ok();
    },
    withdrawTrpgRegistration: async (_source, args, ctx) => {
      const user = await actor(ctx);
      await registrations.withdraw(ctx.db, parse(idInput, args).id, user.id);
      return ok();
    },
    reviewTrpgRegistration: async (_source, args, ctx) => {
      const input = parse(
        idInput.extend({
          registrationId: trpgId,
          decision: bookingAction,
          depositConfirmed: z.boolean().default(false),
          reason: trpgReason,
        }),
        args,
      );
      await registrations.reviewBooking(
        ctx.db,
        await actor(ctx),
        input.id,
        input.registrationId,
        input.decision,
        input.depositConfirmed,
        input.reason,
      );
      return ok();
    },
    setTrpgHost: async (_source, args, ctx) => {
      const input = parse(idInput.extend({ host: z.boolean() }), args);
      await access.setHost(ctx.db, await actor(ctx), input.id, input.host);
      return ok();
    },
    setTrpgMember: async (_source, args, ctx) => {
      const input = parse(idInput.extend({ member: z.boolean() }), args);
      await access.setMember(ctx.db, await actor(ctx), input.id, input.member);
      return ok();
    },
    setTrpgAccess: async (_source, args, ctx) => {
      const input = parse(
        idInput.extend({
          storeId: trpgId,
          staff: z.boolean(),
          host: z.boolean(),
        }),
        args,
      );
      await access.setAccess(ctx.db, await actor(ctx), input);
      return ok();
    },
  },
};
