import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { ratingsService } from "./ratings.service";
import { rateTutorSchema } from "./ratings.types";

export const ratingsController = {
  getForAssignment: asyncHandler(async (req, res) => {
    const rating = await ratingsService.getForAssignment(req.params.assignmentId!, req.user!);
    ok(res, rating);
  }),
  rate: asyncHandler(async (req, res) => {
    const input = rateTutorSchema.parse(req.body);
    const rating = await ratingsService.rate(req.params.assignmentId!, input, req.user!);
    ok(res, rating);
  }),
};
