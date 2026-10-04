import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { TestResult } from "@/features/tests/types";

export function useChildTests(studentId: string | undefined) {
  return useQuery({
    queryKey: ["tests", "child", studentId],
    queryFn: () => api.get<TestResult[]>(`/tests?studentId=${studentId}`),
    enabled: Boolean(studentId),
  });
}
