/**
 * Mutate action types, typed params, and OpenAI function-calling tool definition.
 *
 * All 9 mutation action types derived from PendingActionType:
 *   create_active, join_active, watch_active, update_active, leave_active,
 *   send_sms_code, verify_phone, bind_gsz, upsert_business_card
 */

// ── Action type union ────────────────────────────────────────────────

export type MutateAction =
  | "create_active"
  | "update_active"
  | "join_active"
  | "leave_active"
  | "watch_active"
  | "send_sms_code"
  | "verify_phone"
  | "bind_gsz"
  | "upsert_business_card";

// ── Typed params interfaces ───────────────────────────────────────────

export interface CreateActiveParams {
  title: string;
  gameId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  maxPlayers: number;
  location?: string;
  description?: string;
}

export interface JoinActiveParams {
  activeId: string;
}

export interface WatchActiveParams {
  activeId: string;
}

export interface UpdateActiveFields {
  title?: string;
  date?: string;
  time?: string;
  max_players?: number;
  board_game_id?: string;
}

export interface UpdateActiveParams {
  activeId: string;
  fields: UpdateActiveFields;
}

export interface LeaveActiveParams {
  activeId: string;
}

export interface SendSmsCodeParams {
  phone: string;
}

export interface VerifyPhoneParams {
  phone: string;
  code: string;
}

export interface BindGszParams {
  gszId: string;
}

export interface UpsertBusinessCardParams {
  nickname?: string;
  avatar?: string;
  bio?: string;
  wechatId?: string;
  phone?: string;
  tags?: string[];
}

// ── Discriminated union ──────────────────────────────────────────────

export type MutateArgs =
  | {
      action: "create_active";
      params: CreateActiveParams;
      description: string;
    }
  | {
      action: "join_active";
      params: JoinActiveParams;
      description: string;
    }
  | {
      action: "watch_active";
      params: WatchActiveParams;
      description: string;
    }
  | {
      action: "update_active";
      params: UpdateActiveParams;
      description: string;
    }
  | {
      action: "leave_active";
      params: LeaveActiveParams;
      description: string;
    }
  | {
      action: "send_sms_code";
      params: SendSmsCodeParams;
      description: string;
    }
  | {
      action: "verify_phone";
      params: VerifyPhoneParams;
      description: string;
    }
  | {
      action: "bind_gsz";
      params: BindGszParams;
      description: string;
    }
  | {
      action: "upsert_business_card";
      params: UpsertBusinessCardParams;
      description: string;
    };

// ── OpenAI function-calling tool definition ──────────────────────────

export const MUTATE_ACTIONS = [
  "create_active",
  "update_active",
  "join_active",
  "leave_active",
  "watch_active",
  "send_sms_code",
  "verify_phone",
  "bind_gsz",
  "upsert_business_card",
] as const satisfies MutateAction[];

export const MUTATE_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "mutate",
    description:
      "执行数据修改操作。action 指定操作类型，params 提供参数，description 描述本次操作（给用户看）。",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: MUTATE_ACTIONS,
        },
        params: {
          type: "object",
          description: "操作参数，根据 action 类型不同而不同",
        },
        description: {
          type: "string",
          description: "本次操作的自然语言描述",
        },
      },
      required: ["action", "params", "description"],
    },
  },
};
