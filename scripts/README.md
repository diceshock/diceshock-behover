# 测试活动生成脚本

## 使用方法

1. **首次使用**：需要先运行一次开发服务器以初始化本地数据库：
   ```bash
   pnpm --filter diceshock dev
   ```
   运行几秒后按 Ctrl+C 停止即可。

2. **生成测试活动**：
   ```bash
   cd scripts
   pnpm generate-actives
   ```

## 功能

脚本会直接向本地 D1 数据库插入约 20-30 个测试活动，分布在：
- 本周（周一到周日）：每天 1-3 个活动
- 下周（周一到周五）：每天 1-2 个活动  
- 下下周（前 3 天）：每天 1 个活动

所有活动会自动发布（is_published: true），并设置活动日期（event_date）。

## 数据库位置

本地数据库位于：`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/24c01d5e-c4d7-4b13-bb59-5ad3373971e9`
