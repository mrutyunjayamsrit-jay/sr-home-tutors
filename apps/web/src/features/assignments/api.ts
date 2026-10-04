import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Assignment, CreateAssignmentInput, RunningClassRow } from "./types";

function qs(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useAssignments(params: { page?: number; pageSize?: number; status?: string; search?: string; studentId?: string }) {
  return useQuery({
    queryKey: ["assignments", params],
    queryFn: () => api.getWithMeta<Assignment[]>(`/assignments${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useRunningClasses(search?: string) {
  return useQuery({
    queryKey: ["assignments", "running", search],
    queryFn: () => api.get<RunningClassRow[]>(`/assignments/running${qs({ search })}`),
    refetchInterval: 60_000,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<Assignment, ApiError, CreateAssignmentInput>({
    mutationFn: (input) => api.post<Assignment>("/assignments", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["registration"] });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const qc = useQueryClient();
  return useMutation<Assignment, ApiError, { id: string; status: "ACTIVE" | "PAUSED" | "ENDED" }>({
    mutationFn: ({ id, status }) => api.patch<Assignment>(`/assignments/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}
