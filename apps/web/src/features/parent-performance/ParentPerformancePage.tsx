import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Card, DataTable, Spinner, EmptyState, StatCard } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useChild } from "@/features/family/api";
import type { TestResult } from "@/features/tests/types";
import { useChildTests } from "./api";
import { TutorReviewCard } from "./TutorReviewCard";
import styles from "./ParentPerformancePage.module.css";

export function ParentPerformancePage() {
  const { children, selectedChildId, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const childDetail = useChild(selectedChildId);
  const tests = useChildTests(selectedChildId);

  const rows = tests.data ?? [];
  const bySubject = new Map<string, { total: number; obtained: number; count: number }>();
  for (const t of rows) {
    const cur = bySubject.get(t.subject) ?? { total: 0, obtained: 0, count: 0 };
    cur.total += Number(t.totalMarks);
    cur.obtained += Number(t.obtainedMarks);
    cur.count += 1;
    bySubject.set(t.subject, cur);
  }
  const subjectStats = [...bySubject.entries()]
    .map(([subject, s]) => ({ subject, percent: s.total > 0 ? Math.round((s.obtained / s.total) * 100) : 0, count: s.count }))
    .sort((a, b) => b.percent - a.percent);

  const overallPercent = rows.length > 0 ? Math.round((rows.reduce((sum, t) => sum + Number(t.obtainedMarks), 0) / rows.reduce((sum, t) => sum + Number(t.totalMarks), 0)) * 100) : undefined;
  const latestTest = [...rows].sort((a, b) => b.testDate.localeCompare(a.testDate))[0];

  const columns: Column<TestResult>[] = [
    { key: "date", header: "Date", render: (t) => new Date(t.testDate).toLocaleDateString() },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    { key: "topic", header: "Test", render: (t) => t.topic },
    {
      key: "score",
      header: "Score",
      render: (t) => {
        const pct = Math.round((Number(t.obtainedMarks) / Number(t.totalMarks)) * 100);
        return `${t.obtainedMarks} / ${t.totalMarks} (${pct}%)`;
      },
    },
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
          <EmptyState title="No children on file yet" description="Once your child is registered, their performance will appear here." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Performance</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Test scores by subject and the tutor's latest notes.
        </p>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        {tests.isLoading ? (
          <Spinner size="lg" />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
              <StatCard label="Overall average" value={overallPercent !== undefined ? `${overallPercent}%` : "—"} />
              <StatCard label="Tests recorded" value={rows.length} />
              <StatCard label="Latest test" value={latestTest ? `${Math.round((Number(latestTest.obtainedMarks) / Number(latestTest.totalMarks)) * 100)}%` : "—"} hint={latestTest?.topic} />
            </div>

            {subjectStats.length > 0 && (
              <Card style={{ marginBottom: "var(--space-5)" }}>
                <h3 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-base)" }}>Average score by subject</h3>
                <div className={styles.chart}>
                  {subjectStats.map((s) => (
                    <div key={s.subject} className={styles.row}>
                      <span className={styles.rowLabel}>{s.subject}</span>
                      <div className={styles.track}>
                        <div className={styles.fill} style={{ width: `${s.percent}%` }} />
                      </div>
                      <span className={styles.rowValue}>{s.percent}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {(childDetail.data?.assignments ?? []).map((a) => (
              <TutorReviewCard key={a.id} assignment={a} />
            ))}

            {rows.length === 0 ? (
              <EmptyState title="No test results yet" description="Marks entered by the tutor will show up here." />
            ) : (
              <DataTable
                columns={columns}
                rows={[...rows].sort((a, b) => b.testDate.localeCompare(a.testDate))}
                rowKey={(t) => t.id}
                isLoading={false}
                emptyTitle="No test results"
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
