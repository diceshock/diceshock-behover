-- Seed the default wechat menu snapshot (matches the original scripts/wechat-menu.ts config)
-- This version is effective immediately as the "published" baseline.

INSERT OR IGNORE INTO "wechat_menu_snapshots" (id, name, store_id, data, status, created_at, published_at)
VALUES (
  '00000000-0000-4000-b000-000000000001',
  '默认菜单',
  NULL,
  '{"buttons":[{"id":"default01","type":"click","name":"会员中心","key":"MEMBERSHIP_PLAN"},{"id":"default02","name":"快捷功能","items":[{"id":"default03","type":"view","name":"桌游库存","link_target":"/inventory"},{"id":"default04","type":"view","name":"日麻战绩","link_target":"/riichi"},{"id":"default05","type":"view","name":"约局","link_target":"/actives"}]},{"id":"default06","name":"使用帮助","items":[{"id":"default07","type":"click","name":"如何对话","key":"HELP_GUIDE"},{"id":"default08","type":"view","name":"进入店铺","link_target":"/"},{"id":"default09","type":"view","name":"联系我们","link_target":"/contact-us"},{"id":"default10","type":"view","name":"个人信息","link_target":"/me"}]}]}',
  'published',
  unixepoch('now') * 1000,
  unixepoch('now') * 1000
);
