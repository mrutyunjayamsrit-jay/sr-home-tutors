import { useRef, useState } from "react";
import { Button, Spinner, toast } from "@/components/ui";
import { useDocuments, useUploadDocument, useDeleteDocument, downloadDocument } from "./api";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsPanelProps {
  ownerType: string;
  ownerId: string;
  /** What kind of file this is, e.g. "RECEIPT" or "PAYMENT_PROOF" — see documents.service.ts. */
  docType: string;
  /** Hidden for read-only viewers (e.g. a role that can see but not attach). Defaults to visible. */
  canManage?: boolean;
}

/**
 * Attach/view/remove files against one record (a fee invoice's payment
 * proof, an expense's receipt, etc.) — built on the same generic Document
 * table Study Materials already uses. Accepts an image or PDF, matching
 * what a transaction screenshot or scanned receipt actually is.
 */
export function DocumentsPanel({ ownerType, ownerId, docType, canManage = true }: DocumentsPanelProps) {
  const docs = useDocuments(ownerType, ownerId);
  const upload = useUploadDocument();
  const remove = useDeleteDocument(ownerType, ownerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await upload.mutateAsync({ ownerType, ownerId, docType, file: selectedFile });
      toast.success("File uploaded");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload file");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success("File removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove file");
    }
  };

  return (
    <div>
      {docs.isLoading && <Spinner size="sm" />}
      {!docs.isLoading && (docs.data ?? []).length === 0 && (
        <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: "0 0 var(--space-3)" }}>No files attached yet.</p>
      )}
      {(docs.data ?? []).map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) 0",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <button
              type="button"
              onClick={() => downloadDocument(d.id, d.originalName)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--color-primary-600)",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                textDecoration: "underline",
                textAlign: "left",
                wordBreak: "break-all",
              }}
            >
              {d.originalName}
            </button>
            <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{formatSize(d.sizeBytes)}</span>
          </div>
          {canManage && (
            <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)} loading={remove.isPending}>
              Remove
            </Button>
          )}
        </div>
      ))}

      {canManage && (
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: "var(--text-sm)" }}
          />
          <Button size="sm" onClick={handleUpload} disabled={!selectedFile} loading={upload.isPending}>
            Upload
          </Button>
        </div>
      )}
    </div>
  );
}
