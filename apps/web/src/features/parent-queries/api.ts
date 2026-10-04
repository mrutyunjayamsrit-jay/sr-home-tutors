import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { CreateParentQueryInput, ParentQuery, QueryStatus, QueryTarget } from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  status?: QueryStatus;
  target?: QueryTarget;
  /** Super Admin only — a Branch Admin is always scoped server-side to their own branch regardless of this. */
  branchId?: string;
}

function qs(params: ListParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useParentQueries(params: ListParams) {
  return useQuery({
    queryKey: ["parent-queries", params],
    queryFn: () => api.getWithMeta<ParentQuery[]>(`/parent-queries${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateParentQuery() {
  const qc = useQueryClient();
  return useMutation<ParentQuery, ApiError, CreateParentQueryInput>({
    mutationFn: (input) => api.post<ParentQuery>("/parent-queries", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parent-queries"] }),
  });
}

export function useAnswerParentQuery() {
  const qc = useQueryClient();
  return useMutation<ParentQuery, ApiError, { id: string; answer: string }>({
    mutationFn: ({ id, answer }) => api.patch<ParentQuery>(`/parent-queries/${id}/answer`, { answer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent-queries"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
