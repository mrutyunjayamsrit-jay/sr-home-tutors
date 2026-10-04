import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Notification } from "./types";

/**
 * Notifications are lazily materialized server-side on every list/count
 * call (see notifications.service.ts) — polling here is what actually
 * drives detection of a missed attendance day, not just display.
 */
const POLL_INTERVAL_MS = 60_000;

export function useNotifications(params: { page?: number; pageSize?: number } = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  return useQuery({
    queryKey: ["notifications", "list", page, pageSize],
    queryFn: () => api.getWithMeta<Notification[]>(`/notifications?page=${page}&pageSize=${pageSize}`),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
