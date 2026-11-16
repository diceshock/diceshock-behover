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
      {
        type: "text",
        key: "uid",
        label: "UID",
        placeholder: "UID…",
        operators: ["eq", "include"],
      },
      {
        type: "text",
        key: "phone",
        label: "手机号",
        placeholder: "手机号…",
        operators: ["eq", "include"],
      },
      {
        type: "enum",
        key: "role",
        label: "角色",
        options: [
          { value: "admin", label: "管理员" },
          { value: "staff", label: "店长" },
          { value: "host", label: "主持人" },
          { value: "member", label: "会员" },
          { value: "customer", label: "顾客" },
        ],
      },
      {
        type: "enum",
        key: "store",
        label: "门店",
        options: [
          { value: "gg", label: "光谷" },
          { value: "jdk", label: "街道口" },
        ],
      },

      { type: "boolean", key: "disabled", label: "已禁用" },
      { type: "number", key: "stored_value", label: "储值余额", unit: "元" },
      { type: "date", key: "created", label: "注册时间", granularity: "day" },
    ],
    sortFields: [
      { key: "created_at", label: "注册时间" },
      { key: "nickname", label: "昵称" },
      { key: "stored_value", label: "储值余额" },
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
      {
        type: "date",
        key: "created_at",
        label: "创建时间",
        granularity: "day",
      },
    ],
    sortFields: [
      { key: "created_at", label: "创建时间" },
      { key: "ended_at", label: "结束时间" },
    ],
  },
];

export function getCategoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByRoute(route: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => route.startsWith(c.route));
}
