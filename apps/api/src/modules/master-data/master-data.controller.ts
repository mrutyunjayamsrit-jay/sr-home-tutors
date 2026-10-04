import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, noContent, ok } from "@/common/utils/apiResponse";
import { masterDataService } from "./master-data.service";
import { createAreaSchema, createSubjectSchema, listAreasQuerySchema } from "./master-data.types";

export const masterDataController = {
  listSubjects: asyncHandler(async (_req, res) => {
    const subjects = await masterDataService.listSubjects();
    ok(res, subjects);
  }),

  createSubject: asyncHandler(async (req, res) => {
    const input = createSubjectSchema.parse(req.body);
    const subject = await masterDataService.createSubject(input);
    created(res, subject);
  }),

  deleteSubject: asyncHandler(async (req, res) => {
    await masterDataService.deleteSubject(req.params.subjectId!);
    noContent(res);
  }),

  listAreas: asyncHandler(async (req, res) => {
    const query = listAreasQuerySchema.parse(req.query);
    const areas = await masterDataService.listAreas(query, req.user!);
    ok(res, areas);
  }),

  createArea: asyncHandler(async (req, res) => {
    const input = createAreaSchema.parse(req.body);
    const area = await masterDataService.createArea(input);
    created(res, area);
  }),

  deleteArea: asyncHandler(async (req, res) => {
    await masterDataService.deleteArea(req.params.areaId!);
    noContent(res);
  }),
};
