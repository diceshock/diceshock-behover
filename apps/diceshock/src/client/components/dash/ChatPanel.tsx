import { useChat } from "@ai-sdk/react";
import {
  CaretDownIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMatches } from "@tanstack/react-router";
import type { Message } from "ai";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import {
  chatContextAtom,
  chatPanelOpenAtom,
  chatPanelWidthAtom,
  currentSessionIdAtom,
  selectedTableDataAtom,
} from "./chatAtoms";

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 320;
const WIDTH_STORAGE_KEY = "dash-chat-panel-width";

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolInvocations?: Message["toolInvocations"];
  createdAt: number;
};

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function relativeTime(timestamp: number) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${Math.floor(diffHours / 24)} 天前`;
}

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useAtom(chatPanelOpenAtom);
  const [panelWidth, setPanelWidth] = useAtom(chatPanelWidthAtom);
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom);
  const [selectedData] = useAtom(selectedTableDataAtom);
  const setContext = useSetAtom(chatContextAtom);
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const activeSession = sessions.find(
    (session) => session.id === currentSessionId,
  );
  const requestContext = useMemo(
    () => ({
      page: currentPath,
      selectedRows: selectedData.rows,
    }),
    [currentPath, selectedData.rows],
  );

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    append,
    setMessages,
    isLoading,
    error,
    reload,
  } = useChat({
    api: "/api/chat/stream",
    body: { sessionId: currentSessionId, context: requestContext },
    credentials: "include",
    initialMessages: [],
    onFinish: () => void loadSessions(currentSessionId ?? undefined),
  });

  const loadSessions = useCallback(
    async (preferredId?: string) => {
      const response = await fetch("/api/chat/sessions", {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { sessions: ChatSession[] };
      setSessions(data.sessions);
      if (!preferredId && !currentSessionId && data.sessions[0]) {
        setCurrentSessionId(data.sessions[0].id);
      }
    },
    [currentSessionId, setCurrentSessionId],
  );

  const createSession = useCallback(async () => {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Create chat session failed");
    const session = (await response.json()) as Pick<
      ChatSession,
      "id" | "title"
    >;
    setCurrentSessionId(session.id);
    setSessions((prev) => [
      { ...session, createdAt: Date.now(), updatedAt: Date.now() },
      ...prev,
    ]);
    setMessages([]);
    return session.id;
  }, [setCurrentSessionId, setMessages]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      setCurrentSessionId(sessionId);
      setSessionMenuOpen(false);
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { messages: SessionMessage[] };
      setMessages(
        data.messages
          .filter((message) => message.role !== "tool")
          .map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
            createdAt: new Date(message.createdAt),
            toolInvocations: message.toolInvocations,
          })),
      );
    },
    [setCurrentSessionId, setMessages],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
    [currentSessionId, setCurrentSessionId, setMessages],
  );

  const saveTitle = useCallback(async () => {
    if (!currentSessionId) return;
    const title = titleDraft.trim() || "新对话";
    const response = await fetch(`/api/chat/sessions/${currentSessionId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (response.ok) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId ? { ...session, title } : session,
        ),
      );
    }
    setEditingTitle(false);
  }, [currentSessionId, titleDraft]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const content = input.trim();
      if (!content || isLoading) return;

      const sessionId = currentSessionId ?? (await createSession());
      setInput("");
      await append(
        { role: "user", content },
        { body: { sessionId, context: requestContext } },
      );
    },
    [
      append,
      createSession,
      currentSessionId,
      input,
      isLoading,
      requestContext,
      setInput,
    ],
  );

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextWidth = clampWidth(window.innerWidth - moveEvent.clientX);
        setPanelWidth(nextWidth);
        localStorage.setItem(WIDTH_STORAGE_KEY, String(nextWidth));
      };
      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [setPanelWidth],
  );

  useEffect(() => {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    setPanelWidth(Number.isFinite(stored) ? clampWidth(stored) : DEFAULT_WIDTH);
  }, [setPanelWidth]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setContext({ page: currentPath });
  }, [currentPath, setContext]);

  useEffect(() => {
    if (currentSessionId) void switchSession(currentSessionId);
  }, [currentSessionId, switchSession]);

  useEffect(() => {
    setTitleDraft(activeSession?.title ?? "新对话");
  }, [activeSession?.title]);

  return (
    <aside
      className={clsx(
        "hidden lg:flex fixed top-0 right-0 h-full z-40",
        "flex-col bg-base-200 border-l border-base-content/10",
        "transition-[width] duration-200 overflow-hidden",
      )}
      style={{ width: isOpen ? panelWidth : 0 }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
        onMouseDown={startResize}
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-base-content/10 shrink-0">
        {editingTitle ? (
          <input
            className="input input-xs input-bordered flex-1"
            value={titleDraft}
            autoFocus
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveTitle();
              if (event.key === "Escape") setEditingTitle(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="text-sm font-medium truncate text-left flex-1"
            onDoubleClick={() => setEditingTitle(true)}
            title="双击编辑标题"
          >
            {activeSession?.title ?? "AI 助手"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => void createSession()}
          title="新对话"
        >
          <PlusIcon className="size-4" />
        </button>
        <div className="dropdown dropdown-end">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => setSessionMenuOpen((value) => !value)}
          >
            <CaretDownIcon className="size-4" />
          </button>
          {sessionMenuOpen && (
            <ul className="dropdown-content menu bg-base-100 rounded-box z-50 w-64 p-2 shadow border border-base-content/10 max-h-96 overflow-y-auto">
              {sessions.length === 0 ? (
                <li className="px-2 py-1 text-xs text-base-content/50">
                  暂无对话
                </li>
              ) : (
                sessions.map((session) => (
                  <li key={session.id}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => void switchSession(session.id)}
                      >
                        <span className="block truncate text-sm">
                          {session.title}
                        </span>
                        <span className="block text-xs text-base-content/50">
                          {relativeTime(session.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square text-error"
                        onClick={() => void deleteSession(session.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => setIsOpen(false)}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <ChatMessages
        messages={messages as Message[]}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={reload}
      />

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </aside>
  );
}
