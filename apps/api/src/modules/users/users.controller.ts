import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok, paginationMeta } from "@/common/utils/apiResponse";
import { usersService } from "./users.service";
import { createUserSchema, listUsersQuerySchema } from "./users.types";

export const usersController = {
  list: asyncHandler(async (req, res) => {
    const query = listUsersQuerySchema.parse(req.query);
    const { items, total } = await usersService.list(query);
    ok(res, items, paginationMeta(query, total));
  }),

  listParentsForSelect: asyncHandler(async (req, res) => {
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const parents = await usersService.listParentsForSelect(branchId);
    ok(res, parents);
  }),

  create: asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const result = await usersService.create(input, req.user!.id);
    created(res, result);
  }),

  remove: asyncHandler(async (req, res) => {
    await usersService.remove(req.params.userId!, req.user!.id);
    noContent(res);
  }),

  enable: asyncHandler(async (req, res) => {
    await usersService.enable(req.params.userId!, req.user!.id);
    noContent(res);
  }),

  hardDelete: asyncHandler(async (req, res) => {
    await usersService.hardDelete(req.params.userId!, req.user!.id);
    noContent(res);
  }),
};
