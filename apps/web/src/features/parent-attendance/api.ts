import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ClassSessionRow } from "@/features/attendance/types";

export function useChildSessions(studentId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ["attendance", "sessions", "child", studentId, from, to],
    queryFn: () => api.get<ClassSessionRow[]>(`/attendance/sessions?studentId=${studentId}&from=${from}&to=${to}`),
    enabled: Boolean(studentId),
  });
}
