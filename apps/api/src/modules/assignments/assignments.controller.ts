import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, ok, paginationMeta } from "@/common/utils/apiResponse";
import { assignmentsService } from "./assignments.service";
import { createAssignmentSchema, updateAssignmentStatusSchema, listAssignmentsQuerySchema } from "./assignments.types";

export const assignmentsController = {
  list: asyncHandler(async (req, res) => {
    const query = listAssignmentsQuerySchema.parse(req.query);
    const { items, total } = await assignmentsService.list(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  get: asyncHandler(async (req, res) => {
    const assignment = await assignmentsService.get(req.params.assignmentId!, req.user!);
    ok(res, assignment);
  }),
  create: asyncHandler(async (req, res) => {
    const input = createAssignmentSchema.parse(req.body);
    const assignment = await assignmentsService.create(input, req.user!);
    created(res, assignment);
  }),
  updateStatus: asyncHandler(async (req, res) => {
    const { status } = updateAssignmentStatusSchema.parse(req.body);
    const assignment = await assignmentsService.updateStatus(req.params.assignmentId!, status, req.user!);
    ok(res, assignment);
  }),
  runningClasses: asyncHandler(async (req, res) => {
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const rows = await assignmentsService.runningClasses({ branchId, search }, req.user!);
    ok(res, rows);
  }),
};
