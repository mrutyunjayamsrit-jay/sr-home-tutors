import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Card, Spinner } from "@/components/ui";
import { useAssignments } from "@/features/assignments/api";
import type { Assignment } from "@/features/assignments/types";
import styles from "./TimetablePage.module.css";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function TimetablePage() {
  const { data, isLoading } = useAssignments({ page: 1, pageSize: 100, status: "ACTIVE" });
  const assignments = data?.data ?? [];

  const byDay: Assignment[][] = Array.from({ length: 7 }, (_, day) =>
    assignments.filter((a) => a.daysOfWeek.includes(day)).sort((a, b) => toMinutes(a.timeSlotStart) - toMinutes(b.timeSlotStart)),
  );

  const todayIndex = new Date().getDay();

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Timetable</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>Your weekly class schedule, at a glance.</p>

        {isLoading ? (
          <Spinner size="lg" />
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
                        <span className={styles.student}>{a.student.name}</span>
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
