import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadCount } from "./api";
import type { Notification } from "./types";
import styles from "./NotificationBell.module.css";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Generic bell for any authenticated role — today it's meaningful for
 * Branch Admin (their own "mark attendance" reminder) and Super Admin
 * (branch-missed escalations), see notifications.service.ts, but any future
 * notification type rides the same UI without changes here.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useUnreadCount();
  const { data: page, isLoading } = useNotifications({ pageSize: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = page?.data ?? [];
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleItemClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHeader}>
            <p className={styles.panelTitle}>Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
                Mark all read
              </Button>
            )}
          </div>

          {!isLoading && items.length === 0 && <p className={styles.empty}>You're all caught up.</p>}

          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={[styles.item, !n.readAt ? styles.itemUnread : ""].filter(Boolean).join(" ")}
              onClick={() => handleItemClick(n)}
            >
              <div className={styles.itemTop}>
                {!n.readAt && <span className={styles.dot} aria-hidden="true" />}
                <p className={styles.itemTitle}>{n.title}</p>
              </div>
              <p className={styles.itemBody}>{n.body}</p>
              <p className={styles.itemTime}>{relativeTime(n.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
