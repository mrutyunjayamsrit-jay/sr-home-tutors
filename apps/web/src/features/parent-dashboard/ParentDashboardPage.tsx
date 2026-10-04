import { Link } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Card, StatCard, Badge, Button, Spinner, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/features/auth/authStore";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useChild } from "@/features/family/api";
import { LocationSetupCard } from "@/features/family/LocationSetupCard";
import { useChildSessions } from "@/features/parent-attendance/api";
import { useChildTests } from "@/features/parent-performance/api";
import { useInvoices } from "@/features/fees/api";
import { useAnnouncements } from "@/features/announcements/api";
import styles from "./ParentDashboardPage.module.css";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ParentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { children, selectedChildId, selectedChild, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const childDetail = useChild(selectedChildId);

  const today = new Date();
  const in14 = new Date(today);
  in14.setDate(in14.getDate() + 14);
  const upcoming = useChildSessions(selectedChildId, isoDate(today), isoDate(in14));
  const past60 = useChildSessions(selectedChildId, isoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)), isoDate(today));
  const tests = useChildTests(selectedChildId);
  const invoices = useInvoices({ studentId: selectedChildId, page: 1, pageSize: 12 });
  const announcements = useAnnouncements({ page: 1, pageSize: 3 });

  const upcomingClasses = (upcoming.data ?? []).filter((s) => s.status === "SCHEDULED").slice(0, 5);
  const pastSessions = (past60.data ?? []).filter((s) => s.scheduledDate.slice(0, 10) <= isoDate(today));
  const present = pastSessions.filter((s) => s.status === "COMPLETED").length;
  const absent = pastSessions.filter((s) => s.status === "ABSENT_STUDENT" || s.status === "ABSENT_TUTOR").length;
  const attendancePercent = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : undefined;

  const latestTest = [...(tests.data ?? [])].sort((a, b) => b.testDate.localeCompare(a.testDate))[0];
  const latestTestPercent = latestTest ? Math.round((Number(latestTest.obtainedMarks) / Number(latestTest.totalMarks)) * 100) : undefined;

  const outstanding = (invoices.data?.data ?? []).filter((i) => i.status !== "PAID").reduce((sum, i) => sum + Number(i.balance), 0);

  const activeAssignments = childDetail.data?.assignments ?? [];

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
          <EmptyState title="No children on file yet" description="Once your child is registered with the branch, you'll see everything here." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <div className={styles.hero}>
          <div>
            <p className={styles.heroGreeting}>Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</p>
            <p className={styles.heroSub}>Here's how things are going for your family.</p>
          </div>
          {selectedChild && (
            <div style={{ textAlign: "right" }}>
              <p className={styles.heroChildName}>{selectedChild.name}</p>
              <p className={styles.heroChildMeta}>
                Class {selectedChild.studentClass} · {selectedChild.board}
              </p>
            </div>
          )}
        </div>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        <LocationSetupCard />

        <div className={styles.statGrid}>
          <StatCard label="Attendance (last 2 months)" value={attendancePercent !== undefined ? `${attendancePercent}%` : "—"} loading={past60.isLoading} />
          <StatCard label="Latest test score" value={latestTestPercent !== undefined ? `${latestTestPercent}%` : "—"} loading={tests.isLoading} hint={latestTest?.topic} />
          <StatCard label="Fees outstanding" value={`₹${outstanding.toLocaleString("en-IN")}`} loading={invoices.isLoading} />
          <StatCard label="Classes this fortnight" value={upcomingClasses.length} loading={upcoming.isLoading} />
        </div>

        <div className={styles.contentGrid}>
          <div>
            <Card style={{ marginBottom: "var(--space-5)" }}>
              <div className={styles.sectionTitle}>
                <h2>Upcoming classes</h2>
                <Link to="/parent/timetable">
                  <Button variant="ghost" size="sm">View timetable →</Button>
                </Link>
              </div>
              {upcoming.isLoading ? (
                <Spinner size="sm" />
              ) : upcomingClasses.length === 0 ? (
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No classes scheduled in the next two weeks.</p>
              ) : (
                upcomingClasses.map((s) => (
                  <div key={s.id} className={styles.classRow}>
                    <span>
                      <strong>{new Date(s.scheduledDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</strong>{" "}
                      {new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {s.assignment.subjects.join(", ")}
                    </span>
                    <Badge tone="neutral">{s.assignment.tutor.name}</Badge>
                  </div>
                ))
              )}
            </Card>

            <Card>
              <div className={styles.sectionTitle}>
                <h2>Latest announcements</h2>
                <Link to="/parent/announcements">
                  <Button variant="ghost" size="sm">View all →</Button>
                </Link>
              </div>
              {announcements.isLoading ? (
                <Spinner size="sm" />
              ) : (announcements.data?.data ?? []).length === 0 ? (
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No announcements yet.</p>
              ) : (
                (announcements.data?.data ?? []).map((a) => (
                  <div key={a.id} className={styles.announcementItem}>
                    <strong style={{ fontSize: "var(--text-sm)" }}>{a.title}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{a.body}</p>
                  </div>
                ))
              )}
            </Card>
          </div>

          <div>
            <Card style={{ marginBottom: "var(--space-5)" }}>
              <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Tutor{activeAssignments.length > 1 ? "s" : ""}</h2>
              {childDetail.isLoading ? (
                <Spinner size="sm" />
              ) : activeAssignments.length === 0 ? (
                <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No tutor assigned yet.</p>
              ) : (
                activeAssignments.map((a) => (
                  <div key={a.id} className={styles.tutorCard} style={{ marginBottom: "var(--space-3)" }}>
                    <span className={styles.tutorAvatar} aria-hidden="true">
                      {a.tutor.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {a.tutor.name}
                        {a.tutor.gender && <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}> ({a.tutor.gender === "MALE" ? "Male" : a.tutor.gender === "FEMALE" ? "Female" : "Other"})</span>}
                      </strong>
                      <p style={{ margin: "2px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{a.tutor.education || "—"}</p>
                      <p style={{ margin: "2px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{a.subjects.join(", ")}</p>
                      <p style={{ margin: "2px 0", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{a.tutor.contactNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>

            <Card>
              <h2 style={{ marginTop: 0, fontSize: "var(--text-lg)" }}>Quick links</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <Link to="/parent/attendance"><Button variant="secondary" fullWidth>View attendance</Button></Link>
                <Link to="/parent/performance"><Button variant="secondary" fullWidth>View performance</Button></Link>
                <Link to="/parent/fees"><Button variant="secondary" fullWidth>View fees</Button></Link>
                <Link to="/parent/materials"><Button variant="secondary" fullWidth>Study materials</Button></Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
