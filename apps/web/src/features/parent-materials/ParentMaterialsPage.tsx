import { AppShell } from "@/app/AppShell";
import { PARENT_NAV } from "@/app/navConfig";
import { Button, DataTable, Spinner, EmptyState } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useSelectedChild } from "@/features/family/useSelectedChild";
import { ChildSwitcher } from "@/features/family/ChildSwitcher";
import { useMaterials, downloadMaterial } from "@/features/materials/api";
import type { MaterialDocument } from "@/features/materials/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ParentMaterialsPage() {
  const { children, selectedChildId, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const materials = useMaterials(selectedChildId);

  const columns: Column<MaterialDocument>[] = [
    { key: "name", header: "File", render: (d) => d.originalName },
    { key: "docType", header: "Description", render: (d) => d.docType },
    { key: "size", header: "Size", render: (d) => formatSize(d.sizeBytes) },
    { key: "date", header: "Shared", render: (d) => new Date(d.createdAt).toLocaleDateString() },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); downloadMaterial(d.id, d.originalName); }}>
          Download
        </Button>
      ),
    },
  ];

  if (childrenLoading) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (children.length === 0) {
    return (
      <AppShell nav={PARENT_NAV}>
        <div className="page-inner">
          <EmptyState title="No children on file yet" description="Study materials shared by tutors will appear here." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={PARENT_NAV}>
      <div className="page-inner">
        <h1 style={{ margin: 0 }}>Study Materials</h1>
        <p style={{ margin: "4px 0 var(--space-4)", color: "var(--text-secondary)" }}>
          Notes, worksheets, and slides your tutor has shared.
        </p>

        <ChildSwitcher children={children} selectedChildId={selectedChildId} onSelect={selectChild} />

        <DataTable
          columns={columns}
          rows={materials.data ?? []}
          rowKey={(d) => d.id}
          isLoading={materials.isLoading}
          emptyTitle="No materials shared yet"
          emptyDescription="Your child's tutor will share notes and worksheets here."
        />
      </div>
    </AppShell>
  );
}
