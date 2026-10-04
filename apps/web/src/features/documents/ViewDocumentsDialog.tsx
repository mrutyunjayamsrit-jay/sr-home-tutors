import { Modal } from "@/components/ui";
import { DocumentsPanel } from "./DocumentsPanel";

export interface DocumentsTarget {
  ownerId: string;
  title: string;
}

/** Opened from a table row's attachment count/link — view, add, or remove files for that one record. */
export function ViewDocumentsDialog({
  target,
  onClose,
  ownerType,
  docType,
  canManage,
}: {
  target: DocumentsTarget | null;
  onClose: () => void;
  ownerType: string;
  docType: string;
  canManage?: boolean;
}) {
  if (!target) return null;
  return (
    <Modal open={Boolean(target)} onClose={onClose} title={target.title}>
      <DocumentsPanel ownerType={ownerType} ownerId={target.ownerId} docType={docType} canManage={canManage} />
    </Modal>
  );
}
