import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { CreateTaskInput, Task, TaskStatus } from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  branchId?: string;
  status?: TaskStatus;
}

function qs(params: ListParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useTasks(params: ListParams = {}) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => api.getWithMeta<Task[]>(`/tasks${qs(params)}`),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation<Task, ApiError, CreateTaskInput>({
    mutationFn: (input) => api.post<Task>("/tasks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation<Task, ApiError, string>({
    mutationFn: (id) => api.post<Task>(`/tasks/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
