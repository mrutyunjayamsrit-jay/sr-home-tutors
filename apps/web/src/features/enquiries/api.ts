import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type {
  ConvertCredentials,
  CreateParentEnquiryInput,
  CreateTutorEnquiryInput,
  EnquiryStatus,
  ParentEnquiry,
  TutorEnquiry,
} from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EnquiryStatus;
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

// ── Tutor enquiries ────────────────────────────────────────────────────
export function useTutorEnquiries(params: ListParams) {
  return useQuery({
    queryKey: ["enquiries", "tutors", params],
    queryFn: () => api.getWithMeta<TutorEnquiry[]>(`/enquiries/tutors${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateTutorEnquiry() {
  const qc = useQueryClient();
  return useMutation<TutorEnquiry, ApiError, CreateTutorEnquiryInput>({
    mutationFn: (input) => api.post<TutorEnquiry>("/enquiries/tutors", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries", "tutors"] }),
  });
}

export function useUpdateTutorEnquiryStatus() {
  const qc = useQueryClient();
  return useMutation<TutorEnquiry, ApiError, { id: string; status: EnquiryStatus }>({
    mutationFn: ({ id, status }) => api.patch<TutorEnquiry>(`/enquiries/tutors/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries", "tutors"] }),
  });
}

export interface ConvertEnquiryMutationInput {
  id: string;
  email?: string;
  password?: string;
  /** Parent conversion only — ignored by the tutor conversion endpoint. */
  feesPrescribed?: number;
  agreedFinalFees?: number;
}

export function useConvertTutorEnquiry() {
  const qc = useQueryClient();
  return useMutation<{ credentials: ConvertCredentials }, ApiError, ConvertEnquiryMutationInput>({
    mutationFn: ({ id, ...body }) => api.post(`/enquiries/tutors/${id}/convert`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquiries", "tutors"] });
      qc.invalidateQueries({ queryKey: ["registration"] });
    },
  });
}

// ── Parent enquiries ───────────────────────────────────────────────────
export function useParentEnquiries(params: ListParams) {
  return useQuery({
    queryKey: ["enquiries", "parents", params],
    queryFn: () => api.getWithMeta<ParentEnquiry[]>(`/enquiries/parents${qs(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateParentEnquiry() {
  const qc = useQueryClient();
  return useMutation<ParentEnquiry, ApiError, CreateParentEnquiryInput>({
    mutationFn: (input) => api.post<ParentEnquiry>("/enquiries/parents", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries", "parents"] }),
  });
}

export function useUpdateParentEnquiryStatus() {
  const qc = useQueryClient();
  return useMutation<ParentEnquiry, ApiError, { id: string; status: EnquiryStatus }>({
    mutationFn: ({ id, status }) => api.patch<ParentEnquiry>(`/enquiries/parents/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries", "parents"] }),
  });
}

export function useConvertParentEnquiry() {
  const qc = useQueryClient();
  return useMutation<{ credentials: ConvertCredentials }, ApiError, ConvertEnquiryMutationInput>({
    mutationFn: ({ id, ...body }) => api.post(`/enquiries/parents/${id}/convert`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquiries", "parents"] });
      qc.invalidateQueries({ queryKey: ["registration"] });
    },
  });
}
