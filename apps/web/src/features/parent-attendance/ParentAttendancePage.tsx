import { useMemo, useState } from "react";
import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Card, DataTable, Badge, Spinner, EmptyState } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useChild } from "@/features/family/api";
import { useChildSessions } from "./api";
import type { ClassSessionRow } from "@/features/attendance/types";
import styles from "./ParentAttendancePage.module.css";

const STATUS_TONE: Record<ClassSessionRow["status"], "neutral" | "success" | "danger" | "warning"> = {
  SCHEDULED: "neutral",
  COMPLETED: "success",
  ABSENT_STUDENT: "danger",
  ABSENT_TUTOR: "danger",
  CANCELLED: "warning",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function severityColor(percent: number) {
  if (percent >= 75) return "var(--color-success-500)";
  if (percent >= 50) return "var(--color-warning-500)";
  return "var(--color-danger-500)";
}

export function ParentAttendancePage() {
  const { children, selectedChildId, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const childDetail = useChild(selectedChildId);

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const started = childDetail.data?.assignments[0]?.startDate;
    return started ? started.slice(0, 10) : isoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1));
  }, [childDetail.data, today]);
  const [from, setFrom] = useState<string | null>(null);
  const to = isoDate(today);
  const effectiveFrom = from ?? defaultFrom;
  // Query a bit past today too, purely so "upcoming this term" has something
  // to count — the history stats below still only look at to-date sessions.
  const queryTo = useMemo(() => isoDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())), [today]);

  const sessions = useChildSessions(selectedChildId, effectiveFrom, queryTo);

  const rows = sessions.data ?? [];
  const pastOrToday = rows.filter((s) => s.scheduledDate.slice(0, 10) <= to);
  const present = pastOrToday.filter((s) => s.status === "COMPLETED").length;
  const absent = pastOrToday.filter((s) => s.status === "ABSENT_STUDENT" || s.status === "ABSENT_TUTOR").length;
  const upcoming = rows.filter((s) => s.status === "SCHEDULED" && s.scheduledDate.slice(0, 10) > to).length;
  const denominator = Math.max(present + absent, 1);
  const percent = Math.round((present / denominator) * 100);

  const presentPct = Math.round((present / denominator) * 100);
  const absentPct = 100 - presentPct;

  const columns: Column<ClassSessionRow>[] = [
    { key: "date", header: "Date", render: (s) => new Date(s.scheduledDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) },
    { key: "time", header: "Time", render: (s) => new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    { key: "subjects", header: "Subjects", render: (s) => s.assignment.subjects.join(", ") },
    { key: "tutor", header: "Tutor", render: (s) => s.assignment.tutor.name },
    { key: "status", header: "Status", render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status.replace("_", " ")}</Badge> },
    { key: "notes", header: "Chapters covered", render: (s) => s.chaptersCovered || "—" },
  ];

  if (childrenLoading) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (children.length === 0) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <EmptyState title="No children on file yet" description="Once your child is registered, their attendance will appear here." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Attendance</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          How regularly classes have been happening — updated the moment a tutor marks a class.
        </p>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        <div style={{ marginBottom: "var(--space-4)", maxWidth: 260 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
            <span>Since</span>
            <input
              type="date"
              value={effectiveFrom}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              style={{ height: 40, padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}
            />
          </label>
        </div>

        {sessions.isLoading ? (
          <Spinner size="lg" />
        ) : pastOrToday.length === 0 ? (
          <EmptyState title="No classes recorded yet in this range" description="Try widening the date range above." />
        ) : (
          <>
            <Card className={styles.heroCard}>
              <div>
                <div className={styles.heroFigure} style={{ color: severityColor(percent) }}>
                  {percent}%
                </div>
                <p className={styles.heroLabel}>Attendance rate</p>
              </div>
              <div className={styles.meterBlock}>
                <div className={styles.meterTrack}>
                  <div className={styles.meterFill} style={{ width: `${percent}%`, background: severityColor(percent) }} />
                </div>
                <p className={styles.meterCaption}>
                  {present} attended · {absent} missed · {upcoming} upcoming this term
                </p>
              </div>
            </Card>

            <Card style={{ marginBottom: "var(--space-5)" }}>
              <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)" }}>Classes held so far</h3>
              <div className={styles.compositionBar} role="img" aria-label={`${present} attended, ${absent} missed`}>
                {present > 0 && (
                  <div className={styles.segment} style={{ flex: `0 0 ${presentPct}%`, background: "var(--color-success-500)" }}>
                    {presentPct >= 12 ? `${presentPct}%` : ""}
                  </div>
                )}
                {absent > 0 && (
                  <div className={styles.segment} style={{ flex: `0 0 ${absentPct}%`, background: "var(--color-danger-500)" }}>
                    {absentPct >= 12 ? `${absentPct}%` : ""}
                  </div>
                )}
              </div>
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.swatch} style={{ background: "var(--color-success-500)" }} />
                  Attended ({present})
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.swatch} style={{ background: "var(--color-danger-500)" }} />
                  Missed ({absent})
                </span>
              </div>
            </Card>

            <DataTable columns={columns} rows={[...rows].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))} rowKey={(s) => s.id} isLoading={false} emptyTitle="No sessions" />
          </>
        )}
      </div>
    </AppShell>
  );
}
