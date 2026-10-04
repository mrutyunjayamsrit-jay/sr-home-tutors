import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { ApiMeta } from "@/lib/apiClient";
import type { Branch, BranchStats, CreateBranchInput, CreateBranchResponse, OrgSummary, UpdateBranchInput } from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

function toQueryString(params: ListParams) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.search) q.set("search", params.search);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * GET /branches is Super Admin only — `enabled` defaults to true (every
 * existing call site is already Super-Admin-scoped) but lets a component
 * reused by other roles (e.g. FeesPage/AccountsPage, also mounted for
 * Branch Admin) skip the call entirely instead of firing a request that's
 * guaranteed to 403.
 */
export function useBranches(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: () => api.getWithMeta<Branch[]>(`/branches${toQueryString(params)}`),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: ["branches", branchId],
    queryFn: () => api.get<Branch>(`/branches/${branchId}`),
    enabled: Boolean(branchId),
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation<CreateBranchResponse, ApiError, CreateBranchInput>({
    mutationFn: (input) => api.post<CreateBranchResponse>("/branches", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

/** Dashboard tile numbers (pending enquiries, registered tutors/students, running classes) for one branch. */
export function useBranchStats(branchId: string | undefined) {
  return useQuery({
    queryKey: ["branches", branchId, "stats"],
    queryFn: () => api.get<BranchStats>(`/branches/${branchId}/stats`),
    enabled: Boolean(branchId),
  });
}

/** Super Admin's org-wide dashboard numbers — overall totals plus a per-branch enquiries-vs-enrolled breakdown. */
export function useOrgSummary() {
  return useQuery({
    queryKey: ["branches", "org-summary"],
    queryFn: () => api.get<OrgSummary>("/branches/org-summary"),
  });
}

export function useUpdateBranch(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation<Branch, ApiError, UpdateBranchInput>({
    mutationFn: (input) => api.patch<Branch>(`/branches/${branchId}`, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.setQueryData(["branches", branchId], updated);
    },
  });
}

/** Sets a new password directly on this branch's office login — Super Admin only. See branch.service.ts setPassword. */
export function useSetBranchPassword(branchId: string) {
  return useMutation<void, ApiError, { password: string }>({
    mutationFn: (input) => api.post<void>(`/branches/${branchId}/password`, input),
  });
}

export type { ApiMeta };
