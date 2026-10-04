import { Card } from "@/components/ui";
import { useAnnouncements } from "./api";

/**
 * Surfaces any live "referral bonus" announcements (see
 * AnnouncementsAdminPage's "This is a referral bonus announcement"
 * checkbox) right on the referral pages/forms themselves — not just the
 * generic Announcements list — since that's where a referrer actually
 * decides whether to submit a referral. Renders nothing if there's none,
 * or none targeted at this viewer (audience/branch scoping happens
 * server-side, same as the rest of the Announcements feature).
 */
export function ReferralBonusBanner() {
  const { data, isLoading } = useAnnouncements({ page: 1, pageSize: 5, category: "REFERRAL_BONUS" });
  const items = data?.data ?? [];

  if (isLoading || items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
      {items.map((a) => (
        <Card
          key={a.id}
          style={{
            display: "flex",
            gap: "var(--space-3)",
            alignItems: "flex-start",
            background: "var(--color-success-50, #f0fdf4)",
            borderColor: "var(--color-success-500, #22c55e)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "1.5rem", lineHeight: 1 }}>
            🎁
          </span>
          <div>
            <strong style={{ display: "block", marginBottom: "2px" }}>{a.title}</strong>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{a.body}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
