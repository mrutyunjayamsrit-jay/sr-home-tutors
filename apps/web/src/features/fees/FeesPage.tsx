import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import type { NavItem } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, Badge, Alert, Select, TextField } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRateCards, useInvoices, useApproveInvoice } from "./api";
import { useBranches } from "@/features/branches/api";
import { useAuthStore } from "@/features/auth/authStore";
import { toast } from "@/components/ui";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { ViewDocumentsDialog } from "@/features/documents/ViewDocumentsDialog";
import type { DocumentsTarget } from "@/features/documents/ViewDocumentsDialog";
import type { Board, BillingCycle, FeeRateCard, StudentFeeInvoice } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "rateCards" | "invoices";

interface FeesPageProps {
  /** Defaults to the Branch Office nav — pass ADMIN_NAV when mounting this under /admin. Same component either way: Super Admin gets a branch filter/column the office view doesn't need. */
  nav?: NavItem[];
}

const STATUS_TONE: Record<StudentFeeInvoice["status"], "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "neutral",
  OVERDUE: "danger",
};

const STATUS_FILTER_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

const BOARD_OPTIONS = [
  { value: "STATE", label: "State Board" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "OTHER", label: "Other" },
];
const CYCLE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "PACKAGE", label: "Package" },
];

const MONTH_PERIOD_RE = /^(\d{4})-(\d{2})$/;

