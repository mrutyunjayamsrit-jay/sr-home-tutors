import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import type { NavItem } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, Card, DataTable, Select, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useExpenses, useDeleteExpense } from "./api";
import { useBranches } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";
import { CreateExpenseDialog } from "./CreateExpenseDialog";
import { ViewDocumentsDialog } from "@/features/documents/ViewDocumentsDialog";
import type { DocumentsTarget } from "@/features/documents/ViewDocumentsDialog";
import type { Expense } from "./types";

interface AccountsPageProps {
  /** Defaults to the Branch Office nav — pass ADMIN_NAV when mounting this under /admin. Same component either way: Super Admin gets a branch filter/column the office view doesn't need. */
  nav?: NavItem[];
}

export function AccountsPage({ nav = BRANCH_NAV }: AccountsPageProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [createOpen, setCreateOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [receiptsTarget, setReceiptsTarget] = useState<DocumentsTarget | null>(null);

  const { data: branches } = useBranches({ page: 1, pageSize: 100 }, isSuperAdmin);
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const { data, isLoading } = useExpenses({ page: 1, pageSize: 50, branchId: isSuperAdmin ? branchId || undefined : undefined });
  const deleteExpense = useDeleteExpense();

  const totalAmount = (data?.meta as { totalAmount?: number } | undefined)?.totalAmount ?? 0;

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Expense removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove expense");
    }
  };

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", render: (e) => new Date(e.expenseDate).toLocaleDateString() },
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (e: Expense) => e.branch?.name ?? "—" } as Column<Expense>] : []),
    { key: "category", header: "Category", render: (e) => e.category },
    { key: "description", header: "Description", render: (e) => e.description },
    { key: "amount", header: "Amount", render: (e) => `₹${e.amount}` },
    {
      key: "receipt",
      header: "Receipt",
      render: (e) =>
        e.receiptCount > 0 ? (
          <Badge tone="success">{e.receiptCount} file{e.receiptCount === 1 ? "" : "s"}</Badge>
        ) : (
          <Badge tone="neutral">None</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(ev) => {
              ev.stopPropagation();
              setReceiptsTarget({ ownerId: e.id, title: `Receipt — ${e.description}` });
            }}
          >
            {e.receiptCount > 0 ? "View receipt" : "Add receipt"}
          </Button>
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell nav={nav}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>{isSuperAdmin ? "Expenses" : "Accounts"}</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              {isSuperAdmin ? "Operating expenses across every branch, with receipts." : "Branch operating expenses."}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New expense</Button>
        </div>

        {isSuperAdmin && (
          <div style={{ maxWidth: 260, marginBottom: "var(--space-4)" }}>
            <Select label="Branch" placeholder="All branches" options={branchOptions} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
        )}

        <Card style={{ marginBottom: "var(--space-4)", maxWidth: 260 }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 600 }}>Total (this page)</span>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>₹{totalAmount}</div>
        </Card>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyTitle="No expenses recorded yet"
          emptyDescription="Add rent, salaries, utilities, and other branch expenses here."
        />
      </div>

      <CreateExpenseDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ViewDocumentsDialog target={receiptsTarget} onClose={() => setReceiptsTarget(null)} ownerType="EXPENSE" docType="RECEIPT" />
    </AppShell>
  );
}
