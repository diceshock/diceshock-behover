import db, {
  activeRegistrationsTable,
  activeTeamsTable,
  drizzle,
} from "@lib/db";
import { z } from "zod/v4";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

// 队伍相关
const teamCreateZ = z.object({
  active_id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  max_participants: z.number().int().positive().nullable(),
});

const teamUpdateZ = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  max_participants: z.number().int().positive().nullable().optional(),
});

const teamDeleteZ = z.object({
  id: z.string(),
});

// 获取活动的所有队伍
const getTeams = publicProcedure
  .input(z.object({ active_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const teams = await tdb.query.activeTeamsTable.findMany({
      where: (team, { eq }) => eq(team.active_id, input.active_id),
      with: {
        registrations: true,
      },
      orderBy: (teams, { asc }) => asc(teams.create_at),
    });

    return teams.map((team) => {
      // 过滤掉观望状态的报名，只计算实际参与的人数
      const participatingRegistrations = team.registrations.filter(
        (reg) => !reg.is_watching,
      );
      return {
        ...team,
        registrations: participatingRegistrations,
        current_count: participatingRegistrations.length,
        is_full:
          team.max_participants !== null &&
          participatingRegistrations.length >= team.max_participants,
      };
    });
  });

// 创建队伍（控制台使用，由 Cloudflare Zero Trust 保护）
const createTeam = publicProcedure
  .input(teamCreateZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    // 验证活动存在
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.active_id),
    });

    if (!active) {
      throw new Error("活动不存在");
    }

    const [team] = await tdb
      .insert(activeTeamsTable)
      .values({
        active_id: input.active_id,
        name: input.name,
        description: input.description,
        max_participants: input.max_participants,
      })
      .returning();

    return team;
  });

// 更新队伍（控制台使用，由 Cloudflare Zero Trust 保护）
const updateTeam = publicProcedure
  .input(teamUpdateZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id, ...updateData } = input;

    const [updated] = await tdb
      .update(activeTeamsTable)
      .set(updateData)
      .where(drizzle.eq(activeTeamsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("队伍不存在");
    }

    return updated;
  });

// 删除队伍（控制台使用，由 Cloudflare Zero Trust 保护）
const deleteTeam = publicProcedure
  .input(teamDeleteZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    // 先获取要删除的队伍信息
    const teamToDelete = await tdb.query.activeTeamsTable.findFirst({
      where: (team, { eq }) => eq(team.id, input.id),
    });

    if (!teamToDelete) {
      throw new Error("队伍不存在");
    }

    // 获取该活动的所有队伍，按创建时间排序
    const allTeams = await tdb.query.activeTeamsTable.findMany({
      where: (team, { eq }) => eq(team.active_id, teamToDelete.active_id),
      orderBy: (teams, { asc }) => asc(teams.create_at),
    });

    // 不允许删除第一个队伍
    if (allTeams.length > 0 && allTeams[0].id === input.id) {
      throw new Error("不能删除第一个队伍");
    }

    // 检查是否有报名
    const registrations = await tdb.query.activeRegistrationsTable.findMany({
      where: (reg, { eq }) => eq(reg.team_id, input.id),
    });

    if (registrations.length > 0) {
      throw new Error("队伍中已有报名，无法删除");
    }

    await tdb
      .delete(activeTeamsTable)
      .where(drizzle.eq(activeTeamsTable.id, input.id));

    return { success: true };
  });

// 报名相关
const registrationCreateZ = z.object({
  active_id: z.string(),
  team_id: z.string().nullable().optional(),
  is_watching: z.boolean().default(false),
});

// 获取活动的所有报名
const getRegistrations = publicProcedure
  .input(z.object({ active_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const registrations = await tdb.query.activeRegistrationsTable.findMany({
      where: (reg, { eq }) => eq(reg.active_id, input.active_id),
      with: {
        user: {
          with: {
            userInfo: true,
          },
        },
        team: true,
      },
      orderBy: (regs, { asc }) => asc(regs.create_at),
    });

    return registrations.map((reg) => ({
      ...reg,
      user: reg.user
        ? {
            ...reg.user,
            userInfo: reg.user.userInfo,
          }
        : null,
    }));
  });

// 创建报名（需要登录）
const createRegistration = protectedProcedure
  .input(registrationCreateZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { userId } = ctx;

    if (!userId) {
      throw new Error("用户未登录");
    }

    // 验证活动存在
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.active_id),
    });

    if (!active) {
      throw new Error("活动不存在");
    }

    // 如果是观望状态，检查是否允许观望
    if (input.is_watching && !active.allow_watching) {
      throw new Error("该活动不允许观望");
    }

    // 检查是否已经报名（一个用户在一个活动中只能报名一次，包括观望）
    const existing = await tdb.query.activeRegistrationsTable.findFirst({
      where: (reg, { eq, and }) =>
        and(
          eq(reg.active_id, input.active_id),
          eq(reg.user_id, userId),
        ),
    });

    // 如果是报名队伍（非观望），验证队伍
    if (!input.is_watching && input.team_id) {
      const team = await tdb.query.activeTeamsTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.team_id),
        with: {
          registrations: true,
        },
      });

      if (!team) {
        throw new Error("队伍不存在");
      }

      // 过滤掉观望状态的报名和当前用户的报名（如果已存在）
      const participatingRegistrations = team.registrations.filter(
        (reg) =>
          !reg.is_watching &&
          (!existing || reg.user_id !== userId),
      );

      // 检查队伍是否已满
      if (
        team.max_participants !== null &&
        participatingRegistrations.length >= team.max_participants
      ) {
        throw new Error("队伍已满");
      }
    }

    // 如果已存在报名，更新现有记录（一个用户在一个活动中只能报名一次）
    if (existing) {
      // 如果加入队伍（非观望），确保退出观望状态
      const updateData: {
        team_id: string | null;
        is_watching: boolean;
      } = {
        team_id: input.team_id || null,
        is_watching: input.is_watching,
      };

      // 如果加入队伍，强制设置为非观望状态
      if (!input.is_watching && input.team_id) {
        updateData.is_watching = false;
      }

      const [updated] = await tdb
        .update(activeRegistrationsTable)
        .set(updateData)
        .where(drizzle.eq(activeRegistrationsTable.id, existing.id))
        .returning();

      return updated;
    }

    // 创建新报名记录
    const [registration] = await tdb
      .insert(activeRegistrationsTable)
      .values({
        active_id: input.active_id,
        team_id: input.team_id || null,
        user_id: userId,
        is_watching: input.is_watching,
      })
      .returning();

    return registration;
  });

// 取消报名
const deleteRegistration = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { userId } = ctx;

    const registration = await tdb.query.activeRegistrationsTable.findFirst({
      where: (reg, { eq }) => eq(reg.id, input.id),
    });

    if (!registration) {
      throw new Error("报名不存在");
    }

    // 只能取消自己的报名
    if (registration.user_id !== userId) {
      throw new Error("无权取消此报名");
    }

    await tdb
      .delete(activeRegistrationsTable)
      .where(drizzle.eq(activeRegistrationsTable.id, input.id));

    return { success: true };
  });

// 获取用户详情
const getUserDetails = publicProcedure
  .input(z.object({ user_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const user = await tdb.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, input.user_id),
      with: {
        userInfo: true,
      },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    return {
      ...user,
      userInfo: user.userInfo,
    };
  });

export default {
  teams: {
    get: getTeams,
    create: createTeam,
    update: updateTeam,
    delete: deleteTeam,
  },
  registrations: {
    get: getRegistrations,
    create: createRegistration,
    delete: deleteRegistration,
  },
  getUserDetails,
};
