import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok } from "@/common/utils/apiResponse";
import { testsService } from "./tests.service";
import { createTestResultSchema, updateTestResultSchema, listTestResultsQuerySchema } from "./tests.types";

export const testsController = {
  list: asyncHandler(async (req, res) => {
    const query = listTestResultsQuerySchema.parse(req.query);
    const rows = await testsService.list(query, req.user!);
    ok(res, rows);
  }),
  create: asyncHandler(async (req, res) => {
    const input = createTestResultSchema.parse(req.body);
    const row = await testsService.create(input, req.user!);
    created(res, row);
  }),
  update: asyncHandler(async (req, res) => {
    const input = updateTestResultSchema.parse(req.body);
    const row = await testsService.update(req.params.testResultId!, input, req.user!);
    ok(res, row);
  }),
  remove: asyncHandler(async (req, res) => {
    await testsService.remove(req.params.testResultId!, req.user!);
    noContent(res);
  }),
};
