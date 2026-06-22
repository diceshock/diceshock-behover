import { BellIcon } from "@phosphor-icons/react/dist/ssr";
import { ClientOnly } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotificationReceivedSubscription } from "@/client/graphql/__generated__/index";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";

const LAST_SEEN_KEY = "notifications:lastSeen";

interface NotificationItem {
  id: string;
  type: string;
  title: string | null | undefined;
  body: string | null | undefined;
  activeId: string | null | undefined;
  createdAt: string;
}

function getLastSeenTimestamp(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function setLastSeenTimestamp(ts: number): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(ts));
  } catch {}
}

function formatNotificationText(n: NotificationItem): string {
  switch (n.type) {
    case "active_reminder":
      return `约局提醒: ${n.title ?? ""} 即将开始`;
    case "participant_joined":
      return `${n.body ?? ""} 加入了你的约局`;
    case "system_announcement":
      return n.body ?? "";
    default:
      return n.body ?? n.title ?? "";
  }
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function NotificationsContent() {
  const { session } = useAuth();
  const messages = useMessages();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const lastSeenRef = useRef(getLastSeenTimestamp());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.id;

  const { data } = useNotificationReceivedSubscription({
    variables: { userId: userId! },
    skip: !userId,
  });

  useEffect(() => {
    if (!data?.notificationReceived) return;

    const payload = data.notificationReceived;
    const item: NotificationItem = {
      id: payload.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      activeId: payload.activeId,
      createdAt: payload.createdAt,
    };

    setItems((prev) => [item, ...prev].slice(0, 50));
    messagesRef.current.info(formatNotificationText(item));

    const itemTs = new Date(item.createdAt).getTime();
    if (itemTs > lastSeenRef.current) {
      setUnreadCount((c) => c + 1);
    }
  }, [data?.notificationReceived]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  const handleBellClick = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        const now = Date.now();
        lastSeenRef.current = now;
        setLastSeenTimestamp(now);
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className="btn btn-ghost btn-circle"
        aria-label="通知"
      >
        <div className="indicator">
          <BellIcon weight="fill" className="size-5" />
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-primary indicator-item">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-base-100 rounded-box shadow-lg border border-base-content/10 z-50">
          <div className="p-3 border-b border-base-content/10">
            <span className="font-semibold text-sm">通知</span>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center text-base-content/50 text-sm">
              暂无通知
            </div>
          ) : (
            <ul className="divide-y divide-base-content/5">
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2 hover:bg-base-200/50">
                  <p className="text-sm leading-snug">
                    {formatNotificationText(item)}
                  </p>
                  <p className="text-xs text-base-content/40 mt-0.5">
                    {formatTimeAgo(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  return (
    <ClientOnly fallback={null}>
      <NotificationsContent />
    </ClientOnly>
  );
}
