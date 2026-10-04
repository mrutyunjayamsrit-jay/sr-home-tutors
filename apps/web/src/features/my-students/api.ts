import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { Review } from "./types";

export function useReviews(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", assignmentId],
    queryFn: () => api.get<Review[]>(`/reviews?assignmentId=${assignmentId}`),
    enabled: Boolean(assignmentId),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation<Review, ApiError, { assignmentId: string; strengths?: string; weaknesses?: string; overallReview?: string }>({
    mutationFn: (input) => api.post<Review>("/reviews", input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews", variables.assignmentId] });
    },
  });
}
