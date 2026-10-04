import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Area, Subject } from "./types";

// ── Subjects — global list, Super Admin maintains ───────────────────────
export function useSubjects() {
  return useQuery({
    queryKey: ["master-data", "subjects"],
    queryFn: () => api.get<Subject[]>("/master-data/subjects"),
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation<Subject, ApiError, { name: string }>({
    mutationFn: (input) => api.post<Subject>("/master-data/subjects", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-data", "subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/master-data/subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-data", "subjects"] }),
  });
}

// ── Areas — per branch, Super Admin maintains ───────────────────────────
export function useAreas(params: { branchId?: string } = {}) {
  return useQuery({
    queryKey: ["master-data", "areas", params.branchId],
    queryFn: () => api.get<Area[]>(`/master-data/areas${params.branchId ? `?branchId=${params.branchId}` : ""}`),
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation<Area, ApiError, { branchId: string; name: string }>({
    mutationFn: (input) => api.post<Area>("/master-data/areas", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-data", "areas"] }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/master-data/areas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-data", "areas"] }),
  });
}
