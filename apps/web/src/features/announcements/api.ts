import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Announcement, AnnouncementAudience, AnnouncementCategory } from "./types";

export function useAnnouncements(params: { page?: number; pageSize?: number; category?: AnnouncementCategory } = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  return useQuery({
    queryKey: ["announcements", page, pageSize, params.category],
    queryFn: () =>
      api.getWithMeta<Announcement[]>(
        `/announcements?page=${page}&pageSize=${pageSize}${params.category ? `&category=${params.category}` : ""}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<
    Announcement,
    ApiError,
    { title: string; body: string; audience: AnnouncementAudience; branchId?: string; category?: AnnouncementCategory }
  >({
    mutationFn: (input) => api.post<Announcement>("/announcements", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
