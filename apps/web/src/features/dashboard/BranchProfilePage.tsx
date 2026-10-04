import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Spinner, Alert } from "@/components/ui";
import { useBranch } from "@/features/branches/api";
import { BranchEditForm } from "@/features/branches/BranchEditForm";
import { useAuthStore } from "@/features/auth/authStore";

export function BranchProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: branch, isLoading, isError, error } = useBranch(user?.branchId ?? undefined);

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0 }}>Branch profile</h1>
        {isLoading && <Spinner size="lg" />}
        {isError && <Alert variant="danger">{error instanceof Error ? error.message : "Could not load branch"}</Alert>}
        {branch && <BranchEditForm branch={branch} />}
      </div>
    </AppShell>
  );
}
