import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { BranchOverviewRow, StaffAttendanceRecord } from "./types";

export interface CheckTimeInput {
  /** A full ISO instant, constructed client-side from the browser's own local time — never a bare "HH:mm" (see staff-attendance.types.ts on the API side for why that was a real bug). */
  at: string;
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ["staff-attendance", "today"],
    queryFn: () => api.get<StaffAttendanceRecord | null>("/staff-attendance/today"),
  });
}

export function useMyAttendanceHistory() {
  return useQuery({
    queryKey: ["staff-attendance", "mine"],
    queryFn: () => api.get<StaffAttendanceRecord[]>("/staff-attendance/mine"),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation<StaffAttendanceRecord, ApiError, CheckTimeInput>({
    mutationFn: (input) => api.post<StaffAttendanceRecord>("/staff-attendance/check-in", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-attendance"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation<StaffAttendanceRecord, ApiError, CheckTimeInput>({
    mutationFn: (input) => api.post<StaffAttendanceRecord>("/staff-attendance/check-out", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-attendance"] }),
  });
}

/** Super Admin oversight of every branch's check-in status for one date (defaults to today). */
export function useBranchAttendanceOverview(date?: string) {
  return useQuery({
    queryKey: ["staff-attendance", "overview", date ?? "today"],
    queryFn: () => api.get<BranchOverviewRow[]>(`/staff-attendance/overview${date ? `?date=${date}` : ""}`),
  });
}
