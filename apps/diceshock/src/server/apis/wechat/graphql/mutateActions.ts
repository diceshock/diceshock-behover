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
  | "update_preferences"
  | "add_preference"
  | "list_preferences"
  | "delete_preference"
  | "toggle_preference";

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

export interface AddPreferenceParams {
  raw_text: string;
}

export type ListPreferencesParams = Record<string, never>;

export interface DeletePreferenceParams {
  preference_index: number;
}

export interface TogglePreferenceParams {
  preference_index: number;
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
    }
  | {
      action: "add_preference";
      params: AddPreferenceParams;
      description: string;
    }
  | {
      action: "list_preferences";
      params: ListPreferencesParams;
      description: string;
    }
  | {
      action: "delete_preference";
      params: DeletePreferenceParams;
      description: string;
    }
  | {
      action: "toggle_preference";
      params: TogglePreferenceParams;
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
  "add_preference",
  "list_preferences",
  "delete_preference",
  "toggle_preference",
] as const satisfies MutateAction[];

export const MUTATE_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "mutate",
    description:
      "写数据库。action必须是枚举值之一。没有delete操作,删除约局=创建者调leave_active。create_active需要title/date/startTime/maxPlayers。join/watch/leave_active需要activeId。add_preference需要raw_text(自然语言描述偏好)。list_preferences/delete_preference/toggle_preference不需要特殊参数。",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: MUTATE_ACTIONS,
          description:
            "create_active/join_active/watch_active/leave_active(也用于删除)/update_active/send_sms_code/verify_phone/bind_gsz/upsert_business_card/add_preference/list_preferences/delete_preference/toggle_preference",
        },
        params: {
          type: "object",
          description:
            "create_active:{title,date,startTime,maxPlayers,location?,gameId?} join/watch/leave_active:{activeId} update_active:{activeId,fields:{...}} add_preference:{raw_text} delete_preference/toggle_preference:{preference_index}",
        },
        description: {
          type: "string",
          description: "操作描述",
        },
        message: {
          type: "string",
          description: "给用户看的进度说明，如：正在帮你创建约局...",
        },
      },
      required: ["action", "params", "description"],
    },
  },
};
