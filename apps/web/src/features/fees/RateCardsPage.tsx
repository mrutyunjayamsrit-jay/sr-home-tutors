import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRateCards, useDeleteRateCard } from "./api";
import { useBranches } from "@/features/branches/api";
import { CreateRateCardDialog } from "./CreateRateCardDialog";
import type { FeeRateCard } from "./types";

/**
 * Fee pricing is a Super Admin-only decision (see fees.routes.ts) — a
 * Branch Admin can still see the rates that apply to their own branch from
 * the Fees page when raising an invoice, but adding/removing a rate card
 * only happens here, across every branch.
 */
export function RateCardsPage() {
  const [branchId, setBranchId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: branches } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const rateCards = useRateCards({ branchId: branchId || undefined });
  const deleteRateCard = useDeleteRateCard();

  const handleDelete = async (id: string) => {
    try {
      await deleteRateCard.mutateAsync(id);
      toast.success("Rate card removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove rate card");
    }
  };

  const columns: Column<FeeRateCard>[] = [
    { key: "branch", header: "Branch", render: (r) => r.branch?.name ?? "—" },
    { key: "board", header: "Board", render: (r) => r.board },
    { key: "category", header: "Class category", render: (r) => r.classCategory },
    { key: "rate", header: "Rate/class", render: (r) => `₹${r.ratePerClass}` },
    { key: "cycle", header: "Billing cycle", render: (r) => r.billingCycle },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(r.id);
          }}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Fee Rate Cards</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              Set the rate per class for each board/class category, per branch. Branch offices can see these rates but can't change them.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New rate card</Button>
        </div>

        <div style={{ maxWidth: 280, margin: "0 0 var(--space-4)" }}>
          <Select
            label="Branch"
            placeholder="All branches"
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          rows={rateCards.data ?? []}
          rowKey={(r) => r.id}
          isLoading={rateCards.isLoading}
          emptyTitle="No rate cards yet"
          emptyDescription="Add a rate per class for each board/class category."
        />
      </div>

      <CreateRateCardDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
