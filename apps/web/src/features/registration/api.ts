import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { RegisteredParent, RegisteredTutor } from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "REGISTERED" | "ASSIGNED" | "ACTIVE" | "INACTIVE" | "ALL";
}

function qs(params: ListParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useRegisteredTutors(params: ListParams) {
  return useQuery({
    queryKey: ["registration", "tutors", params],
    queryFn: () => api.getWithMeta<RegisteredTutor[]>(`/registration/tutors${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useRegisteredParents(params: ListParams) {
  return useQuery({
    queryKey: ["registration", "parents", params],
    queryFn: () => api.getWithMeta<RegisteredParent[]>(`/registration/parents${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

// pageSize is capped at the backend's max (100, see registration.types.ts)
// — requesting more than that 400s, which previously failed silently
// (TanStack Query just left `data` undefined, rendering as an empty
// "no results" dropdown instead of a visible error). Picker dropdowns
// showing only the first 100 is an acceptable limit for now; a branch
// with more active tutors/parents than that needs a searchable picker
// instead, not a bigger page size — flagged as a future improvement.

/** status=ALL (everyone except INACTIVE) — used by Assign Tutor's pickers, since a tutor or student can take on more than one assignment, not just brand-new registrations. */
export function useAllTutors(search?: string) {
  return useQuery({
    queryKey: ["registration", "tutors", "all", search],
    queryFn: () => api.getWithMeta<RegisteredTutor[]>(`/registration/tutors${qs({ pageSize: 100, search, status: "ALL" })}`),
  });
}

export function useAllParents(search?: string) {
  return useQuery({
    queryKey: ["registration", "parents", "all", search],
    queryFn: () => api.getWithMeta<RegisteredParent[]>(`/registration/parents${qs({ pageSize: 100, search, status: "ALL" })}`),
  });
}
