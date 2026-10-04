import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, ok } from "@/common/utils/apiResponse";
import { reviewsService } from "./reviews.service";
import { createReviewSchema, listReviewsQuerySchema } from "./reviews.types";

export const reviewsController = {
  list: asyncHandler(async (req, res) => {
    const query = listReviewsQuerySchema.parse(req.query);
    const rows = await reviewsService.list(query.assignmentId, req.user!);
    ok(res, rows);
  }),
  create: asyncHandler(async (req, res) => {
    const input = createReviewSchema.parse(req.body);
    const row = await reviewsService.create(input, req.user!);
    created(res, row);
  }),
};
