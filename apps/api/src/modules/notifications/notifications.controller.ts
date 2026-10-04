import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok, noContent, paginationMeta } from "@/common/utils/apiResponse";
import { notificationsService } from "./notifications.service";
import { listNotificationsQuerySchema } from "./notifications.types";

export const notificationsController = {
  list: asyncHandler(async (req, res) => {
    const query = listNotificationsQuerySchema.parse(req.query);
    const { items, total, unreadCount } = await notificationsService.list(query, req.user!);
    ok(res, items, { ...paginationMeta(query, total), unreadCount });
  }),
  unreadCount: asyncHandler(async (req, res) => {
    const count = await notificationsService.unreadCount(req.user!);
    ok(res, { count });
  }),
  markRead: asyncHandler(async (req, res) => {
    const row = await notificationsService.markRead(req.params.notificationId!, req.user!);
    ok(res, row);
  }),
  markAllRead: asyncHandler(async (req, res) => {
    await notificationsService.markAllRead(req.user!);
    noContent(res);
  }),
};
