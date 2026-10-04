import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { OrgSettings, UpdateSettingsInput } from "./types";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<OrgSettings>("/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<OrgSettings, ApiError, UpdateSettingsInput>({
    mutationFn: (input) => api.patch<OrgSettings>("/settings", input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
    },
  });
}
