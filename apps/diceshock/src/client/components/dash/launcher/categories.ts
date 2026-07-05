import type { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "users",
    label: "用户",
    icon: "Users",
    route: "/dash/users",
    searchKeys: ["nickname", "phone", "uid"],
    filters: [
      { kind: "kv", key: "name", label: "昵称", placeholder: "搜索昵称…" },
      { kind: "kv", key: "uid", label: "UID", placeholder: "UID 前缀…" },
      { kind: "kv", key: "phone", label: "手机号", placeholder: "手机号…" },
      {
        kind: "option",
        key: "role",
        label: "角色",
        options: [
          { value: "admin", label: "管理员" },
          { value: "staff", label: "店员" },
          { value: "authenticated", label: "顾客" },
        ],
      },
      { kind: "option", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { kind: "boolean", key: "disabled", label: "已禁用" },
      { kind: "date", key: "created", label: "注册时间", granularity: "day" },
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "created_at", label: "注册时间" },
        { value: "nickname", label: "昵称" },
        { value: "stored_value", label: "储值余额" },
      ]},
    ],
  },
  {
    id: "orders",
    label: "订单",
    icon: "ClipboardText",
    route: "/dash/orders",
    searchKeys: ["table", "user", "id"],
    filters: [
      { kind: "kv", key: "table", label: "桌台", placeholder: "桌台名…" },
      { kind: "kv", key: "user", label: "用户", placeholder: "用户…" },
      {
        kind: "option",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "paused", label: "暂停" },
          { value: "ended", label: "已结束" },
        ],
      },
      { kind: "option", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { kind: "date", key: "date", label: "日期", granularity: "day" },
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "start_at", label: "开始时间" },
        { value: "end_at", label: "结束时间" },
      ]},
      { kind: "group", key: "group", label: "分组", options: [
        { value: "table", label: "桌台" },
        { value: "user", label: "用户" },
        { value: "date", label: "日期" },
        { value: "none", label: "无" },
      ]},
    ],
  },
  {
    id: "tables",
    label: "桌台",
    icon: "Table",
    route: "/dash/tables",
    searchKeys: ["name", "code"],
    filters: [
      { kind: "kv", key: "name", label: "桌台名", placeholder: "搜索桌台…" },
      {
        kind: "option",
        key: "type",
        label: "类型",
        options: [
          { value: "fixed", label: "固定桌" },
          { value: "solo", label: "拼桌" },
        ],
      },
      {
        kind: "option",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "启用" },
          { value: "inactive", label: "停用" },
        ],
      },
      { kind: "option", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "created_at", label: "创建时间" },
        { value: "name", label: "名称" },
      ]},
    ],
  },
  {
    id: "actives",
    label: "约局",
    icon: "CalendarDots",
    route: "/dash/actives",
    searchKeys: ["title", "creator"],
    filters: [
      { kind: "kv", key: "creator", label: "发起人", placeholder: "搜索发起人…" },
      { kind: "kv", key: "type", label: "类型", placeholder: "类型…" },
      {
        kind: "option",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "expired", label: "已过期" },
        ],
      },
      { kind: "option", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { kind: "date", key: "date", label: "日期", granularity: "day" },
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "created_at", label: "创建时间" },
        { value: "start_time", label: "开始时间" },
      ]},
    ],
  },
  {
    id: "events",
    label: "活动",
    icon: "Megaphone",
    route: "/dash/events",
    searchKeys: ["title", "description"],
    filters: [
      { kind: "kv", key: "title", label: "标题", placeholder: "搜索标题…" },
      {
        kind: "option",
        key: "status",
        label: "状态",
        options: [
          { value: "active", label: "进行中" },
          { value: "ended", label: "已结束" },
          { value: "upcoming", label: "即将开始" },
        ],
      },
      { kind: "option", key: "store", label: "门店", options: [
        { value: "gg", label: "光谷" },
        { value: "jdk", label: "街道口" },
      ]},
      { kind: "date", key: "date", label: "日期", granularity: "day" },
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "created_at", label: "创建时间" },
        { value: "start_date", label: "开始日期" },
      ]},
    ],
  },
  {
    id: "gsz",
    label: "雀庄",
    icon: "Sword",
    route: "/dash/gsz",
    searchKeys: ["table", "player"],
    filters: [
      { kind: "kv", key: "table", label: "桌台", placeholder: "桌台…" },
      {
        kind: "option",
        key: "mode",
        label: "模式",
        options: [
          { value: "3p", label: "三麻" },
          { value: "4p", label: "四麻" },
        ],
      },
      {
        kind: "option",
        key: "format",
        label: "局数",
        options: [
          { value: "tonpuu", label: "东风" },
          { value: "hanchan", label: "半庄" },
        ],
      },
      {
        kind: "option",
        key: "completion",
        label: "完成度",
        options: [
          { value: "completed", label: "已完成" },
          { value: "incomplete", label: "未完成" },
        ],
      },
      { kind: "date", key: "date", label: "日期", granularity: "day" },
      { kind: "sort", key: "sort", label: "排序", fields: [
        { value: "created_at", label: "创建时间" },
        { value: "ended_at", label: "结束时间" },
      ]},
    ],
  },
];

export function getCategoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByRoute(route: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => route.startsWith(c.route));
}
