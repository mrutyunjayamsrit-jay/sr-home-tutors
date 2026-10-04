import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, Card, DataTable, TextField, Badge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { toast } from "@/components/ui";
import {
  useTutorAttendanceReport,
  useStudentAttendanceReport,
  useTutorPaymentsSummary,
  useStudentFeesReport,
  downloadReportCsv,
  type ReportFilters,
  type TutorPaymentsSummaryTotals,
  type StudentFeesSummary,
} from "./api";
import { MarkTutorPaidDialog } from "./MarkTutorPaidDialog";
import type { StudentAttendanceRow, StudentFeeRow, TutorAttendanceRow, TutorPaymentSummaryRow } from "./types";
import styles from "./ReportsPage.module.css";

type ReportKind = "tutorAttendance" | "studentAttendance" | "tutorPayments" | "studentFees";

const TABS: { key: ReportKind; label: string }[] = [
  { key: "tutorAttendance", label: "Tutor Attendance" },
  { key: "studentAttendance", label: "Student Attendance" },
  { key: "tutorPayments", label: "Tutor Payments" },
  { key: "studentFees", label: "Student Fees" },
];

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Same report engine as the Super Admin's ReportsPage, minus the branch
 * selector — a Branch Admin can't call GET /branches (Super Admin only),
 * and doesn't need to: every request here is already forced to their own
 * branch server-side (see reports.controller.ts's effectiveBranchId).
 */
export function BranchReportsPage() {
  const [tab, setTab] = useState<ReportKind>("tutorAttendance");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [tutorName, setTutorName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [payTutor, setPayTutor] = useState<TutorPaymentSummaryRow | null>(null);

  const filters: ReportFilters = { from, to, tutorName: tutorName || undefined, studentName: studentName || undefined };
  const rangeValid = Boolean(from && to && from <= to);

  const tutorAttendance = useTutorAttendanceReport(filters, rangeValid && tab === "tutorAttendance");
  const studentAttendance = useStudentAttendanceReport(filters, rangeValid && tab === "studentAttendance");
  const tutorPayments = useTutorPaymentsSummary(filters, rangeValid && tab === "tutorPayments");
  const studentFees = useStudentFeesReport(filters, rangeValid && tab === "studentFees");

  const handleExport = async () => {
    const kindMap: Record<ReportKind, Parameters<typeof downloadReportCsv>[0]> = {
      tutorAttendance: "attendance/tutors",
      studentAttendance: "attendance/students",
      tutorPayments: "payments/tutors/summary",
      studentFees: "fees/students",
    };
    setDownloading(true);
    try {
      await downloadReportCsv(kindMap[tab], filters, `${kindMap[tab].replace("/", "-")}_${from}_to_${to}.csv`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0, marginBottom: "var(--space-1)" }}>Reports</h1>
        <p style={{ marginTop: 0, color: "var(--text-secondary)" }}>
          Attendance and payment reports for your branch, computed live from real class data.
        </p>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t.key} className={[styles.tab, tab === t.key ? styles.tabActive : ""].join(" ")} onClick={() => setTab(t.key)} type="button">
              {t.label}
            </button>
          ))}
        </div>

        <Card style={{ marginBottom: "var(--space-4)" }}>
          <div className={styles.filters}>
            <label className={styles.filterField}>
              <span>From</span>
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={styles.dateInput} />
            </label>
            <label className={styles.filterField}>
              <span>To</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={styles.dateInput} />
            </label>
            {tab === "tutorPayments" && (
              <div style={{ minWidth: 200 }}>
                <TextField label="Tutor name" placeholder="Search by tutor" value={tutorName} onChange={(e) => setTutorName(e.target.value)} />
              </div>
            )}
            {tab === "studentFees" && (
              <div style={{ minWidth: 200 }}>
                <TextField label="Student name" placeholder="Search by student" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              </div>
            )}
            <Button variant="secondary" onClick={handleExport} loading={downloading} style={{ marginLeft: "auto" }}>
              Export CSV
            </Button>
          </div>
        </Card>

        {!rangeValid && <p style={{ color: "var(--color-danger-500)" }}>"From" date must be on or before "To" date.</p>}

        {tab === "tutorAttendance" && <TutorAttendanceTable data={tutorAttendance.data?.rows} isLoading={tutorAttendance.isLoading} />}
        {tab === "studentAttendance" && <StudentAttendanceTable data={studentAttendance.data?.rows} isLoading={studentAttendance.isLoading} />}
        {tab === "tutorPayments" && (
          <TutorPaymentsTable
            data={tutorPayments.data?.rows}
            summary={tutorPayments.data?.summary}
            isLoading={tutorPayments.isLoading}
            onMarkPaid={setPayTutor}
          />
        )}
        {tab === "studentFees" && (
          <StudentFeesTable data={studentFees.data?.rows} summary={studentFees.data?.summary} isLoading={studentFees.isLoading} />
        )}
      </div>

      <MarkTutorPaidDialog tutor={payTutor} from={from} to={to} onClose={() => setPayTutor(null)} />
    </AppShell>
  );
}

const EMPTY_TITLE = "No data for this period yet";
const EMPTY_DESC = "This fills in automatically as classes are scheduled and marked.";

