import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { BRANCH_NAV } from "@/app/navConfig";
import { DataTable, TextField, Select, Badge, Button, Modal } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRegisteredTutors, useRegisteredParents } from "./api";
import { useSubjects } from "@/features/master-data/api";
import type { RegisteredParent, RegisteredTutor } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "tutors" | "parents";
type StatusFilter = "" | "REGISTERED" | "ASSIGNED" | "ACTIVE" | "INACTIVE";

const STATUS_TONE: Record<string, "neutral" | "info" | "success"> = {
  REGISTERED: "neutral",
  ASSIGNED: "info",
  ACTIVE: "success",
};

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
const STATUS_FILTER_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function RegistrationPage() {
  const [tab, setTab] = useState<Tab>("tutors");
  const [search, setSearch] = useState("");
  const [viewTutor, setViewTutor] = useState<RegisteredTutor | null>(null);
  const [viewParent, setViewParent] = useState<RegisteredParent | null>(null);

  // Tutor-tab filters mirror the Registered Tutors table's own columns.
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [education, setEducation] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");

  const subjects = useSubjects();
  const subjectFilterOptions = (subjects.data ?? []).map((s) => ({ value: s.name, label: s.name }));

  // "ALL" (everyone except INACTIVE) is the default view when no specific
  // status is picked — same convention listRegisteredQuerySchema already uses.
  const tutors = useRegisteredTutors({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status: status || "ALL",
    gender: gender || undefined,
    contactNumber: contactNumber || undefined,
    education: education || undefined,
    subject: subject || undefined,
    from: registeredFrom || undefined,
    to: registeredTo || undefined,
  });
  const parents = useRegisteredParents({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status: status || "ALL",
    contactNumber: contactNumber || undefined,
    from: registeredFrom || undefined,
    to: registeredTo || undefined,
  });

  const hasActiveFilters = Boolean(search || gender || contactNumber || education || subject || status || registeredFrom || registeredTo);
  const handleClearFilters = () => {
    setSearch("");
    setGender("");
    setContactNumber("");
    setEducation("");
    setSubject("");
    setStatus("");
    setRegisteredFrom("");
    setRegisteredTo("");
  };

  const tutorColumns: Column<RegisteredTutor>[] = [
    { key: "name", header: "Name", render: (t) => <strong>{t.name}</strong> },
    { key: "gender", header: "Gender", render: (t) => (t.gender ? GENDER_LABEL[t.gender] : "—") },
    { key: "contact", header: "Contact", render: (t) => t.contactNumber },
    { key: "education", header: "Education", render: (t) => t.education },
    { key: "subjects", header: "Subjects", render: (t) => t.subjects.join(", ") || "—" },
    { key: "assignments", header: "Assignments", render: (t) => t._count.assignments },
    { key: "status", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</Badge> },
    { key: "registeredAt", header: "Registered Date", render: (t) => new Date(t.createdAt).toLocaleDateString() },
  ];

  const parentColumns: Column<RegisteredParent>[] = [
    { key: "name", header: "Parent", render: (p) => <strong>{p.name}</strong> },
    { key: "contact", header: "Contact", render: (p) => p.contactNumber },
    {
      key: "students",
      header: "Children",
      render: (p) =>
        p.students
          .map((s) => `${s.name} (${s.studentClass})${s.preferredTutorGender ? ` — prefers ${(GENDER_LABEL[s.preferredTutorGender] ?? s.preferredTutorGender).toLowerCase()} tutor` : ""}`)
          .join(", ") || "—",
    },
    { key: "status", header: "Status", render: (p) => <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge> },
    { key: "registeredAt", header: "Registered Date", render: (p) => new Date(p.createdAt).toLocaleDateString() },
  ];

  return (
    <AppShell nav={BRANCH_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Registration</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Tutors and parents who've accepted, ready to be matched via Assign Tutor.
        </p>

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "tutors" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("tutors")} type="button">
            Registered Tutors
          </button>
          <button className={[styles.tab, tab === "parents" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("parents")} type="button">
            Registered Parents
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
                <TextField label="Education" placeholder="Search education" value={education} onChange={(e) => setEducation(e.target.value)} />
              </div>
              <div style={{ width: 180 }}>
                <Select label="Subjects" placeholder="All" options={subjectFilterOptions} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </>
          )}
          <div style={{ width: 180 }}>
            <TextField label="Contact" placeholder="Search contact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </div>
          <div style={{ width: 160 }}>
            <Select label="Status" placeholder="All (active)" options={STATUS_FILTER_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} />
          </div>
          <div style={{ width: 170 }}>
            <TextField label="Registered from" type="date" value={registeredFrom} onChange={(e) => setRegisteredFrom(e.target.value)} />
          </div>
          <div style={{ width: 170 }}>
            <TextField label="Registered to" type="date" value={registeredTo} onChange={(e) => setRegisteredTo(e.target.value)} />
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
            rowKey={(t) => t.id}
            isLoading={tutors.isLoading}
            emptyTitle="No registered tutors yet"
            emptyDescription="Accept a tutor enquiry to register them here."
            onRowClick={setViewTutor}
          />
        ) : (
          <DataTable
            columns={parentColumns}
            rows={parents.data?.data ?? []}
            rowKey={(p) => p.id}
            isLoading={parents.isLoading}
            emptyTitle="No registered parents yet"
            emptyDescription="Accept a parent enquiry to register them here."
            onRowClick={setViewParent}
          />
        )}
      </div>

      <Modal open={Boolean(viewTutor)} onClose={() => setViewTutor(null)} title={viewTutor?.name ?? ""}>
        {viewTutor && (
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
            <dt style={{ color: "var(--text-secondary)" }}>Gender</dt>
            <dd style={{ margin: 0 }}>{viewTutor.gender ? GENDER_LABEL[viewTutor.gender] : "—"}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Education</dt>
            <dd style={{ margin: 0 }}>{viewTutor.education}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Contact</dt>
            <dd style={{ margin: 0 }}>{viewTutor.contactNumber}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Address</dt>
            <dd style={{ margin: 0 }}>{viewTutor.address}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Subjects</dt>
            <dd style={{ margin: 0 }}>{viewTutor.subjects.join(", ") || "—"}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Areas</dt>
            <dd style={{ margin: 0 }}>{viewTutor.areas.join(", ") || "—"}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Branch</dt>
            <dd style={{ margin: 0 }}>{viewTutor.branch.name}</dd>
            <dt style={{ color: "var(--text-secondary)" }}>Active assignments</dt>
            <dd style={{ margin: 0 }}>{viewTutor._count.assignments}</dd>
          </dl>
        )}
      </Modal>

      <Modal open={Boolean(viewParent)} onClose={() => setViewParent(null)} title={viewParent?.name ?? ""}>
        {viewParent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
              <dt style={{ color: "var(--text-secondary)" }}>Contact</dt>
              <dd style={{ margin: 0 }}>{viewParent.contactNumber}</dd>
              <dt style={{ color: "var(--text-secondary)" }}>Address</dt>
              <dd style={{ margin: 0 }}>{viewParent.address}</dd>
              <dt style={{ color: "var(--text-secondary)" }}>Branch</dt>
              <dd style={{ margin: 0 }}>{viewParent.branch.name}</dd>
            </dl>
            <div>
              <strong style={{ fontSize: "var(--text-sm)" }}>Children</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {viewParent.students.map((s) => (
                  <li key={s.id} style={{ fontSize: "var(--text-sm)" }}>
                    {s.name} — Class {s.studentClass}, {s.board} <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Badge>
                    {s.preferredTutorGender && (
                      <span style={{ color: "var(--text-tertiary)" }}> · prefers {(GENDER_LABEL[s.preferredTutorGender] ?? s.preferredTutorGender).toLowerCase()} tutor</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
