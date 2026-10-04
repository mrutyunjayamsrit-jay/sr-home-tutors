import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok, paginationMeta } from "@/common/utils/apiResponse";
import { announcementsService } from "./announcements.service";
import { createAnnouncementSchema, listAnnouncementsQuerySchema } from "./announcements.types";

export const announcementsController = {
  list: asyncHandler(async (req, res) => {
    const query = listAnnouncementsQuerySchema.parse(req.query);
    const { items, total } = await announcementsService.list(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  create: asyncHandler(async (req, res) => {
    const input = createAnnouncementSchema.parse(req.body);
    const row = await announcementsService.create(input, req.user!);
    created(res, row);
  }),
  remove: asyncHandler(async (req, res) => {
    await announcementsService.remove(req.params.announcementId!, req.user!);
    noContent(res);
  }),
};
