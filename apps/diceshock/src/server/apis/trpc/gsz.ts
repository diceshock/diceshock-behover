import z from "zod/v4";
import { dashProcedure } from "./baseTRPC";
import { type GszPageResult, gszFetch } from "./gszApi";

const registerZ = z.object({
  username: z.string().nonempty(),
  phone: z.string().nonempty(),
  password: z.string().optional(),
  qq: z.string().optional(),
  wechat: z.string().optional(),
});

const register = dashProcedure
  .input(registerZ)
  .mutation(async ({ input, ctx }) => {
    return gszFetch<number>(ctx.env, "/gszapi/open/register", {
      params: input,
    });
  });

const customerPageInputZ = z.object({
  pageNo: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  qq: z.string().optional(),
  wechat: z.string().optional(),
});

const customerPage = dashProcedure
  .input(customerPageInputZ)
  .query(async ({ input, ctx }) => {
    const { pageNo, pageSize, ...filter } = input;
    return gszFetch<GszPageResult>(
      ctx.env,
      "/gszapi/open/customer/page",
      { params: filter },
      { pageNo, pageSize },
    );
  });

const scoreAddZ = z.object({
  phone1: z.string().nonempty(),
  phone2: z.string().nonempty(),
  phone3: z.string().nonempty(),
  phone4: z.string().nonempty(),
  point1: z.string().nonempty(),
  point2: z.string().nonempty(),
  point3: z.string().nonempty(),
  point4: z.string().nonempty(),
  rateTime: z.string().nonempty(),
});

const scoreAdd = dashProcedure
  .input(scoreAddZ)
  .mutation(async ({ input, ctx }) => {
    return gszFetch<number>(ctx.env, "/gszapi/open/score/add", {
      params: input,
    });
  });

const scoreUpdateZ = z.object({
  recordId: z.number().int(),
  phone1: z.string().nonempty(),
  phone2: z.string().nonempty(),
  phone3: z.string().nonempty(),
  phone4: z.string().nonempty(),
  point1: z.string().nonempty(),
  point2: z.string().nonempty(),
  point3: z.string().nonempty(),
  point4: z.string().nonempty(),
  rateTime: z.string().nonempty(),
});

const scoreUpdate = dashProcedure
  .input(scoreUpdateZ)
  .mutation(async ({ input, ctx }) => {
    return gszFetch(ctx.env, "/gszapi/open/score/update", {
      params: input,
    });
  });

export default { register, customerPage, scoreAdd, scoreUpdate };
