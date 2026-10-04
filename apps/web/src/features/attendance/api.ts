import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { ClassSessionRow, MarkSessionInput } from "./types";

export function useSessionsForDate(date: string) {
  return useQuery({
    queryKey: ["attendance", "sessions", date],
    queryFn: () => api.get<ClassSessionRow[]>(`/attendance/sessions?date=${date}`),
  });
}

export function useMarkSession() {
  const qc = useQueryClient();
  return useMutation<ClassSessionRow, ApiError, { id: string; input: MarkSessionInput }>({
    mutationFn: ({ id, input }) => api.patch<ClassSessionRow>(`/attendance/sessions/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["assignments", "running"] });
    },
  });
}

function invalidateAfterMark(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["attendance"] });
  qc.invalidateQueries({ queryKey: ["assignments", "running"] });
}

/** Tutor-facing check-in, primary path: the tutor's own GPS, checked against the parent's home. Session stays SCHEDULED — "in progress" until check-out. */
export function useCheckInLocation() {
  const qc = useQueryClient();
  return useMutation<ClassSessionRow, ApiError, { id: string; latitude: number; longitude: number }>({
    mutationFn: ({ id, ...body }) => api.post<ClassSessionRow>(`/attendance/sessions/${id}/check-in-location`, body),
    onSuccess: () => invalidateAfterMark(qc),
  });
}

/** Tutor-facing check-in fallback: manual area entry, text-checked against the parent's address when GPS isn't available. */
export function useCheckInArea() {
  const qc = useQueryClient();
  return useMutation<ClassSessionRow, ApiError, { id: string; area: string; confirmMismatch?: boolean }>({
    mutationFn: ({ id, ...body }) => api.post<ClassSessionRow>(`/attendance/sessions/${id}/check-in-area`, body),
    onSuccess: () => invalidateAfterMark(qc),
  });
}

/** Tutor-facing check-out, primary path — closes the class out and computes the real duration from check-in→check-out. */
export function useCheckOutLocation() {
  const qc = useQueryClient();
  return useMutation<ClassSessionRow, ApiError, { id: string; latitude: number; longitude: number }>({
    mutationFn: ({ id, ...body }) => api.post<ClassSessionRow>(`/attendance/sessions/${id}/check-out-location`, body),
    onSuccess: () => invalidateAfterMark(qc),
  });
}

/** Tutor-facing check-out fallback: same manual-area text-check as check-in. */
export function useCheckOutArea() {
  const qc = useQueryClient();
  return useMutation<ClassSessionRow, ApiError, { id: string; area: string; confirmMismatch?: boolean }>({
    mutationFn: ({ id, ...body }) => api.post<ClassSessionRow>(`/attendance/sessions/${id}/check-out-area`, body),
    onSuccess: () => invalidateAfterMark(qc),
  });
}

export interface ProximityResult {
  withinRange: boolean;
  distanceMeters: number | null;
  reason: "IN_RANGE" | "OUT_OF_RANGE" | "NO_PARENT_LOCATION" | "ALREADY_MARKED";
}

/** Read-only precheck behind the Check In / Check Out buttons' enabled state — see attendance.service.ts checkProximity. Purely location-based, no scheduled-time window. */
export function useProximityCheck(sessionId: string | undefined, coords: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: ["attendance", "proximity", sessionId, coords?.latitude, coords?.longitude],
    queryFn: () => api.get<ProximityResult>(`/attendance/sessions/${sessionId}/proximity?latitude=${coords!.latitude}&longitude=${coords!.longitude}`),
    enabled: Boolean(sessionId) && Boolean(coords),
    staleTime: 60_000,
    retry: false,
  });
}
