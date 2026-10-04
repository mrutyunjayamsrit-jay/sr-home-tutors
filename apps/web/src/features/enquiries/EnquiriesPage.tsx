import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, TextField, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  useTutorEnquiries,
  useParentEnquiries,
  useUpdateTutorEnquiryStatus,
  useUpdateParentEnquiryStatus,
  useConvertTutorEnquiry,
  useConvertParentEnquiry,
} from "./api";
import { CreateTutorEnquiryDialog } from "./CreateTutorEnquiryDialog";
import { CreateParentEnquiryDialog } from "./CreateParentEnquiryDialog";
import { ConvertEnquiryDialog } from "./ConvertEnquiryDialog";
import type { EnquiryStatus, ParentEnquiry, TutorEnquiry } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "tutors" | "parents";

const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export function EnquiriesPage() {
  const [tab, setTab] = useState<Tab>("tutors");
  const [search, setSearch] = useState("");
  const [createTutorOpen, setCreateTutorOpen] = useState(false);
  const [createParentOpen, setCreateParentOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<{
    id: string;
    name: string;
    role: "tutor" | "parent";
    studentClass?: string;
    board?: string;
    feesPrescribed?: number | null;
    agreedFinalFees?: number | null;
  } | null>(null);

  const tutors = useTutorEnquiries({ page: 1, pageSize: 50, search: search || undefined });
  const parents = useParentEnquiries({ page: 1, pageSize: 50, search: search || undefined });
  const updateTutorStatus = useUpdateTutorEnquiryStatus();
  const updateParentStatus = useUpdateParentEnquiryStatus();
  const convertTutor = useConvertTutorEnquiry();
  const convertParent = useConvertParentEnquiry();

  const handleStatusChange = async (kind: Tab, id: string, status: EnquiryStatus) => {
    try {
      if (kind === "tutors") await updateTutorStatus.mutateAsync({ id, status });
      else await updateParentStatus.mutateAsync({ id, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    }
  };

  const tutorColumns: Column<TutorEnquiry>[] = [
    { key: "name", header: "Name", render: (e) => <strong>{e.name}</strong> },
    { key: "gender", header: "Gender", render: (e) => (e.gender ? GENDER_LABEL[e.gender] : "—") },
    { key: "contact", header: "Contact", render: (e) => e.contactNumber },
    { key: "education", header: "Education", render: (e) => e.education },
    { key: "subjects", header: "Subjects", render: (e) => e.subjectsInterested.join(", ") || "—" },
    {
      key: "source",
      header: "Source",
      render: (e) => (e.createdById === "PUBLIC_WEBSITE" ? <Badge tone="info">Website</Badge> : <span style={{ color: "var(--text-tertiary)" }}>Staff</span>),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <select
          value={e.status}
          onClick={(ev) => ev.stopPropagation()}
          onChange={(ev) => handleStatusChange("tutors", e.id, ev.target.value as EnquiryStatus)}
          style={{ fontSize: "var(--text-xs)", padding: "2px 4px" }}
        >
          <option value="NEW">New</option>
          <option value="IN_REVIEW">In review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) =>
        e.tutor ? (
          <Badge tone="success">Registered</Badge>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={(ev) => {
              ev.stopPropagation();
              setConvertTarget({ id: e.id, name: e.name, role: "tutor" });
            }}
          >
            Register
          </Button>
        ),
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
      key: "source",
      header: "Source",
      render: (e) => (e.createdById === "PUBLIC_WEBSITE" ? <Badge tone="info">Website</Badge> : <span style={{ color: "var(--text-tertiary)" }}>Staff</span>),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <select
          value={e.status}
          onClick={(ev) => ev.stopPropagation()}
          onChange={(ev) => handleStatusChange("parents", e.id, ev.target.value as EnquiryStatus)}
          style={{ fontSize: "var(--text-xs)", padding: "2px 4px" }}
        >
          <option value="NEW">New</option>
          <option value="IN_REVIEW">In review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) =>
        e.parent ? (
          <Badge tone="success">Registered</Badge>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={(ev) => {
              ev.stopPropagation();
              setConvertTarget({
                id: e.id,
                name: e.studentName,
                role: "parent",
                studentClass: e.studentClass,
                board: e.board,
                feesPrescribed: e.feesPrescribed,
                agreedFinalFees: e.agreedFinalFees,
              });
            }}
          >
            Register
          </Button>
        ),
    },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h1 style={{ margin: 0 }}>Enquiries</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>Tutor and parent leads, before they're registered.</p>
          </div>
          <Button onClick={() => (tab === "tutors" ? setCreateTutorOpen(true) : setCreateParentOpen(true))}>
            + New {tab === "tutors" ? "tutor" : "parent"} enquiry
          </Button>
        </div>

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "tutors" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("tutors")} type="button">
            Tutor Enquiries
          </button>
          <button className={[styles.tab, tab === "parents" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("parents")} type="button">
            Parent Enquiries
          </button>
        </div>

        <div style={{ margin: "var(--space-4) 0", maxWidth: 320 }}>
          <TextField label="Search" placeholder="Search by name or contact" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {tab === "tutors" ? (
          <DataTable
            columns={tutorColumns}
            rows={tutors.data?.data ?? []}
            rowKey={(e) => e.id}
            isLoading={tutors.isLoading}
            emptyTitle="No tutor enquiries yet"
            emptyDescription="New enquiries from prospective tutors will show up here."
          />
        ) : (
          <DataTable
            columns={parentColumns}
            rows={parents.data?.data ?? []}
            rowKey={(e) => e.id}
            isLoading={parents.isLoading}
            emptyTitle="No parent enquiries yet"
            emptyDescription="New enquiries from parents looking for a tutor will show up here."
          />
        )}
      </div>

      <CreateTutorEnquiryDialog open={createTutorOpen} onClose={() => setCreateTutorOpen(false)} />
      <CreateParentEnquiryDialog open={createParentOpen} onClose={() => setCreateParentOpen(false)} />
      <ConvertEnquiryDialog
        open={Boolean(convertTarget)}
        onClose={() => setConvertTarget(null)}
        enquiryId={convertTarget?.id ?? null}
        displayName={convertTarget?.name ?? ""}
        roleLabel={convertTarget?.role ?? "tutor"}
        mutation={convertTarget?.role === "parent" ? convertParent : convertTutor}
        studentClass={convertTarget?.studentClass}
        board={convertTarget?.board}
        initialFeesPrescribed={convertTarget?.feesPrescribed}
        initialAgreedFinalFees={convertTarget?.agreedFinalFees}
      />
    </AppShell>
  );
}
