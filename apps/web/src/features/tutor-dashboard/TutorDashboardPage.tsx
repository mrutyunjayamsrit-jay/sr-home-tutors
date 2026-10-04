import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Card, StatCard, Button, Badge } from "@/components/ui";
import { useAuthStore } from "@/features/auth/authStore";
import { useAssignments } from "@/features/assignments/api";
import { useSessionsForDate } from "@/features/attendance/api";
import { CheckInOutDialog } from "@/features/attendance/CheckInOutDialog";
import { CheckInOutButton } from "@/features/attendance/CheckInOutButton";
import type { ClassSessionRow } from "@/features/attendance/types";
import { useTutorPaymentsReport } from "@/features/reports/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const STATUS_TONE: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  SCHEDULED: "neutral",
  COMPLETED: "success",
  ABSENT_STUDENT: "danger",
  ABSENT_TUTOR: "danger",
  CANCELLED: "warning",
};

export function TutorDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const assignments = useAssignments({ page: 1, pageSize: 100, status: "ACTIVE" });
  const todaySessions = useSessionsForDate(today());
  const payments = useTutorPaymentsReport({ from: firstOfMonth(), to: today() }, true);
  const [markSession, setMarkSession] = useState<ClassSessionRow | null>(null);

  const studentCount = new Set((assignments.data?.data ?? []).map((a) => a.student.id)).size;
  const classesToday = todaySessions.data?.length ?? 0;
  const completedToday = (todaySessions.data ?? []).filter((s) => s.status === "COMPLETED").length;
  const earningsThisMonth = payments.data?.summary.totalPayable ?? 0;

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0 }}>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "-8px" }}>Here's what's happening today.</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            margin: "var(--space-6) 0",
          }}
        >
          <StatCard label="My students" value={studentCount} loading={assignments.isLoading} />
          <StatCard label="Classes today" value={classesToday} loading={todaySessions.isLoading} hint={`${completedToday} completed`} />
          <StatCard label="This month's earnings" value={`₹${earningsThisMonth}`} loading={payments.isLoading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Today's classes</h2>
              <Link to="/tutor/attendance">
                <Button variant="secondary" size="sm">
                  Mark attendance →
                </Button>
              </Link>
            </div>
            {(todaySessions.data ?? []).length === 0 ? (
              <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No classes scheduled for today.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(todaySessions.data ?? []).map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-sm)", padding: "var(--space-2)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                    <span>
                      <strong>{new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>{" "}
                      {s.assignment.student.name} — {s.assignment.subjects.join(", ")}
                    </span>
                    {s.status === "SCHEDULED" ? (
                      <CheckInOutButton session={s} onClick={() => setMarkSession(s)} />
                    ) : (
                      <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status.replace("_", " ")}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Quick links</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Link to="/tutor/students"><Button variant="secondary" fullWidth>My Students</Button></Link>
              <Link to="/tutor/tests"><Button variant="secondary" fullWidth>Add a test result</Button></Link>
              <Link to="/tutor/materials"><Button variant="secondary" fullWidth>Share study material</Button></Link>
              <Link to="/tutor/referrals"><Button variant="secondary" fullWidth>Refer a student</Button></Link>
            </div>
          </Card>
        </div>
      </div>

      <CheckInOutDialog session={markSession} onClose={() => setMarkSession(null)} />
    </AppShell>
  );
}
