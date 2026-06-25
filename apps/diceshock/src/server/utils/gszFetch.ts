const GSZ_BASE = "https://gsz.rmlinking.com";

interface GszEnv {
  GSZ_TOKEN?: string;
}

export async function gszFetch<T = unknown>(
  env: GszEnv,
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
      token: String(env.GSZ_TOKEN ?? ""),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let gszMessage = "";
    try {
      const errorBody = (await res.json()) as {
        code?: number;
        message?: string;
      };
      gszMessage = errorBody.message || "";
    } catch {
      /* non-JSON body */
    }
    throw new Error(gszMessage || `GSZ API HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    code: number;
    message: string;
    timestamp: number;
    data: T;
  };

  if (json.code !== 200) {
    throw new Error(json.message || `GSZ API error code ${json.code}`);
  }

  return json.data;
}

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
