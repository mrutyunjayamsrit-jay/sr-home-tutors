import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { settingsService } from "./settings.service";
import { updateSettingsSchema } from "./settings.types";

export const settingsController = {
  get: asyncHandler(async (_req, res) => {
    const settings = await settingsService.get();
    ok(res, settings);
  }),

  update: asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    const settings = await settingsService.update(input, req.user!.id);
    ok(res, settings);
  }),
};
