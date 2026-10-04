import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Button, DataTable, TextField, Select, Badge, Modal } from "@/components/ui";
import type { Column } from "@/components/ui";
import { toast } from "@/components/ui";
import { useUsers, useDeleteUser, useEnableUser, usePermanentlyDeleteUser } from "./api";
import { CreateUserDialog } from "./CreateUserDialog";
import type { UserListItem } from "./types";
import type { Role } from "@/features/auth/types";
import { ROLE_LABEL } from "@/features/auth/types";

const ROLE_FILTER_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "BRANCH_ADMIN", label: "Branch Office" },
  { value: "TUTOR", label: "Tutor" },
  { value: "PARENT", label: "Parent" },
  { value: "STUDENT", label: "Student" },
];

const STATUS_TONE: Record<UserListItem["status"], "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PENDING_ACTIVATION: "warning",
  DISABLED: "neutral",
};

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<UserListItem | null>(null);
  const [pendingHardDelete, setPendingHardDelete] = useState<UserListItem | null>(null);
  const [hardDeleteConfirmText, setHardDeleteConfirmText] = useState("");

  const { data, isLoading } = useUsers({ page, pageSize: 20, search: search || undefined, role: role || undefined });
  const deleteUser = useDeleteUser();
  const enableUser = useEnableUser();
  const hardDeleteUser = usePermanentlyDeleteUser();

  const columns: Column<UserListItem>[] = [
    { key: "name", header: "Name", render: (u) => <strong>{u.name}</strong> },
    { key: "role", header: "Role", render: (u) => <Badge tone="info">{ROLE_LABEL[u.role]}</Badge> },
    { key: "contact", header: "Email / Username", render: (u) => u.email ?? u.username ?? "—" },
    { key: "branch", header: "Branch", render: (u) => u.branch?.name ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge tone={STATUS_TONE[u.status]}>{u.status.replace("_", " ")}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (u) =>
        u.status === "DISABLED" ? (
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEnable(u);
              }}
              loading={enableUser.isPending}
            >
              Enable
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setHardDeleteConfirmText("");
                setPendingHardDelete(u);
              }}
            >
              Delete permanently
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDisable(u);
            }}
          >
            Disable
          </Button>
        ),
    },
  ];

  const handleEnable = async (u: UserListItem) => {
    try {
      await enableUser.mutateAsync(u.id);
      toast.success(`${u.name} re-enabled`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable user");
    }
  };

  const confirmDisable = async () => {
    if (!pendingDisable) return;
    try {
      await deleteUser.mutateAsync(pendingDisable.id);
      toast.success(`${pendingDisable.name} disabled`);
      setPendingDisable(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disable user");
    }
  };

  const hardDeleteConfirmTarget = pendingHardDelete?.username ?? pendingHardDelete?.email ?? "";
  const hardDeleteConfirmMatches = hardDeleteConfirmText.trim() === hardDeleteConfirmTarget && hardDeleteConfirmTarget !== "";

  const confirmHardDelete = async () => {
    if (!pendingHardDelete || !hardDeleteConfirmMatches) return;
    try {
      await hardDeleteUser.mutateAsync(pendingHardDelete.id);
      toast.success(`${pendingHardDelete.name} permanently deleted`);
      setPendingHardDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not permanently delete user");
    }
  };

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Users & Roles</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Every login across every branch — branch offices, tutors, parents, and students.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Add user</Button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-4)", maxWidth: 520 }}>
          <div style={{ flex: 1 }}>
            <TextField
              label="Search"
              placeholder="Search by name, email, or username"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ width: 200 }}>
            <Select
              label="Role"
              placeholder="All roles"
              options={ROLE_FILTER_OPTIONS}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role | "");
                setPage(1);
              }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          emptyTitle={search || role ? "No users match your filters" : "No users yet"}
          emptyDescription={search || role ? undefined : "Add a branch office, tutor, parent, or student login to get started."}
        />

        {data?.meta && data.meta.totalPages && data.meta.totalPages > 1 && (
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)", justifyContent: "flex-end" }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span style={{ alignSelf: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (data.meta.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={Boolean(pendingDisable)} onClose={() => setPendingDisable(null)} title="Disable user">
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          This disables <strong>{pendingDisable?.name}</strong>'s login immediately and signs them out everywhere.
          Their historical records (attendance, payments) are preserved, not erased, and this can be undone any time from
          the Enable button.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <Button variant="secondary" fullWidth onClick={() => setPendingDisable(null)}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth loading={deleteUser.isPending} onClick={confirmDisable}>
            Disable
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingHardDelete)}
        onClose={() => setPendingHardDelete(null)}
        title="Permanently delete user"
      >
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          This permanently deletes <strong>{pendingHardDelete?.name}</strong>'s login. Unlike disabling, this{" "}
          <strong>cannot be undone</strong>. Their Tutor/Parent/Student profile and history (attendance, payments,
          assignments) stay on record — only the login itself is removed.
        </p>
        <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)" }}>
          Type <strong>{hardDeleteConfirmTarget}</strong> to confirm.
        </p>
        <div style={{ margin: "var(--space-2) 0 var(--space-4)" }}>
          <TextField
            label="Confirm username or email"
            value={hardDeleteConfirmText}
            onChange={(e) => setHardDeleteConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button variant="secondary" fullWidth onClick={() => setPendingHardDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!hardDeleteConfirmMatches}
            loading={hardDeleteUser.isPending}
            onClick={confirmHardDelete}
          >
            Permanently delete
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
