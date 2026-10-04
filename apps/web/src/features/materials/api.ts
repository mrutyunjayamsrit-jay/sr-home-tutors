import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiUpload, apiDownload, ApiError } from "@/lib/apiClient";
import type { MaterialDocument } from "./types";

export function useMaterials(studentId: string | undefined) {
  return useQuery({
    queryKey: ["documents", "STUDENT", studentId],
    queryFn: () => api.get<MaterialDocument[]>(`/documents?ownerType=STUDENT&ownerId=${studentId}`),
    enabled: Boolean(studentId),
  });
}

export function useUploadMaterial() {
  const qc = useQueryClient();
  return useMutation<MaterialDocument, ApiError, { studentId: string; docType: string; file: File }>({
    mutationFn: ({ studentId, docType, file }) => {
      const form = new FormData();
      form.append("ownerType", "STUDENT");
      form.append("ownerId", studentId);
      form.append("docType", docType);
      form.append("file", file);
      return apiUpload<MaterialDocument>("/documents", form);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["documents", "STUDENT", variables.studentId] });
    },
  });
}

export function useDeleteMaterial(studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", "STUDENT", studentId] }),
  });
}

export function downloadMaterial(id: string, filename: string) {
  return apiDownload(`/documents/${id}/download`, filename);
}
