import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok, paginationMeta } from "@/common/utils/apiResponse";
import { tasksService } from "./tasks.service";
import { createTaskSchema, listTasksQuerySchema } from "./tasks.types";

export const tasksController = {
  create: asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await tasksService.create(input, req.user!);
    created(res, task);
  }),

  list: asyncHandler(async (req, res) => {
    const query = listTasksQuerySchema.parse(req.query);
    const { items, total } = await tasksService.list(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),

  complete: asyncHandler(async (req, res) => {
    const task = await tasksService.complete(req.params.taskId!, req.user!);
    ok(res, task);
  }),

  remove: asyncHandler(async (req, res) => {
    await tasksService.remove(req.params.taskId!, req.user!);
    noContent(res);
  }),
};
