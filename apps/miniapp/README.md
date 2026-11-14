# DiceShock 微信小程序

玩家使用原生微信小程序查找场次、报名、登记意向和查看个人记录。主持人与店员使用主应用的 `/trpg-host`、`/dash/trpg` 工作台。业务数据统一通过主应用 `/graphql` 访问；只有微信平台登录使用 `/api/miniapp/login`、`verify`、`logout`。

## 本地配置

1. 将 `config.example.json` 复制为 `config.local.json`，填写测试 Worker 的 HTTPS origin。
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

   图片使用项目现有 R2/媒体域名上的公开 HTTPS 地址；没有配置的图片和联系方式不会显示。不要把图片、二维码、真实配置或密钥添加到 Git。
3. 在仓库根目录运行 `pnpm --filter diceshock-miniapp prepare:config`，生成被 Git 忽略的 `config.js`。
4. 微信开发者工具导入此目录。公共配置使用 `touristappid`；在本机设置真实 AppID，保存在忽略的私有配置中。连接测试环境时也保持域名校验开启。
5. 微信后台配置 request、downloadFile 合法域名和隐私保护指引，声明微信身份、昵称及手机号的用途。使用基础库 3.x。

`config.js` 是进入小程序包的公共运行配置，不能包含 AppSecret、数据库凭证或令牌。微信 AppID/AppSecret 在 Worker secret `WECHAT_MINIAPP_APP_ID` / `WECHAT_MINIAPP_APP_SECRET` 中配置。

## 结构

- `pages/sessions`：门店/日期/规则/标签筛选与分页。
- `pages/session`：场次详情、意向确认、报名和取消。
- `pages/account`：账户余额、积分、报名和已结团记录。
- `pages/login`：隐私同意、微信登录与手机号验证。
- `components/session-card`：复用场次卡片。
- `services`：HTTP/GraphQL 客户端和明确的业务 operations。
- `utils`：展示转换和页面异步生命周期。

页面不显示其他玩家的手机号。后台主持人只能读取自己场次的报名名单；手机号仅对有对应门店审核权限的店员和管理员返回。

## 验证

```sh
pnpm --filter diceshock-miniapp check
pnpm exec vitest run apps/diceshock/tests/server/trpg
pnpm --filter diceshock codegen:trpg
pnpm --filter diceshock build
```

源码检查覆盖 JavaScript 语法、JSON、页面文件和图片入库检查。业务测试执行真实 SQLite SQL，并覆盖 GraphQL 权限、并发报名、微信身份关联与客户端错误处理。

微信登录、手机号授权、隐私弹窗、分享返回、图片加载与电话拨打仍需要在配置完毕的测试小程序中真机验收；Node/浏览器检查不能替代微信客户端测试。

数据库设计与迁移边界见 [TRPG 工程说明](../../docs/trpg-workflow.md)。
