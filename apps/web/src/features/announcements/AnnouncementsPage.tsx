import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Spinner, EmptyState } from "@/components/ui";
import { useAnnouncements } from "./api";
import styles from "./AnnouncementsPage.module.css";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AnnouncementsPage() {
  const { data, isLoading } = useAnnouncements({ page: 1, pageSize: 50 });
  const items = data?.data ?? [];

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Announcements</h1>
        <p style={{ margin: "4px 0 var(--space-5)", color: "var(--text-secondary)" }}>
          Updates from SR Home Tutors and your branch office.
        </p>

        {isLoading ? (
          <Spinner size="lg" />
        ) : items.length === 0 ? (
          <EmptyState title="No announcements yet" description="Updates from the office will show up here." />
        ) : (
          <div className={styles.feed}>
            {items.map((a) => (
              <div key={a.id} className={styles.item}>
                <div className={styles.icon} aria-hidden="true">
                  📣
                </div>
                <div>
                  <h3 className={styles.title}>{a.title}</h3>
                  <p className={styles.body}>{a.body}</p>
                  <span className={styles.meta}>{timeAgo(a.publishedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
