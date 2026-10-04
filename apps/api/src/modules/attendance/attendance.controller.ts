import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok } from "@/common/utils/apiResponse";
import { attendanceService } from "./attendance.service";
import { listSessionsQuerySchema, markSessionSchema, locationCoordsSchema, manualAreaSchema, checkProximityQuerySchema } from "./attendance.types";

export const attendanceController = {
  list: asyncHandler(async (req, res) => {
    const query = listSessionsQuerySchema.parse(req.query);
    const rows = await attendanceService.listSessions(query, req.user!);
    ok(res, rows);
  }),
  mark: asyncHandler(async (req, res) => {
    const input = markSessionSchema.parse(req.body);
    const session = await attendanceService.mark(req.params.sessionId!, input, req.user!);
    ok(res, session);
  }),
  checkInLocation: asyncHandler(async (req, res) => {
    const input = locationCoordsSchema.parse(req.body);
    const session = await attendanceService.checkInWithLocation(req.params.sessionId!, input, req.user!);
    ok(res, session);
  }),
  checkInArea: asyncHandler(async (req, res) => {
    const input = manualAreaSchema.parse(req.body);
    const session = await attendanceService.checkInWithArea(req.params.sessionId!, input, req.user!);
    ok(res, session);
  }),
  checkOutLocation: asyncHandler(async (req, res) => {
    const input = locationCoordsSchema.parse(req.body);
    const session = await attendanceService.checkOutWithLocation(req.params.sessionId!, input, req.user!);
    ok(res, session);
  }),
  checkOutArea: asyncHandler(async (req, res) => {
    const input = manualAreaSchema.parse(req.body);
    const session = await attendanceService.checkOutWithArea(req.params.sessionId!, input, req.user!);
    ok(res, session);
  }),
  checkProximity: asyncHandler(async (req, res) => {
    const query = checkProximityQuerySchema.parse(req.query);
    const result = await attendanceService.checkProximity(req.params.sessionId!, query, req.user!);
    ok(res, result);
  }),
};
