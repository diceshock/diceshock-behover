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
  | "upsert_business_card"
  | "update_profile"
  | "update_preferences";

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

export interface UpdateProfileParams {
  nickname?: string;
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
    }
  | {
      action: "update_profile";
      params: UpdateProfileParams;
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
  "update_profile",
  "update_preferences",
] as const satisfies MutateAction[];

export const MUTATE_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "mutate",
    description:
      "写数据库。action必须是枚举值之一。没有delete操作,删除约局=创建者调leave_active。create_active需要title/date/startTime/maxPlayers。join/watch/leave_active需要activeId。",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: MUTATE_ACTIONS,
          description:
            "create_active/join_active/watch_active/leave_active(也用于删除)/update_active/send_sms_code/verify_phone/bind_gsz/upsert_business_card",
        },
        params: {
          type: "object",
          description:
            "create_active:{title,date,startTime,maxPlayers,location?,gameId?} join/watch/leave_active:{activeId} update_active:{activeId,fields:{...}}",
        },
        description: {
          type: "string",
          description: "操作描述",
        },
      },
      required: ["action", "params", "description"],
    },
  },
};
