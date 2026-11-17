import { apiOrigin } from "../config";
import type { TypedDocumentString } from "../graphql/__generated__/operations";

const tokenKey = "diceshock-miniapp-session";

interface GraphQLErrorEntry {
  message?: string;
  extensions?: { code?: string };
}

interface ResponseBody {
  data?: unknown;
  message?: string;
  errors?: (GraphQLErrorEntry | string)[];
}

export const token = (): string => wx.getStorageSync<string>(tokenKey);
export const saveToken = (value: string) => wx.setStorageSync(tokenKey, value);
export const clearToken = () => wx.removeStorageSync(tokenKey);

function request<T>(path: string, data: object): Promise<T> {
  return new Promise((resolve, reject) =>
    wx.request<ResponseBody>({
      url: apiOrigin + path,
      method: "POST",
      data,
      timeout: 12000,
      header: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      success(result) {
        const body = typeof result.data === "object" ? result.data : undefined;
        if (result.statusCode === 401) clearToken();
        if (result.statusCode < 200 || result.statusCode >= 300)
          return reject(
            new Error(
              body?.message ||
                (result.statusCode === 401
                  ? "登录已过期，请重新登录"
                  : "请求失败，请稍后重试"),
            ),
          );
        const errors = body?.errors ?? [];
        if (
          errors.some(
            (e) =>
              typeof e !== "string" && e.extensions?.code === "UNAUTHORIZED",
          )
        ) {
          clearToken();
          return reject(new Error("登录已过期，请重新登录"));
        }
        if (errors.length)
          return reject(
            new Error(
              errors
                .map((e) => (typeof e === "string" ? e : e.message))
                .join("；"),
            ),
          );
        resolve(body as T);
      },
      fail: () => reject(new Error("网络连接失败，请重试")),
    }),
  );
}

export async function graphql<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never>
    ? []
    : [variables: TVariables]
): Promise<TResult> {
  const body = await request<{ data: TResult }>("/graphql", {
    query: document.toString(),
    variables: variables ?? {},
  });
  return body.data;
}

export interface AuthResult {
  accessToken?: string;
}

export const qrConfirm = (qrId: string) =>
  request<{ ok: boolean; role?: string }>("/api/qr-login/confirm", { qrId });

export const auth = (
  action: "login" | "verify" | "logout",
  data: Record<string, unknown> = {},
) => request<AuthResult>(`/api/miniapp/${action}`, data);
