import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiUpload, apiDownload, ApiError } from "@/lib/apiClient";
import type { DocumentRow } from "./types";

/**
 * Generic attachment API — the same polymorphic Document table already
 * used by Study Materials (see features/materials/api.ts), reused here for
 * fee-payment proofs and expense receipts. `ownerType`/`ownerId` identify
 * what the file is attached to; the backend enforces branch-tenant access
 * per ownerType (see documents.service.ts).
 */
export function useDocuments(ownerType: string, ownerId: string | undefined) {
  return useQuery({
    queryKey: ["documents", ownerType, ownerId],
    queryFn: () => api.get<DocumentRow[]>(`/documents?ownerType=${ownerType}&ownerId=${ownerId}`),
    enabled: Boolean(ownerId),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation<DocumentRow, ApiError, { ownerType: string; ownerId: string; docType: string; file: File }>({
    mutationFn: ({ ownerType, ownerId, docType, file }) => {
      const form = new FormData();
      form.append("ownerType", ownerType);
      form.append("ownerId", ownerId);
      form.append("docType", docType);
      form.append("file", file);
      return apiUpload<DocumentRow>("/documents", form);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["documents", variables.ownerType, variables.ownerId] });
      // The owning record's own list (expenses/invoices) shows an
      // attachment count — refresh those too so it updates without a reload.
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["fees", "invoices"] });
    },
  });
}

export function useDeleteDocument(ownerType: string, ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", ownerType, ownerId] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["fees", "invoices"] });
    },
  });
}

export function downloadDocument(id: string, filename: string) {
  return apiDownload(`/documents/${id}/download`, filename);
}
