import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { TestResult } from "./types";

export function useTestResults(assignmentId?: string) {
  return useQuery({
    queryKey: ["tests", assignmentId],
    queryFn: () => api.get<TestResult[]>(`/tests${assignmentId ? `?assignmentId=${assignmentId}` : ""}`),
  });
}

export function useCreateTestResult() {
  const qc = useQueryClient();
  return useMutation<
    TestResult,
    ApiError,
    { assignmentId: string; subject: string; topic: string; totalMarks: number; obtainedMarks: number; testDate: string }
  >({
    mutationFn: (input) => api.post<TestResult>("/tests", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}

export function useDeleteTestResult() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}
