import { AppShell } from "@/app/AppShell";
import { EmptyState, Card } from "@/components/ui";
import { useAuthStore } from "@/features/auth/authStore";

interface RoleDashboardProps {
  heading: string;
  upcomingModules: string[];
}

/**
 * Honest placeholder for a role's home screen: real user identity from the
 * authenticated session, no fabricated data. Each role's actual dashboard
 * (attendance, assignments, fees, etc.) is built module-by-module per
 * docs/ARCHITECTURE.md — this keeps the route/shell/RBAC skeleton in place
 * so those modules slot in without touching auth or layout.
 */
export function RoleDashboard({ heading, upcomingModules }: RoleDashboardProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <AppShell>
      <h1 style={{ marginTop: 0 }}>{heading}</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Signed in as {user?.email ?? user?.username}
        {user?.branchId ? ` · Branch ${user.branchId}` : ""}
      </p>
      <Card style={{ marginTop: "var(--space-6)" }}>
        <EmptyState
          title="This workspace is under construction"
          description={`Coming next: ${upcomingModules.join(", ")}. Authentication, roles, and navigation are live — the modules above are being built next.`}
        />
      </Card>
    </AppShell>
  );
}
