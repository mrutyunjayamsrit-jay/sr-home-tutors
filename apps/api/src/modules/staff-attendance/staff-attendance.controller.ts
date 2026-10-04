import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { staffAttendanceService } from "./staff-attendance.service";
import { checkTimeSchema, listMineQuerySchema, overviewQuerySchema } from "./staff-attendance.types";

export const staffAttendanceController = {
  checkIn: asyncHandler(async (req, res) => {
    const input = checkTimeSchema.parse(req.body);
    const row = await staffAttendanceService.checkIn(input, req.user!);
    ok(res, row);
  }),
  checkOut: asyncHandler(async (req, res) => {
    const input = checkTimeSchema.parse(req.body);
    const row = await staffAttendanceService.checkOut(input, req.user!);
    ok(res, row);
  }),
  today: asyncHandler(async (req, res) => {
    const row = await staffAttendanceService.getToday(req.user!);
    ok(res, row);
  }),
  listMine: asyncHandler(async (req, res) => {
    const query = listMineQuerySchema.parse(req.query);
    const rows = await staffAttendanceService.listMine(query, req.user!);
    ok(res, rows);
  }),
  overview: asyncHandler(async (req, res) => {
    const query = overviewQuerySchema.parse(req.query);
    const rows = await staffAttendanceService.overview(query, req.user!);
    ok(res, rows);
  }),
};
