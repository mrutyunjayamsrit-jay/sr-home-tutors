import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { familyService } from "./family.service";
import { updateMyLocationSchema } from "./family.types";

export const familyController = {
  listChildren: asyncHandler(async (req, res) => {
    const children = await familyService.listChildren(req.user!);
    ok(res, children);
  }),
  getChild: asyncHandler(async (req, res) => {
    const child = await familyService.getChild(req.params.studentId!, req.user!);
    ok(res, child);
  }),
  getMyLocation: asyncHandler(async (req, res) => {
    const location = await familyService.getMyLocation(req.user!);
    ok(res, location);
  }),
  updateMyLocation: asyncHandler(async (req, res) => {
    const input = updateMyLocationSchema.parse(req.body);
    const location = await familyService.updateMyLocation(input, req.user!);
    ok(res, location);
  }),
};
