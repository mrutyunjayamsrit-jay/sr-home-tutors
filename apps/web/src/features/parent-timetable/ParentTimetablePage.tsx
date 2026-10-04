import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Card, Spinner, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useAssignments } from "@/features/assignments/api";
import type { Assignment } from "@/features/assignments/types";
import styles from "@/features/timetable/TimetablePage.module.css";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function ParentTimetablePage() {
  const { children, selectedChildId, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const { data, isLoading } = useAssignments({ page: 1, pageSize: 50, status: "ACTIVE", studentId: selectedChildId });
  const assignments = data?.data ?? [];

  const byDay: Assignment[][] = Array.from({ length: 7 }, (_, day) =>
    assignments.filter((a) => a.daysOfWeek.includes(day)).sort((a, b) => toMinutes(a.timeSlotStart) - toMinutes(b.timeSlotStart)),
  );
  const todayIndex = new Date().getDay();

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
          <EmptyState title="No children on file yet" description="A weekly schedule will appear here once a tutor is assigned." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Timetable</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>Weekly class schedule, at a glance.</p>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        {isLoading ? (
          <Spinner size="lg" />
        ) : assignments.length === 0 ? (
          <EmptyState title="No active classes yet" description="Once a tutor is assigned, the weekly schedule will show up here." />
        ) : (
          <div className={styles.grid}>
            {DAY_LABELS.map((label, day) => (
              <Card key={label} className={[styles.dayColumn, day === todayIndex ? styles.today : ""].join(" ")}>
                <h3 className={styles.dayLabel}>
                  {label}
                  {day === todayIndex && <span className={styles.todayTag}>Today</span>}
                </h3>
                {byDay[day]!.length === 0 ? (
                  <p className={styles.empty}>No classes</p>
                ) : (
                  <ul className={styles.classList}>
                    {byDay[day]!.map((a) => (
                      <li key={a.id} className={styles.classItem}>
                        <span className={styles.time}>
                          {a.timeSlotStart}–{a.timeSlotEnd}
                        </span>
                        <span className={styles.student}>{a.tutor.name}</span>
                        <span className={styles.subjects}>{a.subjects.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
