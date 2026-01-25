import db, { drizzle, userBusinessCardTable, userInfoTable } from "@lib/db";
import { z } from "zod/v4";
import { protectedProcedure } from "./baseTRPC";

// 名片创建/更新输入验证
const upsertBusinessCardZ = z.object({
  share_phone: z.boolean().optional().default(false),
  wechat: z.string().optional(),
  qq: z.string().optional(),
  custom_content: z.string().optional(),
});

// 获取当前用户的名片
const getMyBusinessCard = protectedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    const tdb = db(ctx.env.DB);
    const businessCard = await tdb.query.userBusinessCardTable.findFirst({
      where: (card, { eq }) => eq(card.id, ctx.userId!),
    });

    return businessCard || null;
  });

// 创建或更新名片
const upsertBusinessCard = protectedProcedure
  .input(upsertBusinessCardZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const userId = ctx.userId!;

    // 检查名片是否存在
    const existing = await tdb.query.userBusinessCardTable.findFirst({
      where: (card, { eq }) => eq(card.id, userId),
    });

    const updateData = {
      ...input,
      update_at: new Date(),
    };

    if (existing) {
      // 更新
      const [updated] = await tdb
        .update(userBusinessCardTable)
        .set(updateData)
        .where(drizzle.eq(userBusinessCardTable.id, userId))
        .returning();

      return updated;
    } else {
      // 创建
      const [created] = await tdb
        .insert(userBusinessCardTable)
        .values({
          id: userId,
          ...updateData,
        })
        .returning();

      return created;
    }
  });

// 获取指定用户的名片（用于查看参与者名片，需要鉴权：只有约局发起者可以查看）
const getBusinessCardByUserId = protectedProcedure
  .input(z.object({ user_id: z.string(), active_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { user_id, active_id } = input;

    // 验证是否是约局发起者
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, active_id), eq(a.is_game, true)),
      columns: { creator_id: true },
    });

    if (!active) {
      throw new Error("活动不存在或不是约局");
    }

    if (active.creator_id !== ctx.userId) {
      throw new Error("只有约局发起者可以查看参与者名片");
    }

    // 获取用户名片
    const businessCard = await tdb.query.userBusinessCardTable.findFirst({
      where: (card, { eq }) => eq(card.id, user_id),
    });

    // 获取用户基本信息
    const userInfo = await tdb.query.userInfoTable.findFirst({
      where: (info, { eq }) => eq(info.id, user_id),
    });

    if (!userInfo) {
      return null;
    }

    // 如果名片不存在，返回基本信息
    if (!businessCard) {
      return {
        user_id,
        nickname: userInfo.nickname,
        uid: userInfo.uid,
        share_phone: false,
        phone: null,
        wechat: null,
        qq: null,
        custom_content: null,
      };
    }

    // 返回名片信息（根据share_phone决定是否返回手机号）
    return {
      user_id,
      nickname: userInfo.nickname,
      uid: userInfo.uid,
      share_phone: businessCard.share_phone,
      phone: businessCard.share_phone ? userInfo.phone : null,
      wechat: businessCard.wechat,
      qq: businessCard.qq,
      custom_content: businessCard.custom_content,
    };
  });

// 获取约局的所有参与者名片列表（只有发起者可以查看）
const getParticipantsBusinessCards = protectedProcedure
  .input(z.object({ active_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { active_id } = input;

    // 验证是否是约局发起者
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, active_id), eq(a.is_game, true)),
      columns: { creator_id: true },
    });

    if (!active) {
      throw new Error("活动不存在或不是约局");
    }

    if (active.creator_id !== ctx.userId) {
      throw new Error("只有约局发起者可以查看参与者名片");
    }

    // 获取所有报名者（不包括观望）
    const registrations = await tdb.query.activeRegistrationsTable.findMany({
      where: (reg, { eq, and }) =>
        and(eq(reg.active_id, active_id), eq(reg.is_watching, false)),
    });

    // 获取所有参与者的名片信息
    const participants = await Promise.all(
      registrations.map(async (reg) => {
        const userId = reg.user_id;

        // 获取用户基本信息
        const userInfo = await tdb.query.userInfoTable.findFirst({
          where: (info, { eq }) => eq(info.id, userId),
        });

        if (!userInfo) {
          return null;
        }

        // 获取名片信息
        const businessCard = await tdb.query.userBusinessCardTable.findFirst({
          where: (card, { eq }) => eq(card.id, userId),
        });

        return {
          user_id: userId,
          nickname: userInfo.nickname,
          uid: userInfo.uid,
          share_phone: businessCard?.share_phone ?? false,
          phone: businessCard?.share_phone ? userInfo.phone : null,
          wechat: businessCard?.wechat ?? null,
          qq: businessCard?.qq ?? null,
          custom_content: businessCard?.custom_content ?? null,
          registration_id: reg.id,
          create_at: reg.create_at,
        };
      }),
    );

    return participants.filter((p) => p !== null);
  });

export default {
  getMyBusinessCard,
  upsertBusinessCard,
  getBusinessCardByUserId,
  getParticipantsBusinessCards,
};
