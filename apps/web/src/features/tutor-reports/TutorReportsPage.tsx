import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Button, Card, DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { toast } from "@/components/ui";
import {
  useTutorAttendanceReport,
  useStudentAttendanceReport,
  useTutorPaymentsReport,
  downloadReportCsv,
  type ReportFilters,
} from "@/features/reports/api";
import type { StudentAttendanceRow, TutorAttendanceRow, TutorPaymentRow } from "@/features/reports/types";
import styles from "@/features/reports/ReportsPage.module.css";

type ReportKind = "tutorAttendance" | "studentAttendance" | "tutorPayments";

const TABS: { key: ReportKind; label: string }[] = [
  { key: "tutorAttendance", label: "My Attendance" },
  { key: "studentAttendance", label: "Student Attendance" },
  { key: "tutorPayments", label: "My Payments" },
];

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Same live-computed report engine as the office's Reports pages, scoped
 * to the tutor's own assignments server-side (see reports.controller.ts's
 * effectiveTutorId) — no branch/tutor picker needed here, and the student
 * fees report is intentionally not offered (billing is between the
 * institute and the parent, not a tutor's concern).
 */
export function TutorReportsPage() {
  const [tab, setTab] = useState<ReportKind>("tutorAttendance");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [downloading, setDownloading] = useState(false);

  const filters: ReportFilters = { from, to };
  const rangeValid = Boolean(from && to && from <= to);

  const tutorAttendance = useTutorAttendanceReport(filters, rangeValid && tab === "tutorAttendance");
  const studentAttendance = useStudentAttendanceReport(filters, rangeValid && tab === "studentAttendance");
  const tutorPayments = useTutorPaymentsReport(filters, rangeValid && tab === "tutorPayments");

  const handleExport = async () => {
    const kindMap: Record<ReportKind, Parameters<typeof downloadReportCsv>[0]> = {
      tutorAttendance: "attendance/tutors",
      studentAttendance: "attendance/students",
      tutorPayments: "payments/tutors",
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
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ marginTop: 0, marginBottom: "var(--space-1)" }}>Reports</h1>
        <p style={{ marginTop: 0, color: "var(--text-secondary)" }}>Your own attendance and payment history.</p>

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
            <Button variant="secondary" onClick={handleExport} loading={downloading} style={{ marginLeft: "auto" }}>
              Export CSV
            </Button>
          </div>
        </Card>

        {!rangeValid && <p style={{ color: "var(--color-danger-500)" }}>"From" date must be on or before "To" date.</p>}

        {tab === "tutorAttendance" && <TutorAttendanceTable data={tutorAttendance.data?.rows} isLoading={tutorAttendance.isLoading} />}
        {tab === "studentAttendance" && <StudentAttendanceTable data={studentAttendance.data?.rows} isLoading={studentAttendance.isLoading} />}
        {tab === "tutorPayments" && (
          <TutorPaymentsTable data={tutorPayments.data?.rows} summary={tutorPayments.data?.summary} isLoading={tutorPayments.isLoading} />
        )}
      </div>
    </AppShell>
  );
}

const EMPTY_TITLE = "No data for this period yet";
const EMPTY_DESC = "This fills in automatically as your classes are scheduled and marked.";

function TutorAttendanceTable({ data, isLoading }: { data?: TutorAttendanceRow[]; isLoading: boolean }) {
  const columns: Column<TutorAttendanceRow>[] = [
    { key: "studentName", header: "Student", render: (r) => `${r.studentName} (${r.studentClass})` },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
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
    { key: "subjects", header: "Subjects", render: (r) => r.subjects || "—" },
    { key: "classesAttended", header: "Classes Attended", render: (r) => r.classesAttended },
    { key: "chaptersCompleted", header: "Chapters Completed", render: (r) => r.chaptersCompleted || "—" },
    { key: "hours", header: "Time Spent (hrs)", render: (r) => r.totalTimeSpentHours },
  ];
  return <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.assignmentId} isLoading={isLoading} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESC} />;
}

function TutorPaymentsTable({ data, summary, isLoading }: { data?: TutorPaymentRow[]; summary?: { totalPayable: number }; isLoading: boolean }) {
  const columns: Column<TutorPaymentRow>[] = [
    { key: "studentName", header: "Student", render: (r) => r.studentName },
    { key: "fixedClasses", header: "Fixed Classes", render: (r) => r.fixedClasses },
    { key: "classesTaken", header: "Classes Taken", render: (r) => r.classesTaken },
    { key: "classesAbsent", header: "Classes Absent", render: (r) => r.classesAbsent },
    { key: "hours", header: "Hours Taught", render: (r) => r.totalHoursTaught },
    { key: "payable", header: "Payable", render: (r) => <strong>₹{r.payableAmount}</strong> },
  ];
  return (
    <>
      {summary && (data?.length ?? 0) > 0 && (
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          Total payable across {data?.length} student{data?.length === 1 ? "" : "s"}: <strong>₹{summary.totalPayable}</strong>
        </p>
      )}
      <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.assignmentId} isLoading={isLoading} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESC} />
    </>
  );
}
