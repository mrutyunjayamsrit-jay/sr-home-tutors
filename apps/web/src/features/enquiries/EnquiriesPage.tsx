import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { Button, DataTable, TextField, Select, Badge, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  useTutorEnquiries,
  useParentEnquiries,
  useUpdateTutorEnquiryStatus,
  useUpdateParentEnquiryStatus,
  useConvertTutorEnquiry,
  useConvertParentEnquiry,
} from "./api";
import { useSubjects } from "@/features/master-data/api";
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

const GENDER_FILTER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];
const SOURCE_FILTER_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "STAFF", label: "Staff" },
];
const STATUS_FILTER_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

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

  // Tutor-tab filters — mirror the Tutor Enquiries table's own columns.
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [education, setEducation] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState<"" | "WEBSITE" | "STAFF">("");
  const [status, setStatus] = useState<"" | EnquiryStatus>("");
  const [enquiryFrom, setEnquiryFrom] = useState("");
  const [enquiryTo, setEnquiryTo] = useState("");

  const subjects = useSubjects();
  const subjectFilterOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));

  const hasActiveFilters = Boolean(search || gender || contactNumber || education || subject || source || status || enquiryFrom || enquiryTo);
  const handleClearFilters = () => {
    setSearch("");
    setGender("");
    setContactNumber("");
    setEducation("");
    setSubject("");
    setSource("");
    setStatus("");
    setEnquiryFrom("");
    setEnquiryTo("");
  };

  const tutors = useTutorEnquiries({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    gender: gender || undefined,
    contactNumber: contactNumber || undefined,
    education: education || undefined,
    subject: subject || undefined,
    source: source || undefined,
    status: status || undefined,
    from: enquiryFrom || undefined,
    to: enquiryTo || undefined,
  });
  const parents = useParentEnquiries({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    from: enquiryFrom || undefined,
    to: enquiryTo || undefined,
  });
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
    { key: "enquiryDate", header: "Enquiry Date", render: (e) => new Date(e.enquiryDate).toLocaleDateString() },
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
    { key: "enquiryDate", header: "Enquiry Date", render: (e) => new Date(e.enquiryDate).toLocaleDateString() },
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

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          {tab === "tutors" && (
            <>
              <div style={{ width: 160 }}>
                <Select label="Gender" placeholder="All" options={GENDER_FILTER_OPTIONS} value={gender} onChange={(e) => setGender(e.target.value)} />
              </div>
              <div style={{ width: 180 }}>
                <TextField label="Contact" placeholder="Search contact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
              </div>
              <div style={{ width: 180 }}>
                <TextField label="Education" placeholder="Search education" value={education} onChange={(e) => setEducation(e.target.value)} />
              </div>
              <div style={{ width: 180 }}>
                <Select label="Subjects" placeholder="All" options={subjectFilterOptions} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div style={{ width: 160 }}>
                <Select label="Source" placeholder="All" options={SOURCE_FILTER_OPTIONS} value={source} onChange={(e) => setSource(e.target.value as "" | "WEBSITE" | "STAFF")} />
              </div>
              <div style={{ width: 160 }}>
                <Select
                  label="Status"
                  placeholder="All"
                  options={STATUS_FILTER_OPTIONS}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "" | EnquiryStatus)}
                />
              </div>
            </>
          )}
          <div style={{ width: 170 }}>
            <TextField label="Enquiry date from" type="date" value={enquiryFrom} onChange={(e) => setEnquiryFrom(e.target.value)} />
          </div>
          <div style={{ width: 170 }}>
            <TextField label="Enquiry date to" type="date" value={enquiryTo} onChange={(e) => setEnquiryTo(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button variant="ghost" onClick={handleClearFilters} disabled={!hasActiveFilters}>
              Clear all filters
            </Button>
          </div>
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