/** Period is stored as "YYYY-MM" for a monthly invoice, or a free-form package identifier otherwise — rendered as "August 2026" for the former so it's self-explanatory at a glance, left as-is for the latter. */
function formatPeriod(period: string) {
  const match = MONTH_PERIOD_RE.exec(period);
  if (!match) return period;
  const [, year, month] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatPaymentDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function FeesPage({ nav = BRANCH_NAV }: FeesPageProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [tab, setTab] = useState<Tab>("rateCards");
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [rcBoard, setRcBoard] = useState<"" | Board>("");
  const [rcClassCategory, setRcClassCategory] = useState("");
  const [rcBillingCycle, setRcBillingCycle] = useState<"" | BillingCycle>("");
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<StudentFeeInvoice | null>(null);
  const [proofTarget, setProofTarget] = useState<DocumentsTarget | null>(null);

  const { data: branches } = useBranches({ page: 1, pageSize: 100 }, isSuperAdmin);
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  // Rate cards are read-only here — Super Admin sets pricing (see
  // fees.routes.ts rateCardWriteAccess); a branch office just needs to see
  // the current rates while raising an invoice below.
  const rateCards = useRateCards({
    branchId: isSuperAdmin ? branchId || undefined : undefined,
    board: rcBoard || undefined,
    classCategory: rcClassCategory || undefined,
    billingCycle: rcBillingCycle || undefined,
  });
  const hasActiveRateCardFilters = Boolean((isSuperAdmin && branchId) || rcBoard || rcClassCategory || rcBillingCycle);
  const handleClearRateCardFilters = () => {
    if (isSuperAdmin) setBranchId("");
    setRcBoard("");
    setRcClassCategory("");
    setRcBillingCycle("");
  };
  const invoices = useInvoices({
    page: 1,
    pageSize: 50,
    branchId: isSuperAdmin ? branchId || undefined : undefined,
    status: statusFilter || undefined,
    search: invoiceSearch || undefined,
    period: periodFilter || undefined,
    paymentMethod: paymentMethodFilter || undefined,
    paidFrom: paidFrom || undefined,
    paidTo: paidTo || undefined,
  });
  const hasActiveInvoiceFilters = Boolean(
    (isSuperAdmin && branchId) || statusFilter || invoiceSearch || periodFilter || paymentMethodFilter || paidFrom || paidTo,
  );
  const handleClearInvoiceFilters = () => {
    if (isSuperAdmin) setBranchId("");
    setStatusFilter("");
    setInvoiceSearch("");
    setPeriodFilter("");
    setPaymentMethodFilter("");
    setPaidFrom("");
    setPaidTo("");
  };
  const approveInvoice = useApproveInvoice();

  const handleApprove = async (invoice: StudentFeeInvoice) => {
    try {
      await approveInvoice.mutateAsync(invoice.id);
      toast.success(`Approved payment for ${invoice.student.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve invoice");
    }
  };

  const rateCardColumns: Column<FeeRateCard>[] = [
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (r: FeeRateCard) => r.branch?.name ?? "—" } as Column<FeeRateCard>] : []),
    { key: "board", header: "Board", render: (r) => r.board },
    { key: "category", header: "Class category", render: (r) => r.classCategory },
    { key: "subjects", header: "Subjects", render: (r) => r.numberOfSubjects ?? "—" },
    { key: "cycle", header: "Billing cycle", render: (r) => (r.billingCycle === "PACKAGE" ? "Package" : "Monthly") },
    {
      key: "details",
      header: "Rate / Package",
      render: (r) =>
        r.billingCycle === "PACKAGE" ? `${r.totalClasses} classes · ₹${r.totalAmount}` : `₹${r.ratePerClass}/class`,
    },
  ];

  const invoiceColumns: Column<StudentFeeInvoice>[] = [
    { key: "student", header: "Student", render: (i) => `${i.student.name} (${i.student.studentClass})` },
    ...(isSuperAdmin ? [{ key: "branch", header: "Branch", render: (i: StudentFeeInvoice) => i.student.parent.branch?.name ?? "—" } as Column<StudentFeeInvoice>] : []),
    { key: "period", header: "Period", render: (i) => formatPeriod(i.period) },
    { key: "fixed", header: "Fixed classes", render: (i) => i.fixedClasses },
    { key: "taken", header: "Classes taken", render: (i) => i.classesTaken },
    { key: "payable", header: "Payable", render: (i) => `₹${i.payableFees}` },
    { key: "balance", header: "Balance", render: (i) => `₹${i.balance}` },
    { key: "paymentMethod", header: "Payment method", render: (i) => i.paymentMethod ?? "—" },
    { key: "paidAt", header: "Date of payment", render: (i) => formatPaymentDate(i.paidAt) },
    { key: "status", header: "Status", render: (i) => <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge> },
    {
      key: "proof",
      header: "Payment proof",
      render: (i) => (i.proofCount > 0 ? <Badge tone="success">{i.proofCount} file{i.proofCount === 1 ? "" : "s"}</Badge> : <Badge tone="neutral">None</Badge>),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "approval",
            header: "Approval",
            render: (i: StudentFeeInvoice) =>
              i.approvedAt ? <Badge tone="success">Approved</Badge> : <Badge tone="warning">Pending approval</Badge>,
          } as Column<StudentFeeInvoice>,
        ]
      : []),
    {
      key: "actions",
      header: "",
      render: (i) =>
        isSuperAdmin ? (
          // Recording the payment/proof is the branch office's job — Super
          // Admin's own role on an invoice is to review and approve it.
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setProofTarget({ ownerId: i.id, title: `Payment proof — ${i.student.name}` });
              }}
            >
              View
            </Button>
            {!i.approvedAt && (
              <Button
                size="sm"
                variant="secondary"
                loading={approveInvoice.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(i);
                }}
                disabled={i.paidAmount <= 0}
              >
                Approve
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            {i.status !== "PAID" && (
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPaymentTarget(i); }}>
                Record payment
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setProofTarget({ ownerId: i.id, title: `Payment proof — ${i.student.name}` });
              }}
            >
              {i.proofCount > 0 ? "View proof" : "Add proof"}
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
            <h1 style={{ margin: 0 }}>Fees</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              {isSuperAdmin ? "Rate cards and student fee invoices across every branch." : "Rate cards by board/class, and student fee invoices."}
            </p>
          </div>
          {tab === "invoices" && !isSuperAdmin && <Button onClick={() => setCreateInvoiceOpen(true)}>+ New invoice</Button>}
        </div>

        {(isSuperAdmin || tab === "invoices" || tab === "rateCards") && (
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
            {isSuperAdmin && (
              <div style={{ maxWidth: 260 }}>
                <Select label="Branch" placeholder="All branches" options={branchOptions} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
              </div>
            )}
            {tab === "invoices" && (
              <>
                <div style={{ maxWidth: 220 }}>
                  <TextField label="Student" placeholder="Search by student name" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                </div>
                <div style={{ maxWidth: 220 }}>
                  <Select
                    label="Status"
                    placeholder="All statuses"
                    options={STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>
                <div style={{ maxWidth: 180 }}>
                  <TextField label="Period" placeholder="e.g. 2026-08" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} />
                </div>
                <div style={{ maxWidth: 200 }}>
                  <TextField
                    label="Payment method"
                    placeholder="Cash, UPI, Bank..."
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  />
                </div>
                <div style={{ maxWidth: 170 }}>
                  <TextField label="Paid from" type="date" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} />
                </div>
                <div style={{ maxWidth: 170 }}>
                  <TextField label="Paid to" type="date" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <Button variant="ghost" onClick={handleClearInvoiceFilters} disabled={!hasActiveInvoiceFilters}>
                    Clear all filters
                  </Button>
                </div>
              </>
            )}
            {tab === "rateCards" && (
              <>
                <div style={{ maxWidth: 180 }}>
                  <Select label="Board" placeholder="All" options={BOARD_OPTIONS} value={rcBoard} onChange={(e) => setRcBoard(e.target.value as "" | Board)} />
                </div>
                <div style={{ maxWidth: 200 }}>
                  <TextField label="Class category" placeholder="Search class category" value={rcClassCategory} onChange={(e) => setRcClassCategory(e.target.value)} />
                </div>
                <div style={{ maxWidth: 180 }}>
                  <Select
                    label="Billing cycle"
                    placeholder="All"
                    options={CYCLE_OPTIONS}
                    value={rcBillingCycle}
                    onChange={(e) => setRcBillingCycle(e.target.value as "" | BillingCycle)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <Button variant="ghost" onClick={handleClearRateCardFilters} disabled={!hasActiveRateCardFilters}>
                    Clear all filters
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "rateCards" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("rateCards")} type="button">
            Rate Cards
          </button>
          <button className={[styles.tab, tab === "invoices" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("invoices")} type="button">
            Student Invoices
          </button>
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          {tab === "rateCards" ? (
            <>
              {!isSuperAdmin && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <Alert variant="info">Rates are set by Super Admin. Contact them to add or change a rate card.</Alert>
                </div>
              )}
              <DataTable
                columns={rateCardColumns}
                rows={rateCards.data ?? []}
                rowKey={(r) => r.id}
                isLoading={rateCards.isLoading}
                emptyTitle="No rate cards yet"
                emptyDescription={isSuperAdmin ? "Add one from Fee Rate Cards." : "Super Admin hasn't set a rate card for this branch yet."}
              />
            </>
          ) : (
            <DataTable
              columns={invoiceColumns}
              rows={invoices.data?.data ?? []}
              rowKey={(i) => i.id}
              isLoading={invoices.isLoading}
              emptyTitle="No invoices yet"
              emptyDescription={isSuperAdmin ? "Invoices raised by branches show up here." : "Create an invoice for a student to start tracking their fees."}
            />
          )}
        </div>
      </div>

      <CreateInvoiceDialog open={createInvoiceOpen} onClose={() => setCreateInvoiceOpen(false)} />
      <RecordPaymentDialog invoice={paymentTarget} onClose={() => setPaymentTarget(null)} />
      <ViewDocumentsDialog
        target={proofTarget}
        onClose={() => setProofTarget(null)}
        ownerType="STUDENT_FEE_INVOICE"
        docType="PAYMENT_PROOF"
        canManage={!isSuperAdmin}
      />
    </AppShell>
  );
}
