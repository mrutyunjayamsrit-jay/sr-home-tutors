import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Button, DataTable, TextField, Badge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useBranches } from "./api";
import { CreateBranchDialog } from "./CreateBranchDialog";
import type { Branch } from "./types";

export function BranchListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const { data, meta, isLoading } = useBranchesView(page, search);

  const columns: Column<Branch>[] = [
    { key: "name", header: "Branch", render: (b) => <strong>{b.name}</strong> },
    { key: "code", header: "Code", render: (b) => b.code },
    { key: "contact", header: "Contact", render: (b) => b.contactEmail ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (b) => <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Branches</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              {meta?.total ?? 0} branch{meta?.total === 1 ? "" : "es"}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New branch</Button>
        </div>

        <div style={{ marginBottom: "var(--space-4)", maxWidth: 320 }}>
          <TextField
            label="Search"
            placeholder="Search by name or code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          emptyTitle={search ? "No branches match your search" : "No branches yet"}
          emptyDescription={search ? undefined : "Create the first branch to get started."}
          onRowClick={(b) => navigate(`/admin/branches/${b.id}`)}
        />

        {meta && meta.totalPages && meta.totalPages > 1 && (
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)", justifyContent: "flex-end" }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span style={{ alignSelf: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (meta.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <CreateBranchDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

function useBranchesView(page: number, search: string) {
  const query = useBranches({ page, pageSize: 20, search: search || undefined });
  return {
    data: query.data?.data,
    meta: query.data?.meta,
    isLoading: query.isLoading,
  };
}
