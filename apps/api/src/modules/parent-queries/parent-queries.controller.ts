import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, ok, paginationMeta } from "@/common/utils/apiResponse";
import { parentQueriesService } from "./parent-queries.service";
import { createParentQuerySchema, answerParentQuerySchema, listParentQueriesQuerySchema } from "./parent-queries.types";

export const parentQueriesController = {
  create: asyncHandler(async (req, res) => {
    const input = createParentQuerySchema.parse(req.body);
    const query = await parentQueriesService.create(input, req.user!);
    created(res, query);
  }),

  list: asyncHandler(async (req, res) => {
    const query = listParentQueriesQuerySchema.parse(req.query);
    const { items, total } = await parentQueriesService.list(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),

  answer: asyncHandler(async (req, res) => {
    const input = answerParentQuerySchema.parse(req.body);
    const query = await parentQueriesService.answer(req.params.queryId!, input, req.user!);
    ok(res, query);
  }),
};
