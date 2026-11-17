# DiceShock 微信小程序

玩家端保留原版黑绿品牌首页、门店卡片、信箱、积分商城及招募列表。玩家使用原生微信小程序查找场次、报名、登记意向和查看个人记录。主持人与店员使用主应用的 `/trpg-host`、`/dash/trpg` 工作台。业务数据统一通过主应用 `/graphql` 访问；只有微信平台登录使用 `/api/miniapp/login`、`verify`、`logout`。

## 本地配置

1. 将 `config.example.json` 复制为 `config.local.json`（被 Git 忽略），正式构建需要填写实际小程序 `appId` 和 Worker 的 HTTPS origin；本地验收包固定使用 `touristappid` 和 `http://127.0.0.1:5173`。
2. 需要寻店指引时，在 `storeMedia` 中以数据库的门店 ID 为键填写媒体信息，例如：

   ```json
   {
     "apiOrigin": "https://your-test-worker.example",
     "storeMedia": {
       "your-store-id": {
         "image": "https://your-media-host.example/store-guide.webp",
         "phone": "门店联系电话",
         "wechat": "门店微信号"
       }
     }
   }
   ```

   图片使用项目现有 R2/媒体域名上的公开 HTTPS 地址；没有配置的图片和联系方式不会显示。动态门店图片、二维码、真实配置或密钥不要添加到 Git；固定品牌标记随源码打包。
3. 构建时 `scripts/config.ts` 读取并校验 `config.local.json`，以 `__API_ORIGIN__` / `__STORE_MEDIA__` 编译期常量注入 `src/config.ts`，并生成输出目录中的 `project.config.json`。
4. 微信开发者工具导入构建输出目录（见下文“发布”），不要导入源码目录。在本机设置真实 AppID，保存在忽略的私有配置中。
5. 微信后台配置 request、downloadFile 合法域名和隐私保护指引，声明微信身份、昵称及手机号的用途。使用基础库 3.x。

注入的配置会进入小程序包，不能包含 AppSecret、数据库凭证或令牌。Worker 侧小程序 AppID 是 `wrangler.toml` 中的 `DS_WECHAT_MINI_APP_ID`（正式与 preview 均已配置），AppSecret 通过 Worker secret `DS_WECHAT_MINI_APP_SECRET` 设置。

## 结构

源码使用 TypeScript，由 [weapp-vite](https://vite.icebreaker.top/) 编译（`weapp-vite.config.ts`），样式入口 `src/app.css` 经 weapp-tailwindcss 处理。

- `src/pages/sessions`：门店/日期/规则/标签筛选与分页。
- `src/pages/session`：场次详情、意向确认、报名和取消。
- `src/pages/account`：账户余额、积分、报名和已结团记录。
- `src/pages/login`：隐私同意、微信登录与手机号验证。
- `src/components/session-card`：复用场次卡片。
- `src/graphql/operations.graphql`：全部业务 operations；`pnpm --filter diceshock-miniapp codegen` 依据 `apps/diceshock/schema.graphql` 生成 `src/graphql/__generated__/operations.ts`（类型化文档，勿手动编辑）。
- `src/services`：HTTP/GraphQL 客户端。
- `src/utils`：展示转换和 `definePage`（页面异步生命周期守卫）。
- `src/types`：`wx` 类型补充与共享类型。

页面不显示其他玩家的手机号。后台主持人只能读取自己场次的报名名单；手机号仅对有对应门店审核权限的店员和管理员返回。

## 验证

```sh
pnpm --filter diceshock-miniapp check
pnpm exec vitest run apps/miniapp/tests apps/diceshock/tests/server/trpg
pnpm --filter diceshock codegen:trpg
pnpm --filter diceshock build
```

`check` 依次运行三个 `tsc` 项目（小程序源码、构建配置、测试）与 Biome；pre-commit 钩子同样执行小程序 `typecheck`。构建时拒绝除固定品牌标记外的位图入库，并在主包超过 2 MB 时失败。业务测试执行真实 SQLite SQL，并用小程序生成的 operations 覆盖 GraphQL 权限、并发报名、微信身份关联与客户端错误处理。

微信登录、手机号授权、隐私弹窗、分享返回、图片加载与电话拨打仍需要在配置完毕的测试小程序中真机验收；Node/浏览器检查不能替代微信客户端测试。

数据库设计与迁移边界见 [TRPG 工程说明](../../docs/trpg-workflow.md)。

## 发布

正式包使用 `pnpm --filter diceshock-miniapp build:release`，输出到 `dist/miniapp-release`；本地接口验收使用 `pnpm --filter diceshock-miniapp build:local`，输出到 `apps/diceshock/.wrangler/miniapp-local`（关闭域名校验，不可上传）。`pnpm --filter diceshock-miniapp dev` 以本地接口目标监听重建。每次构建清空对应输出目录，正式包没有自动测试登录。

完整交付、数据库迁移和发布前检查见 [2026-11-15 发布说明](../../docs/trpg-release-20261115.md)。
