import type { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "users",
    label: "用户",
    icon: "Users",
    route: "/dash/users",
    searchKeys: ["nickname", "phone", "uid"],
    fields: [
      { type: "text", key: "name", label: "昵称", placeholder: "搜索昵称…" },
      { type: "text", key: "uid", label: "UID", placeholder: "UID…", operators: ["eq", "include"] },
      { type: "text", key: "phone", label: "手机号", placeholder: "手机号…", operators: ["eq", "include"] },
      {
        type: "enum",
        key: "role",
        label: "角色",
        options: [
          { value: "admin", label: "管理员" },
          { value: "staff", label: "店员" },
          { value: "authenticated", label: "顾客" },
        ],
      },
      { type: "enum", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { type: "boolean", key: "disabled", label: "已禁用" },
      { type: "number", key: "stored_value", label: "储值余额", unit: "元" },
      { type: "date", key: "created", label: "注册时间", granularity: "day" },
    ],
  },
  {
    id: "orders",
    label: "订单",
    icon: "ClipboardText",
    route: "/dash/orders",
    searchKeys: ["table", "user", "id"],
    fields: [
      { type: "text", key: "table", label: "桌台", placeholder: "桌台名…" },
      { type: "text", key: "user", label: "用户", placeholder: "用户…" },
      {
        type: "enum",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "paused", label: "暂停" },
          { value: "ended", label: "已结束" },
        ],
      },
      { type: "enum", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { type: "date", key: "date", label: "日期", granularity: "day" },
      { type: "date", key: "start_at", label: "开始时间", granularity: "hour" },
      { type: "date", key: "end_at", label: "结束时间", granularity: "hour" },
    ],
  },
  {
    id: "tables",
    label: "桌台",
    icon: "Table",
    route: "/dash/tables",
    searchKeys: ["name", "code"],
    fields: [
      { type: "text", key: "name", label: "桌台名", placeholder: "搜索桌台…" },
      {
        type: "enum",
        key: "type",
        label: "类型",
        options: [
          { value: "fixed", label: "固定桌" },
          { value: "solo", label: "拼桌" },
        ],
      },
      {
        type: "enum",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "启用" },
          { value: "inactive", label: "停用" },
        ],
      },
      { type: "enum", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { type: "date", key: "created_at", label: "创建时间", granularity: "day" },
    ],
  },
  {
    id: "actives",
    label: "约局",
    icon: "CalendarDots",
    route: "/dash/actives",
    searchKeys: ["title", "creator"],
    fields: [
      { type: "text", key: "creator", label: "发起人", placeholder: "搜索发起人…" },
      { type: "text", key: "type", label: "类型", placeholder: "类型…" },
      {
        type: "enum",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "expired", label: "已过期" },
        ],
      },
      { type: "enum", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { type: "date", key: "date", label: "日期", granularity: "day" },
      { type: "date", key: "start_time", label: "开始时间", granularity: "hour" },
    ],
  },
  {
    id: "events",
    label: "活动",
    icon: "Megaphone",
    route: "/dash/events",
    searchKeys: ["title", "description"],
    fields: [
      { type: "text", key: "title", label: "标题", placeholder: "搜索标题…" },
      {
        type: "enum",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "ended", label: "已结束" },
          { value: "upcoming", label: "即将开始" },
        ],
      },
      { type: "enum", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { type: "date", key: "date", label: "日期", granularity: "day" },
      { type: "date", key: "start_date", label: "开始日期", granularity: "day" },
    ],
  },
  {
    id: "gsz",
    label: "雀庄",
    icon: "Sword",
    route: "/dash/gsz",
    searchKeys: ["table", "player"],
    fields: [
      { type: "text", key: "table", label: "桌台", placeholder: "桌台…" },
      {
        type: "enum",
        key: "mode",
        label: "模式",
        options: [
          { value: "3p", label: "三麻" },
          { value: "4p", label: "四麻" },
        ],
      },
      {
        type: "enum",
        key: "format",
        label: "局数",
        options: [
          { value: "tonpuu", label: "东风" },
          { value: "hanchan", label: "半庄" },
        ],
      },
      {
        type: "enum",
        key: "completion",
        label: "完成度",
        options: [
          { value: "completed", label: "已完成" },
          { value: "incomplete", label: "未完成" },
        ],
      },
      { type: "date", key: "date", label: "日期", granularity: "day" },
      { type: "date", key: "created_at", label: "创建时间", granularity: "day" },
    ],
  },
];

export function getCategoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByRoute(route: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => route.startsWith(c.route));
}
