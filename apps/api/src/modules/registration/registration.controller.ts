import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok, paginationMeta } from "@/common/utils/apiResponse";
import { registrationService } from "./registration.service";
import { listRegisteredQuerySchema } from "./registration.types";

export const registrationController = {
  listTutors: asyncHandler(async (req, res) => {
    const query = listRegisteredQuerySchema.parse(req.query);
    const { items, total } = await registrationService.listTutors(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  getTutor: asyncHandler(async (req, res) => {
    const tutor = await registrationService.getTutor(req.params.id!, req.user!);
    ok(res, tutor);
  }),
  listParents: asyncHandler(async (req, res) => {
    const query = listRegisteredQuerySchema.parse(req.query);
    const { items, total } = await registrationService.listParents(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  getParent: asyncHandler(async (req, res) => {
    const parent = await registrationService.getParent(req.params.id!, req.user!);
    ok(res, parent);
  }),
};
