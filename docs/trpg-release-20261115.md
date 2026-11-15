# 骰子奇兵：原版设计与官网后端联调

当前唯一业务源是 `diceshock-behover`。相邻的「骰子奇兵小程序」仓库用于原设计参考，不再从它启动后台或生成交付包。

## 交付内容

- 原版黑绿品牌、首页信箱/商城入口、两店卡片、收费说明、筛选及按日分组招募卡片已迁入 `apps/miniapp`。
- 跑团、账号、报名和审核使用官网 `/graphql`；登录与手机号验证继续使用真实微信平台接口。
- 新增真实公会信箱、工作人员回复、兑换商品管理、积分扣减、兑换券和按店核销。管理入口分别为积分商城 `/dash/trpg-rewards` 和公会信箱 `/dash/trpg-mailbox`，沿用官网账户权限；旧入口跳转到积分商城。
- 兑换积分复用官网会员积分及既有会员流水。库存、积分、券、流水由同一 SQLite 语句和触发器提交；请求幂等，库存与积分不足拒绝兑换，核销只能执行一次。数据库不自动插入上线商品或赠送积分。
- 不移植旧演示版的角色切换、模拟手机号或单独会员账本。旧版按分钟计时卡、演示储值赠积分档位和独立模组维护不等同于官网现有会员体系，未伪造为已接通功能。

## 本地验收

运行 `pnpm --filter diceshock exec vite --config vite.preview.local.config.ts --host 127.0.0.1 --port 5173 --strictPort`，仅使用 `.wrangler/preview/state` 本地 D1。

- 网页：`http://127.0.0.1:5173/dash/trpg`。
- 本地身份入口 `/__preview` 仅存在于被忽略的本机 Vite 配置，生产构建不引用它。
- `pnpm --filter diceshock-miniapp build:local` 从正式业务源码生成本地接口包，输出路径包含 `miniapp-local`，不可上传。此命令不自动注入登录令牌。
- 当前模拟器已导入的 `.wrangler/wechat-graphql-local-preview` 是单独的本地测试玩家副本，连接同一 D1。它与正式包完全分开，不可上传。
- 用场次报名 → 后台审核 → 客户端状态刷新测试主流程。公会信箱可测试投递 → 后台回复 → 客户端查看；商品上架后可在有足够测试积分的会员上验证兑换和核销。

## 正式包

`pnpm --filter diceshock-miniapp build:release` 读取忽略的 `apps/miniapp/config.local.json`。当前配置沿用原项目小程序 AppID 和 Worker 的 `AUTH_URL`（`https://diceshock.com`），生成独立时间戳目录 `dist/miniapp-release/*`。

正式包开启域名检查，不包含测试玩家令牌、角色选择和本地认证入口；只打包应用目录白名单，不带配置源文件、脚本或私有工程设置。品牌标记作为固定小文件随包提供，动态商品/门店媒体仍使用 HTTPS URL。

后端生产产物通过 `pnpm --filter diceshock build` 生成在 `apps/diceshock/dist`，使用正式 `vite.config.ts`，不含本地登录插件。不要使用 `vite.preview.local.config.ts` 构建或部署线上环境。

## 发布前尚需完成

1. 核对官网域名和小程序 AppID 是否就是此次发布目标。Worker 配置 `AUTH_SECRET`、`WECHAT_MINIAPP_APP_ID`、`WECHAT_MINIAPP_APP_SECRET`；不要配置测试短信固定码。
2. 核对目标数据库迁移历史并备份，按顺序应用 `0056_trpg_workflow.sql`、`0057_trpg_session_type.sql`、`0058_trpg_member_services.sql`。曾执行旧版同名 0056 的库须单独核查结构，不能直接认定已升级。
3. 配置微信 request 域名 `https://diceshock.com`，配置实际媒体域名、隐私保护指引和手机号授权能力；按真实门店 ID 填充 `storeMedia` 的图片和联系方式。
4. 在隔离 HTTPS 环境验证微信登录、手机号授权、分享返回、实际图片与双账号报名审核；不能用模拟器测试身份代替此步骤。
5. 全仓 TypeScript 检查仍有既有错误，本次新增文件未产生剩余诊断。生产构建及相关自动化测试已通过，但这不代表全仓类型检查或线上真机验收通过。

本轮没有对远程数据库执行迁移、部署 Worker、上传小程序或提交审核。
