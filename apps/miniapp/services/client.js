const { apiOrigin } = require("../config");
const tokenKey = "diceshock-miniapp-session";
const token = () => wx.getStorageSync(tokenKey);
function request(path, data) {
  return new Promise((resolve, reject) =>
    wx.request({
      url: apiOrigin + path,
      method: "POST",
      data,
      timeout: 12000,
      header: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      success(result) {
        if (result.statusCode === 401) wx.removeStorageSync(tokenKey);
        if (result.statusCode < 200 || result.statusCode >= 300)
          return reject(
            new Error(
              result.data?.message ||
                (result.statusCode === 401
                  ? "登录已过期，请重新登录"
                  : "请求失败，请稍后重试"),
            ),
          );
        if (result.data?.errors?.length)
          return reject(
            new Error(
              result.data.errors
                .map((e) => (typeof e === "string" ? e : e.message))
                .join("；"),
            ),
          );
        resolve(result.data);
      },
      fail: () => reject(new Error("网络连接失败，请重试")),
    }),
  );
}
const graphql = async (query, variables = {}) =>
  (await request("/graphql", { query, variables })).data;
const auth = (action, data = {}) => request(`/api/miniapp/${action}`, data);
const saveToken = (value) => wx.setStorageSync(tokenKey, value);
const clearToken = () => wx.removeStorageSync(tokenKey);
module.exports = { graphql, auth, token, saveToken, clearToken };
