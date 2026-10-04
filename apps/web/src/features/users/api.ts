import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Role } from "@/features/auth/types";
import type { CreateUserInput, CreateUserResponse, ParentOption, UserListItem } from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role;
  branchId?: string;
}

function toQueryString(params: ListParams | { branchId?: string }) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useUsers(params: ListParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => api.getWithMeta<UserListItem[]>(`/users${toQueryString(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useParentOptions(branchId?: string) {
  return useQuery({
    queryKey: ["users", "parents", branchId],
    queryFn: () => api.get<ParentOption[]>(`/users/parents${toQueryString({ branchId })}`),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, CreateUserInput>({
    mutationFn: (input) => api.post<CreateUserResponse>("/users", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** Soft — disables the login, reversible via useEnableUser below. */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (userId) => api.delete<void>(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** Re-activates a previously disabled login. */
export function useEnableUser() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (userId) => api.post<void>(`/users/${userId}/enable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** True, irreversible delete — only reachable once the login is already disabled (see users.service.ts hardDelete). */
export function usePermanentlyDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (userId) => api.delete<void>(`/users/${userId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
