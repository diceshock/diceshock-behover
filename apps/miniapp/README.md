# DiceShock 微信小程序

小程序目录是 `apps/miniapp`。接口和网页工作台与 DiceShock 网站一起构建，在同一个 Cloudflare Worker 上运行。小程序与网页使用同一份 D1 门店、桌位、场次、报名、会员和储值数据。

## 本地和测试环境

1. 给测试 Worker 绑定独立的 D1、KV 等测试资源。现有 Worker 的绑定清单见 `apps/diceshock/wrangler.toml`。Worker 的 `AUTH_URL` 使用测试站点地址。
2. 在测试 D1 准备现有仓库的表结构和模拟会员，应用 `drizzle/0056_trpg_workflow.sql`。这个迁移为 `actives`、`active_registrations` 和 `user_info` 增加跑团字段。对于全新的测试库，可以用当前上线版本的结构导出作为起点，再应用这个迁移。仓库旧迁移直接在空库重放时需要另行处理旧迁移兼容问题。
3. 用 `pnpm --filter diceshock run build` 构建 Worker。在测试 Worker 录入 `WECHAT_MINIAPP_APP_ID` 与 `WECHAT_MINIAPP_APP_SECRET`。AppSecret 通过 Cloudflare 的机密变量配置。
4. 在微信开发者工具导入 `apps/miniapp`，用已有小程序的 AppID。在微信公众平台设置隐私保护指引和手机号能力，把测试 Worker 的 HTTPS 地址加入 request 合法域名，并同步到 `apps/miniapp/config.js`。文件中的 `test.diceshock.com` 是待配置的测试地址。
5. 管理员登录网页，从「跑团工作台」选择门店，给主持人和店员授权。店员账号先在现有用户管理中设为店员。主持人可以通过 `/trpg-host` 使用自己获授权的门店。

## 数据与验收

- 门店和可用房间/桌位从现有的 `stores` 和 `tables` 获取。测试前检查街道口 3 个包间、光谷天地 4 个包间，每店 2 张大厅桌，跑团资源每桌最多 6 位玩家。
- 小程序用已验证手机号匹配现有会员。如果同一手机号出现多条记录，店员需要在用户管理核对。测试时先用有余额或积分的模拟会员检查账户关联。
- 每场默认 4 人成车、6 人满车，118 元／人、5 小时。付费场次由店员在微信群确认定金后，在工作台通过报名。
- 用不同门店的店员、主持人和两个玩家分别测试权限、报名审核、最后一席争抢、撤回释放席位、跨店撞期、意向优先期及跑团记录。微信登录和手机号授权还需要体验版真机测试。
- 余额和积分由原站会员管理维护。积分商城、商品上传、时间卡和公会信箱目前尚无完整的 D1 实现。
