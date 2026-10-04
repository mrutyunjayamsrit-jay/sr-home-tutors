import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { ApiMeta } from "@/lib/apiClient";
import type { Expense } from "./types";

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useExpenses(params: { page?: number; pageSize?: number; branchId?: string }) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => api.getWithMeta<Expense[]>(`/expenses${qs({ page: params.page ?? 1, pageSize: params.pageSize ?? 50, branchId: params.branchId })}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation<Expense, ApiError, { branchId?: string; category: string; description: string; amount: number; expenseDate: string }>({
    mutationFn: (input) => api.post<Expense>("/expenses", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export type { ApiMeta };
