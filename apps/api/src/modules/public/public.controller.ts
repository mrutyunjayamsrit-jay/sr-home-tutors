import { asyncHandler } from "@/common/utils/asyncHandler";
import { ok, created } from "@/common/utils/apiResponse";
import { publicService } from "./public.service";
import { publicTutorEnquirySchema, publicParentEnquirySchema, publicListAreasQuerySchema } from "./public.types";

export const publicController = {
  listBranches: asyncHandler(async (_req, res) => {
    const branches = await publicService.listBranches();
    ok(res, branches);
  }),

  listSubjects: asyncHandler(async (_req, res) => {
    const subjects = await publicService.listSubjects();
    ok(res, subjects);
  }),

  listAreas: asyncHandler(async (req, res) => {
    const query = publicListAreasQuerySchema.parse(req.query);
    const areas = await publicService.listAreas(query.branchId);
    ok(res, areas);
  }),

  getContact: asyncHandler(async (_req, res) => {
    const contact = await publicService.getContact();
    ok(res, contact);
  }),

  submitTutorEnquiry: asyncHandler(async (req, res) => {
    const input = publicTutorEnquirySchema.parse(req.body);
    const row = await publicService.submitTutorEnquiry(input);
    // Only echo back the id — the rest of the row is internal enquiry-pipeline detail, not something an anonymous submitter needs reflected back.
    created(res, { id: row.id });
  }),

  submitParentEnquiry: asyncHandler(async (req, res) => {
    const input = publicParentEnquirySchema.parse(req.body);
    const row = await publicService.submitParentEnquiry(input);
    created(res, { id: row.id });
  }),
};
