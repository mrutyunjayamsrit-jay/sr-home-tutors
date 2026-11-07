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
export function useAreas(params: { branchId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["master-data", "areas", params.branchId, params.search],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params.branchId) q.set("branchId", params.branchId);
      if (params.search) q.set("search", params.search);
      const s = q.toString();
      return api.get<Area[]>(`/master-data/areas${s ? `?${s}` : ""}`);
    },
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation<Area, ApiError, { branchId: string; name: string; latitude?: number; longitude?: number }>({
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

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/** Looks up an area name's coordinates, restricted to Karnataka — see master-data.service.ts geocodeArea. Resolves to null (not an error) when nothing in Karnataka matches confidently. */
export function useGeocodeArea() {
  return useMutation<GeocodeResult | null, ApiError, string>({
    mutationFn: (name) => api.get<GeocodeResult | null>(`/master-data/areas/geocode?q=${encodeURIComponent(name)}`),
  });
}
