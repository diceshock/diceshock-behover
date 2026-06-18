export type SkillId =
  | "account"
  | "boardgame"
  | "mahjong"
  | "active"
  | "event"
  | "general";

export interface TextMessage {
  type: "text";
  content: string;
}

export interface ImgMessage {
  type: "img";
  url: string;
  alt?: string;
}

export interface TotpMessage {
  type: "totp";
  qrcode_url: string;
  code: string;
  remaining_seconds: number;
}

export type AgentMessage = TextMessage | ImgMessage | TotpMessage;

export interface AgentResponse {
  messages: AgentMessage[];
  status?: string;
}

export interface PageLink {
  url: string;
  title: string;
  description?: string;
}

export interface ToolResult {
  data: unknown;
  links: PageLink[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  metadata?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
