import { Link } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Card, StatCard, Button, Spinner, Badge } from "@/components/ui";
import { useBranch, useBranchStats } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";
import { AttendanceTile } from "@/features/staff-attendance/AttendanceTile";
import { TasksTile } from "@/features/tasks/TasksTile";

export function BranchDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: branch, isLoading } = useBranch(user?.branchId ?? undefined);
  const { data: stats, isLoading: statsLoading } = useBranchStats(user?.branchId ?? undefined);

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0 }}>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        {isLoading && <Spinner size="lg" />}
        {branch && (
          <p style={{ color: "var(--text-secondary)", marginTop: "-8px" }}>
            {branch.name} <Badge tone={branch.isActive ? "success" : "neutral"}>{branch.isActive ? "Active" : "Inactive"}</Badge>
          </p>
        )}

        <div style={{ margin: "var(--space-6) 0" }}>
          <AttendanceTile />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            margin: "var(--space-6) 0",
          }}
        >
          <StatCard
            label="Pending enquiries"
            value={stats?.pendingEnquiries ?? 0}
            loading={statsLoading}
            hint={stats ? `${stats.pendingTutorEnquiries} tutor · ${stats.pendingParentEnquiries} parent` : undefined}
          />
          <StatCard label="Registered tutors" value={stats?.registeredTutors ?? 0} loading={statsLoading} />
          <StatCard label="Registered students" value={stats?.registeredStudents ?? 0} loading={statsLoading} />
          <StatCard label="Running classes" value={stats?.runningClasses ?? 0} loading={statsLoading} />
        </div>

        <div style={{ marginBottom: "var(--space-6)" }}>
          <TasksTile />
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Branch profile</h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                View and edit your branch's contact details.
              </p>
            </div>
            <Link to="/branch/profile">
              <Button variant="secondary">Open →</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
