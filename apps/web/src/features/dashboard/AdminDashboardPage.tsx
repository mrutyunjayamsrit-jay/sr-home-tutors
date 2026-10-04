import { Link } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Card, StatCard, Button, Badge, DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useBranches, useOrgSummary } from "@/features/branches/api";
import type { BranchEnquirySummaryRow } from "@/features/branches/types";
import { useAuthStore } from "@/features/auth/authStore";
import { useBranchAttendanceOverview } from "@/features/staff-attendance/api";
import { useTasks } from "@/features/tasks/api";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function isOverdue(dueDate: string | null, status: string) {
  return status === "PENDING" && Boolean(dueDate) && new Date(dueDate!) < new Date(new Date().toDateString());
}

export function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useBranches({ page: 1, pageSize: 100 });
  const branches = data?.data ?? [];
  const activeCount = branches.filter((b) => b.isActive).length;

  const overview = useBranchAttendanceOverview();
  const overviewRows = overview.data ?? [];
  const missedRows = overviewRows.filter((row) => !row.marked);

  const orgSummary = useOrgSummary();

  const pendingTasks = useTasks({ status: "PENDING", pageSize: 100 });
  const pendingTaskRows = pendingTasks.data?.data ?? [];

  const branchEnquiryColumns: Column<BranchEnquirySummaryRow>[] = [
    { key: "branchName", header: "Branch", render: (r) => <strong>{r.branchName}</strong> },
    { key: "tutorEnquiries", header: "Tutor enquiries", render: (r) => r.tutorEnquiries },
    { key: "parentEnquiries", header: "Parent enquiries", render: (r) => r.parentEnquiries },
    { key: "totalEnquiries", header: "Total enquiries", render: (r) => r.totalEnquiries },
    { key: "totalEnrolled", header: "Enrolled", render: (r) => r.totalEnrolled },
    {
      key: "conversion",
      header: "Conversion",
      render: (r) => (r.totalEnquiries === 0 ? "—" : `${Math.round((r.totalEnrolled / r.totalEnquiries) * 100)}%`),
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0 }}>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "-8px" }}>
          Organization-wide overview across all branches.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            margin: "var(--space-6) 0",
          }}
        >
          <StatCard label="Total branches" value={data?.meta?.total ?? branches.length} loading={isLoading} />
          <StatCard label="Active branches" value={activeCount} loading={isLoading} />
          <StatCard label="Registered tutors" value={orgSummary.data?.totals.registeredTutors ?? 0} loading={orgSummary.isLoading} />
          <StatCard label="Registered students" value={orgSummary.data?.totals.registeredStudents ?? 0} loading={orgSummary.isLoading} />
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Branches</h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Manage branch offices and their office-assistant logins.
              </p>
            </div>
            <Link to="/admin/branches">
              <Button variant="secondary">View all →</Button>
            </Link>
          </div>
        </Card>

        <Card style={{ marginTop: "var(--space-6)" }}>
          <h2 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-lg)" }}>Enquiries by branch</h2>
          <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            How many tutor/parent enquiries each branch has received, and how many were enrolled (registered as a tutor or student).
          </p>
          <DataTable
            columns={branchEnquiryColumns}
            rows={orgSummary.data?.branches ?? []}
            rowKey={(r) => r.branchId}
            isLoading={orgSummary.isLoading}
            emptyTitle="No branches to show"
          />
        </Card>

        <Card style={{ marginTop: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Branch attendance today</h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Which branch offices have checked in so far today.
              </p>
            </div>
            {!overview.isLoading && missedRows.length > 0 && (
              <Badge tone="danger">{missedRows.length} not checked in</Badge>
            )}
          </div>

          {!overview.isLoading && overviewRows.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No branches to show.</p>
          )}

          {overviewRows.map((row) => (
            <div
              key={row.branchId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-3) 0",
                borderTop: "1px solid var(--border-default)",
              }}
            >
              <div>
                <strong style={{ fontSize: "var(--text-sm)" }}>{row.branchName}</strong>
                {row.admins.length === 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>No office login assigned</p>
                )}
                {row.admins.map((a) => (
                  <p key={a.id} style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                    {a.name ?? a.email} · in {formatTime(a.loginAt)} · out {formatTime(a.logoutAt)}
                  </p>
                ))}
              </div>
              <Badge tone={row.marked ? "success" : "danger"}>{row.marked ? "Checked in" : "Missed"}</Badge>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Tasks</h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Tasks assigned to branches that are still pending.
              </p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
              {!pendingTasks.isLoading && pendingTaskRows.length > 0 && <Badge tone="warning">{pendingTaskRows.length} pending</Badge>}
              <Link to="/admin/tasks">
                <Button variant="secondary" size="sm">
                  Manage tasks →
                </Button>
              </Link>
            </div>
          </div>

          {!pendingTasks.isLoading && pendingTaskRows.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>No pending tasks.</p>
          )}

          {pendingTaskRows.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-3) 0",
                borderTop: "1px solid var(--border-default)",
              }}
            >
              <div>
                <strong style={{ fontSize: "var(--text-sm)" }}>{t.title}</strong>
                <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{t.branch?.name ?? "—"}</p>
              </div>
              {t.dueDate && (
                <span style={{ fontSize: "var(--text-xs)", color: isOverdue(t.dueDate, t.status) ? "var(--color-danger-500)" : "var(--text-tertiary)" }}>
                  Due {formatDate(t.dueDate)}
                  {isOverdue(t.dueDate, t.status) && " · overdue"}
                </span>
              )}
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
