import { useState } from "react";
import { AppShell } from "@/app/AppShell";
import { TUTOR_NAV } from "@/app/navConfig";
import { Button, Card, Select, TextField, DataTable, toast } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useAssignments } from "@/features/assignments/api";
import { useMaterials, useUploadMaterial, useDeleteMaterial, downloadMaterial } from "./api";
import type { MaterialDocument } from "./types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialsPage() {
  const { data: assignmentsData } = useAssignments({ page: 1, pageSize: 100 });
  const studentOptions = Array.from(
    new Map((assignmentsData?.data ?? []).map((a) => [a.student.id, `${a.student.name} (Class ${a.student.studentClass})`])).entries(),
  ).map(([value, label]) => ({ value, label }));

  const [studentId, setStudentId] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const materials = useMaterials(studentId || undefined);
  const uploadMaterial = useUploadMaterial();
  const deleteMaterial = useDeleteMaterial(studentId || undefined);

  const handleUpload = async () => {
    if (!studentId || !file) {
      toast.error("Choose a student and a file first");
      return;
    }
    try {
      await uploadMaterial.mutateAsync({ studentId, docType: docType || "Study Material", file });
      toast.success("Material shared");
      setDocType("");
      setFile(null);
      const input = document.getElementById("material-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload file");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMaterial.mutateAsync(id);
      toast.success("Material removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove file");
    }
  };

  const columns: Column<MaterialDocument>[] = [
    { key: "name", header: "File", render: (d) => d.originalName },
    { key: "docType", header: "Description", render: (d) => d.docType },
    { key: "size", header: "Size", render: (d) => formatSize(d.sizeBytes) },
    { key: "date", header: "Shared", render: (d) => new Date(d.createdAt).toLocaleDateString() },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); downloadMaterial(d.id, d.originalName); }}>
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell nav={TUTOR_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Study Materials</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Share notes, worksheets, and slides with your students.
        </p>

        <Card style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-3)", maxWidth: 480 }}>
            <Select
              label="Student"
              placeholder={studentOptions.length ? "Choose a student" : "No students assigned yet"}
              options={studentOptions}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            <TextField
              label="Description"
              placeholder="e.g. Chapter 4 worksheet"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            />
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>File</span>
              <input id="material-file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button onClick={handleUpload} loading={uploadMaterial.isPending} disabled={!studentId} style={{ alignSelf: "flex-start" }}>
              Share with student
            </Button>
          </div>
        </Card>

        {studentId ? (
          <DataTable
            columns={columns}
            rows={materials.data ?? []}
            rowKey={(d) => d.id}
            isLoading={materials.isLoading}
            emptyTitle="No materials shared yet"
            emptyDescription="Upload a file above to share it with this student."
          />
        ) : (
          <p style={{ color: "var(--text-tertiary)" }}>Choose a student to see what's already been shared with them.</p>
        )}
      </div>
    </AppShell>
  );
}
