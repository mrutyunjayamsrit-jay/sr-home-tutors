import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Spinner, Alert, StatCard, DataTable, Badge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useBranch, useBranchStats } from "./api";
import { BranchEditForm } from "./BranchEditForm";
import { useTutorEnquiries, useParentEnquiries } from "@/features/enquiries/api";
import type { ParentEnquiry, TutorEnquiry } from "@/features/enquiries/types";
import reportsTabStyles from "@/features/reports/ReportsPage.module.css";

const GENDER_LABEL: Record<string, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

type EnquiryTab = "tutors" | "parents";

export function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branch, isLoading, isError, error } = useBranch(branchId);
  const { data: stats, isLoading: statsLoading } = useBranchStats(branchId);
  const [enquiryTab, setEnquiryTab] = useState<EnquiryTab>("tutors");

  const tutorEnquiries = useTutorEnquiries({ page: 1, pageSize: 50, branchId });
  const parentEnquiries = useParentEnquiries({ page: 1, pageSize: 50, branchId });

  const tutorColumns: Column<TutorEnquiry>[] = [
    { key: "name", header: "Name", render: (e) => <strong>{e.name}</strong> },
    { key: "gender", header: "Gender", render: (e) => (e.gender ? GENDER_LABEL[e.gender] : "—") },
    { key: "contact", header: "Contact", render: (e) => e.contactNumber },
    { key: "education", header: "Education", render: (e) => e.education },
    { key: "subjects", header: "Subjects", render: (e) => e.subjectsInterested.join(", ") || "—" },
    {
      key: "status",
      header: "Status",
      render: (e) => (e.tutor ? <Badge tone="success">Registered</Badge> : <Badge tone={e.status === "REJECTED" ? "danger" : "neutral"}>{e.status.replace("_", " ")}</Badge>),
    },
  ];

  const parentColumns: Column<ParentEnquiry>[] = [
    { key: "studentName", header: "Student", render: (e) => <strong>{e.studentName}</strong> },
    { key: "contact", header: "Contact", render: (e) => e.contactNumber },
    { key: "class", header: "Class / Board", render: (e) => `${e.studentClass} · ${e.board}` },
    { key: "preferredGender", header: "Prefers", render: (e) => (e.preferredTutorGender ? `${GENDER_LABEL[e.preferredTutorGender]} tutor` : "No preference") },
    { key: "subjects", header: "Subjects", render: (e) => e.subjectsRequired.join(", ") || "—" },
    { key: "area", header: "Area", render: (e) => e.area ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (e) => (e.parent ? <Badge tone="success">Registered</Badge> : <Badge tone={e.status === "REJECTED" ? "danger" : "neutral"}>{e.status.replace("_", " ")}</Badge>),
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <Link to="/admin/branches" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary-600)" }}>
          ← Back to branches
        </Link>
        <div style={{ marginTop: "var(--space-4)" }}>
          {isLoading && <Spinner size="lg" />}
          {isError && <Alert variant="danger">{error instanceof Error ? error.message : "Could not load branch"}</Alert>}
          {branch && <BranchEditForm branch={branch} canToggleActive />}
        </div>

        {branch && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
                margin: "var(--space-6) 0",
              }}
            >
              <StatCard
                label="Pending enquiries"
                value={stats?.pendingEnquiries ?? 0}
                loading={statsLoading}
                hint={stats ? `${stats.pendingTutorEnquiries} tutor · ${stats.pendingParentEnquiries} parent` : undefined}
              />
              <StatCard label="Registered tutors" value={stats?.registeredTutors ?? 0} loading={statsLoading} />
              <StatCard label="Registered students" value={stats?.registeredStudents ?? 0} loading={statsLoading} />
              <StatCard label="Running classes" value={stats?.runningClasses ?? 0} loading={statsLoading} />
            </div>

            <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-3)" }}>Enquiries</h2>
            <div className={reportsTabStyles.tabs}>
              <button
                type="button"
                className={[reportsTabStyles.tab, enquiryTab === "tutors" ? reportsTabStyles.tabActive : ""].join(" ")}
                onClick={() => setEnquiryTab("tutors")}
              >
                Tutor Enquiries
              </button>
              <button
                type="button"
                className={[reportsTabStyles.tab, enquiryTab === "parents" ? reportsTabStyles.tabActive : ""].join(" ")}
                onClick={() => setEnquiryTab("parents")}
              >
                Parent Enquiries
              </button>
            </div>

            <div style={{ margin: "var(--space-4) 0 var(--space-8)" }}>
              {enquiryTab === "tutors" ? (
                <DataTable
                  columns={tutorColumns}
                  rows={tutorEnquiries.data?.data ?? []}
                  rowKey={(e) => e.id}
                  isLoading={tutorEnquiries.isLoading}
                  emptyTitle="No tutor enquiries for this branch yet"
                />
              ) : (
                <DataTable
                  columns={parentColumns}
                  rows={parentEnquiries.data?.data ?? []}
                  rowKey={(e) => e.id}
                  isLoading={parentEnquiries.isLoading}
                  emptyTitle="No parent enquiries for this branch yet"
                />
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
