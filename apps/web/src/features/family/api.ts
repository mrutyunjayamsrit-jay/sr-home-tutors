import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Child, ChildDetail, MyLocation } from "./types";

export function useChildren() {
  return useQuery({
    queryKey: ["family", "children"],
    queryFn: () => api.get<Child[]>("/family/children"),
  });
}

export function useChild(studentId: string | undefined) {
  return useQuery({
    queryKey: ["family", "children", studentId],
    queryFn: () => api.get<ChildDetail>(`/family/children/${studentId}`),
    enabled: Boolean(studentId),
  });
}

export function useMyLocation() {
  return useQuery({
    queryKey: ["family", "location"],
    queryFn: () => api.get<MyLocation>("/family/location"),
  });
}

export function useUpdateMyLocation() {
  const qc = useQueryClient();
  return useMutation<MyLocation, ApiError, { latitude: number; longitude: number }>({
    mutationFn: (input) => api.put<MyLocation>("/family/location", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", "location"] }),
  });
}
