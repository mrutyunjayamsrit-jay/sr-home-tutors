import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { FeeRateCard, StudentFeeInvoice } from "./types";

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useRateCards(params: { branchId?: string; board?: string; classCategory?: string; billingCycle?: string } = {}) {
  return useQuery({
    queryKey: ["fees", "rate-cards", params],
    queryFn: () => api.get<FeeRateCard[]>(`/fees/rate-cards${qs(params)}`),
  });
}

export type CreateRateCardInput =
  | { branchId?: string; board: string; classCategory: string; billingCycle: "MONTHLY"; numberOfSubjects: number; ratePerClass: number }
  | { branchId?: string; board: string; classCategory: string; billingCycle: "PACKAGE"; numberOfSubjects: number; totalClasses: number; totalAmount: number };

export function useCreateRateCard() {
  const qc = useQueryClient();
  return useMutation<FeeRateCard, ApiError, CreateRateCardInput>({
    mutationFn: (input) => api.post<FeeRateCard>("/fees/rate-cards", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", "rate-cards"] }),
  });
}

export function useDeleteRateCard() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/fees/rate-cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", "rate-cards"] }),
  });
}

export function useInvoices(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  studentId?: string;
  branchId?: string;
  period?: string;
  paymentMethod?: string;
  paidFrom?: string;
  paidTo?: string;
}) {
  return useQuery({
    queryKey: ["fees", "invoices", params],
    queryFn: () => api.getWithMeta<StudentFeeInvoice[]>(`/fees/invoices${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation<StudentFeeInvoice, ApiError, { studentId: string; period: string; fixedClasses: number; fixedFees: number; dueDate: string }>({
    mutationFn: (input) => api.post<StudentFeeInvoice>("/fees/invoices", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", "invoices"] }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation<StudentFeeInvoice, ApiError, { id: string; amount: number; paymentMethod: string }>({
    mutationFn: ({ id, ...body }) => api.post<StudentFeeInvoice>(`/fees/invoices/${id}/payment`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", "invoices"] }),
  });
}

/** Super Admin's own sign-off on a payment the branch office already recorded — see fees.service.ts approveInvoice. */
export function useApproveInvoice() {
  const qc = useQueryClient();
  return useMutation<StudentFeeInvoice, ApiError, string>({
    mutationFn: (id) => api.post<StudentFeeInvoice>(`/fees/invoices/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", "invoices"] }),
  });
}
