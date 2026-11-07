import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { TutorRating } from "./types";

/** The rating for one assignment — null if nobody's rated it yet. Office roles can read any in their scope; a parent only their own child's. */
export function useRating(assignmentId: string, enabled = true) {
  return useQuery({
    queryKey: ["ratings", assignmentId],
    queryFn: () => api.get<TutorRating | null>(`/ratings/assignments/${assignmentId}`),
    enabled: enabled && Boolean(assignmentId),
  });
}

/** Parent-only — rates (or revises the rating for) the tutor on one assignment, based on the child's actual progress. */
export function useRateTutor() {
  const qc = useQueryClient();
  return useMutation<TutorRating, ApiError, { assignmentId: string; rating: number; comment?: string }>({
    mutationFn: ({ assignmentId, ...body }) => api.post<TutorRating>(`/ratings/assignments/${assignmentId}`, body),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["ratings", variables.assignmentId] }),
  });
}
