import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { PublicBranch, PublicContact, PublicOption, PublicParentEnquiryInput, PublicTutorEnquiryInput } from "./types";

export function usePublicBranches() {
  return useQuery({
    queryKey: ["public", "branches"],
    queryFn: () => api.get<PublicBranch[]>("/public/branches"),
    staleTime: 5 * 60 * 1000,
  });
}

/** Subjects Super Admin has added — global, so the same list regardless of which branch is chosen. */
export function usePublicSubjects() {
  return useQuery({
    queryKey: ["public", "subjects"],
    queryFn: () => api.get<PublicOption[]>("/public/subjects"),
    staleTime: 5 * 60 * 1000,
  });
}

/** Areas Super Admin has added for one branch — only fetched once a branch is chosen. */
export function usePublicAreas(branchId: string | undefined) {
  return useQuery({
    queryKey: ["public", "areas", branchId],
    queryFn: () => api.get<PublicOption[]>(`/public/areas?branchId=${branchId}`),
    enabled: Boolean(branchId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicContact() {
  return useQuery({
    queryKey: ["public", "contact"],
    queryFn: () => api.get<PublicContact>("/public/contact"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitTutorEnquiry() {
  return useMutation<{ id: string }, ApiError, PublicTutorEnquiryInput>({
    mutationFn: (input) => api.post<{ id: string }>("/public/enquiries/tutor", input),
  });
}

export function useSubmitParentEnquiry() {
  return useMutation<{ id: string }, ApiError, PublicParentEnquiryInput>({
    mutationFn: (input) => api.post<{ id: string }>("/public/enquiries/parent", input),
  });
}
