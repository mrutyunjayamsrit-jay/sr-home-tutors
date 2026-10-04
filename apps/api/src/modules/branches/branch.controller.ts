import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok, paginationMeta } from "@/common/utils/apiResponse";
import { branchService } from "./branch.service";
import { createBranchSchema, updateBranchSchema, listBranchesQuerySchema, setBranchPasswordSchema } from "./branch.types";

export const branchController = {
  create: asyncHandler(async (req, res) => {
    const input = createBranchSchema.parse(req.body);
    const result = await branchService.createBranchWithAdmin(input, req.user!.id);
    created(res, result);
  }),

  list: asyncHandler(async (req, res) => {
    const query = listBranchesQuerySchema.parse(req.query);
    const { items, total } = await branchService.list(query);
    ok(res, items, paginationMeta(query, total));
  }),

  get: asyncHandler(async (req, res) => {
    const branch = await branchService.get(req.params.branchId!);
    ok(res, branch);
  }),

  update: asyncHandler(async (req, res) => {
    const input = updateBranchSchema.parse(req.body);
    const branch = await branchService.update(req.params.branchId!, input, req.user!);
    ok(res, branch);
  }),

  setPassword: asyncHandler(async (req, res) => {
    const input = setBranchPasswordSchema.parse(req.body);
    await branchService.setPassword(req.params.branchId!, input, req.user!.id);
    noContent(res);
  }),

  stats: asyncHandler(async (req, res) => {
    const stats = await branchService.getStats(req.params.branchId!);
    ok(res, stats);
  }),

  orgSummary: asyncHandler(async (req, res) => {
    const summary = await branchService.getOrgSummary();
    ok(res, summary);
  }),
};
