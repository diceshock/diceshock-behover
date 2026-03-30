import { TRPCError } from "@trpc/server";
import z from "zod/v4";
import { dashProcedure } from "./baseTRPC";

// ─── GSZ API base ────────────────────────────────────────────
const GSZ_BASE = "https://gsz.rmlinking.com";

async function gszFetch<T = unknown>(
  env: Cloudflare.Env,
  path: string,
  body: Record<string, unknown>,
  query?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(path, GSZ_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: env.GSZ_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `GSZ API HTTP ${res.status}`,
    });
  }

  const json = (await res.json()) as {
    code: number;
    message: string;
    timestamp: number;
    data: T;
  };

  if (json.code !== 200) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: json.message || `GSZ API error code ${json.code}`,
      cause: { gszCode: json.code, gszData: json.data },
    });
  }

  return json.data;
}

// ─── 1. 注册-用户-添加用户信息 ────────────────────────────────
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

// ─── 2. 查询-用户-雀庄内会员查看 ─────────────────────────────
const customerPageInputZ = z.object({
  pageNo: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  qq: z.string().optional(),
  wechat: z.string().optional(),
});

export interface GszCustomerRecord {
  id: number;
  name: string;
  phone: string | null;
  qq: string | null;
  wechat: string | null;
  pid: string | null;
  ticket: number;
  rank: number;
  rankName: string | null;
  useStatus: number;
  createTime: string;
  [key: string]: unknown;
}

export interface GszPageResult {
  records: GszCustomerRecord[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

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

// ─── 3. 上传-对局-成绩录入 ────────────────────────────────────
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

// ─── 4. 修改-对局-成绩修改 ────────────────────────────────────
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
