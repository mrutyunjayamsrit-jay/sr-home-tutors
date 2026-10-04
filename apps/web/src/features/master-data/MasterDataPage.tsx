import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { ADMIN_NAV } from "@/app/navConfig";
import { Button, DataTable, Select, TextField, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAreas, useCreateArea, useCreateSubject, useDeleteArea, useDeleteSubject, useSubjects } from "./api";
import { useBranches } from "@/features/branches/api";
import type { Area, Subject } from "./types";
import styles from "@/features/reports/ReportsPage.module.css";

type Tab = "subjects" | "areas";

/**
 * Super Admin-only option lists that feed the tutor/parent enquiry forms'
 * Subjects/Areas pickers (office dialogs and the public website forms
 * alike) — see master-data.service.ts. Subjects are global; Areas are
 * scoped to one branch, since "areas of a particular location" only make
 * sense relative to that branch.
 */
export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>("subjects");
  const [newSubject, setNewSubject] = useState("");
  const [areaBranchId, setAreaBranchId] = useState("");
  const [newAreaBranchId, setNewAreaBranchId] = useState("");
  const [newArea, setNewArea] = useState("");

  const { data: branches } = useBranches({ page: 1, pageSize: 100 });
  const branchOptions = (branches?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const subjects = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const areas = useAreas({ branchId: areaBranchId || undefined });
  const createArea = useCreateArea();
  const deleteArea = useDeleteArea();

  const handleAddSubject = async () => {
    const name = newSubject.trim();
    if (!name) return;
    try {
      await createSubject.mutateAsync({ name });
      setNewSubject("");
      toast.success(`"${name}" added to subjects`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add subject");
    }
  };

  const handleDeleteSubject = async (s: Subject) => {
    try {
      await deleteSubject.mutateAsync(s.id);
      toast.success(`"${s.name}" removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove subject");
    }
  };

  const handleAddArea = async () => {
    const name = newArea.trim();
    if (!name || !newAreaBranchId) return;
    try {
      await createArea.mutateAsync({ branchId: newAreaBranchId, name });
      setNewArea("");
      toast.success(`"${name}" added to areas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add area");
    }
  };

  const handleDeleteArea = async (a: Area) => {
    try {
      await deleteArea.mutateAsync(a.id);
      toast.success(`"${a.name}" removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove area");
    }
  };

  const subjectColumns: Column<Subject>[] = [
    { key: "name", header: "Subject", render: (s) => s.name },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s); }}>
          Remove
        </Button>
      ),
    },
  ];

  const areaColumns: Column<Area>[] = [
    { key: "branch", header: "Branch", render: (a) => a.branch?.name ?? "—" },
    { key: "name", header: "Area", render: (a) => a.name },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteArea(a); }}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <AppShell nav={ADMIN_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Subjects & Areas</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Option lists used across the tutor and parent enquiry forms — subjects apply everywhere; areas are specific
          to one branch's location.
        </p>

        <div className={styles.tabs}>
          <button className={[styles.tab, tab === "subjects" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("subjects")} type="button">
            Subjects
          </button>
          <button className={[styles.tab, tab === "areas" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("areas")} type="button">
            Areas
          </button>
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          {tab === "subjects" ? (
            <>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", maxWidth: 420, marginBottom: "var(--space-4)" }}>
                <TextField
                  label="Add a subject"
                  placeholder="e.g. Mathematics"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                />
                <Button onClick={handleAddSubject} loading={createSubject.isPending} disabled={!newSubject.trim()}>
                  + Add
                </Button>
              </div>
              <DataTable
                columns={subjectColumns}
                rows={subjects.data ?? []}
                rowKey={(s) => s.id}
                isLoading={subjects.isLoading}
                emptyTitle="No subjects yet"
                emptyDescription="Add the subjects tutors can teach and parents can request."
              />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                <div style={{ width: 220 }}>
                  <Select label="Branch" placeholder="Choose a branch" options={branchOptions} value={newAreaBranchId} onChange={(e) => setNewAreaBranchId(e.target.value)} />
                </div>
                <TextField
                  label="Add an area"
                  placeholder="e.g. Koramangala"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddArea();
                    }
                  }}
                />
                <Button onClick={handleAddArea} loading={createArea.isPending} disabled={!newArea.trim() || !newAreaBranchId}>
                  + Add
                </Button>
              </div>

              <div style={{ width: 220, marginBottom: "var(--space-4)" }}>
                <Select label="Filter by branch" placeholder="All branches" options={branchOptions} value={areaBranchId} onChange={(e) => setAreaBranchId(e.target.value)} />
              </div>

              <DataTable
                columns={areaColumns}
                rows={areas.data ?? []}
                rowKey={(a) => a.id}
                isLoading={areas.isLoading}
                emptyTitle="No areas yet"
                emptyDescription="Add the localities a branch serves, so tutors and parents can pick from them."
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
