import { asyncHandler } from "@/common/utils/asyncHandler";
import { created, ok, paginationMeta } from "@/common/utils/apiResponse";
import { enquiriesService } from "./enquiries.service";
import {
  createTutorEnquirySchema,
  updateTutorEnquirySchema,
  createParentEnquirySchema,
  updateParentEnquirySchema,
  updateEnquiryStatusSchema,
  convertEnquirySchema,
  listEnquiriesQuerySchema,
} from "./enquiries.types";

export const enquiriesController = {
  // Tutor enquiries
  listTutors: asyncHandler(async (req, res) => {
    const query = listEnquiriesQuerySchema.parse(req.query);
    const { items, total } = await enquiriesService.listTutorEnquiries(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  getTutor: asyncHandler(async (req, res) => {
    const enquiry = await enquiriesService.getTutorEnquiry(req.params.enquiryId!, req.user!);
    ok(res, enquiry);
  }),
  createTutor: asyncHandler(async (req, res) => {
    const input = createTutorEnquirySchema.parse(req.body);
    const enquiry = await enquiriesService.createTutorEnquiry(input, req.user!);
    created(res, enquiry);
  }),
  updateTutor: asyncHandler(async (req, res) => {
    const input = updateTutorEnquirySchema.parse(req.body);
    const enquiry = await enquiriesService.updateTutorEnquiry(req.params.enquiryId!, input, req.user!);
    ok(res, enquiry);
  }),
  updateTutorStatus: asyncHandler(async (req, res) => {
    const { status } = updateEnquiryStatusSchema.parse(req.body);
    const enquiry = await enquiriesService.updateTutorEnquiryStatus(req.params.enquiryId!, status, req.user!);
    ok(res, enquiry);
  }),
  convertTutor: asyncHandler(async (req, res) => {
    const input = convertEnquirySchema.parse(req.body);
    const result = await enquiriesService.convertTutorEnquiry(req.params.enquiryId!, input, req.user!);
    created(res, result);
  }),

  // Parent enquiries
  listParents: asyncHandler(async (req, res) => {
    const query = listEnquiriesQuerySchema.parse(req.query);
    const { items, total } = await enquiriesService.listParentEnquiries(query, req.user!);
    ok(res, items, paginationMeta(query, total));
  }),
  getParent: asyncHandler(async (req, res) => {
    const enquiry = await enquiriesService.getParentEnquiry(req.params.enquiryId!, req.user!);
    ok(res, enquiry);
  }),
  createParent: asyncHandler(async (req, res) => {
    const input = createParentEnquirySchema.parse(req.body);
    const enquiry = await enquiriesService.createParentEnquiry(input, req.user!);
    created(res, enquiry);
  }),
  updateParent: asyncHandler(async (req, res) => {
    const input = updateParentEnquirySchema.parse(req.body);
    const enquiry = await enquiriesService.updateParentEnquiry(req.params.enquiryId!, input, req.user!);
    ok(res, enquiry);
  }),
  updateParentStatus: asyncHandler(async (req, res) => {
    const { status } = updateEnquiryStatusSchema.parse(req.body);
    const enquiry = await enquiriesService.updateParentEnquiryStatus(req.params.enquiryId!, status, req.user!);
    ok(res, enquiry);
  }),
  convertParent: asyncHandler(async (req, res) => {
    const input = convertEnquirySchema.parse(req.body);
    const result = await enquiriesService.convertParentEnquiry(req.params.enquiryId!, input, req.user!);
    created(res, result);
  }),
};