function TutorAttendanceTable({ data, isLoading }: { data?: TutorAttendanceRow[]; isLoading: boolean }) {
  const columns: Column<TutorAttendanceRow>[] = [
    { key: "tutorName", header: "Tutor", render: (r) => r.tutorName },
    { key: "studentName", header: "Student", render: (r) => `${r.studentName} (${r.studentClass})` },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
    { key: "fixedFees", header: "Fixed Fee/Class", render: (r) => `₹${r.fixedFees}` },
    { key: "present", header: "Present", render: (r) => r.present },
    { key: "absent", header: "Absent", render: (r) => r.absent },
    { key: "hours", header: "Hours Worked", render: (r) => r.totalHoursWorked },
    {
      key: "shortClasses",
      header: "Short Classes",
      render: (r) =>
        r.shortClasses > 0 ? (
          <strong style={{ color: "var(--color-danger-500)" }} title={`${r.shortClasses} class(es) under 40 minutes`}>
            {r.shortClasses} ⚠
          </strong>
        ) : (
          r.shortClasses
        ),
    },
  ];
  return <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.assignmentId} isLoading={isLoading} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESC} />;
}

function StudentAttendanceTable({ data, isLoading }: { data?: StudentAttendanceRow[]; isLoading: boolean }) {
  const columns: Column<StudentAttendanceRow>[] = [
    { key: "studentName", header: "Student", render: (r) => r.studentName },
    { key: "tutorName", header: "Tutor", render: (r) => r.tutorName },
    { key: "subjects", header: "Subjects", render: (r) => r.subjects || "—" },
    { key: "classesAttended", header: "Classes Attended", render: (r) => r.classesAttended },
    { key: "chaptersCompleted", header: "Chapters Completed", render: (r) => r.chaptersCompleted || "—" },
    { key: "hours", header: "Time Spent (hrs)", render: (r) => r.totalTimeSpentHours },
  ];
  return <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.assignmentId} isLoading={isLoading} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESC} />;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "neutral",
  OVERDUE: "danger",
};

function TutorPaymentsTable({
  data,
  summary,
  isLoading,
  onMarkPaid,
}: {
  data?: TutorPaymentSummaryRow[];
  summary?: TutorPaymentsSummaryTotals;
  isLoading: boolean;
  onMarkPaid: (row: TutorPaymentSummaryRow) => void;
}) {
  const columns: Column<TutorPaymentSummaryRow>[] = [
    { key: "tutorName", header: "Tutor", render: (r) => <strong>{r.tutorName}</strong> },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
    { key: "classesTaken", header: "Classes Taken", render: (r) => r.classesTaken },
    { key: "classesAbsent", header: "Classes Absent", render: (r) => r.classesAbsent },
    { key: "hours", header: "Hours Taught", render: (r) => r.totalHoursTaught },
    { key: "payable", header: "Payable", render: (r) => `₹${r.payableAmount}` },
    { key: "paid", header: "Paid", render: (r) => <span style={{ color: "var(--color-success-500)" }}>₹{r.paidAmount}</span> },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (r) => (
        <strong style={{ color: r.outstandingAmount > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>
          ₹{r.outstandingAmount}
        </strong>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) =>
        r.outstandingAmount > 0 ? (
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onMarkPaid(r); }}>
            Mark as paid
          </Button>
        ) : (
          <Badge tone="success">Settled</Badge>
        ),
    },
  ];
  return (
    <>
      {summary && (data?.length ?? 0) > 0 && (
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          Across {data?.length} tutor{data?.length === 1 ? "" : "s"}: payable <strong>₹{summary.totalPayable}</strong> · paid{" "}
          <strong style={{ color: "var(--color-success-500)" }}>₹{summary.totalPaid}</strong> · outstanding{" "}
          <strong style={{ color: summary.totalOutstanding > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>
            ₹{summary.totalOutstanding}
          </strong>
        </p>
      )}
      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.tutorId} isLoading={isLoading} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESC} />
    </>
  );
}

function StudentFeesTable({ data, summary, isLoading }: { data?: StudentFeeRow[]; summary?: StudentFeesSummary; isLoading: boolean }) {
  const columns: Column<StudentFeeRow>[] = [
    { key: "studentName", header: "Student", render: (r) => `${r.studentName} (${r.studentClass})` },
    { key: "period", header: "Period", render: (r) => r.period },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
    { key: "classesTaken", header: "Classes Taken", render: (r) => r.classesTaken },
    { key: "payableFees", header: "Payable Fees", render: (r) => `₹${r.payableFees}` },
    { key: "paidAmount", header: "Paid", render: (r) => <span style={{ color: "var(--color-success-500)" }}>₹{r.paidAmount}</span> },
    {
      key: "balance",
      header: "Outstanding",
      render: (r) => (
        <strong style={{ color: r.balance > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>₹{r.balance}</strong>
      ),
    },
    { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
  ];
  return (
    <>
      {summary && (data?.length ?? 0) > 0 && (
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          Payable <strong>₹{summary.totalPayable}</strong> · paid <strong style={{ color: "var(--color-success-500)" }}>₹{summary.totalPaid}</strong> ·
          outstanding{" "}
          <strong style={{ color: summary.totalBalance > 0 ? "var(--color-danger-500)" : "var(--color-success-500)" }}>
            ₹{summary.totalBalance}
          </strong>
        </p>
      )}
      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => `${r.studentName}-${r.period}`}
        isLoading={isLoading}
        emptyTitle="No fee invoices for this period yet"
        emptyDescription="Create invoices from the Fees page to see them here."
      />
    </>
  );
}
