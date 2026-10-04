import { z } from "zod";
import { optionalString } from "@/common/utils/zodHelpers";

const TEACH_CATEGORIES = ["PRIMARY", "HIGHSCHOOL", "COLLEGE", "DEGREE"] as const;
const ADDRESS_PROOF_TYPES = ["AADHAR", "VOTER_ID", "DRIVING_LICENSE", "PASSPORT", "OTHER"] as const;
const BOARDS = ["STATE", "CBSE", "ICSE", "OTHER"] as const;
const ENQUIRY_STATUSES = ["NEW", "IN_REVIEW", "ACCEPTED", "REJECTED"] as const;
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

// ── Tutor enquiry ───────────────────────────────────────────────────────
export const createTutorEnquirySchema = z.object({
  branchId: z.string().cuid().optional(), // ignored for BRANCH_ADMIN (forced to own branch); required for SUPER_ADMIN
  name: z.string().min(2).max(120),
  gender: z.enum(GENDERS),
  education: z.string().min(1).max(200),
  contactNumber: z.string().min(6).max(20),
  presentAddress: z.string().min(1).max(500),
  permanentAddress: z.string().max(500).optional(),
  ownsVehicle: z.boolean().default(false),
  addressProofType: z.enum(ADDRESS_PROOF_TYPES).optional(),
  categories: z.array(z.enum(TEACH_CATEGORIES)).default([]),
  subjectsInterested: z.array(z.string().min(1).max(60)).default([]),
  areasInterested: z.array(z.string().min(1).max(120)).default([]),
  notes: optionalString(z.string().max(2000)),
});
export type CreateTutorEnquiryInput = z.infer<typeof createTutorEnquirySchema>;

export const updateTutorEnquirySchema = createTutorEnquirySchema.partial().omit({ branchId: true });

// ── Parent (student) enquiry ────────────────────────────────────────────
export const createParentEnquirySchema = z.object({
  branchId: z.string().cuid().optional(),
  studentName: z.string().min(2).max(120),
  contactNumber: z.string().min(6).max(20),
  studentClass: z.string().min(1).max(40),
  board: z.enum(BOARDS),
  subjectsRequired: z.array(z.string().min(1).max(60)).default([]),
  presentAddress: z.string().min(1).max(500),
  // Picked from the branch's Area list (see master-data module) — a plain
  // name, not an FK, so it keeps working even if that Area row is removed.
  area: optionalString(z.string().max(120)),
  // No preference is a perfectly normal answer, so this stays optional.
  preferredTutorGender: z.enum(GENDERS).optional(),
  // Best-effort GPS — set when captured from the parent's own device (the
  // public "Request a Tutor" form); left unset when a staff member enters
  // the enquiry by hand. See docs/DECISIONS.md on location-verified attendance.
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  addressProofType: z.enum(ADDRESS_PROOF_TYPES).optional(),
  feesPrescribed: z.coerce.number().positive().optional(),
  // What the branch office actually agreed with the parent, once
  // negotiated — may differ from feesPrescribed. Surfaced to Super Admin
  // in Reports (see reports.service.ts's parentEnquiryFees).
  agreedFinalFees: z.coerce.number().positive().optional(),
  parentQueries: optionalString(z.string().max(2000)),
});
export type CreateParentEnquiryInput = z.infer<typeof createParentEnquirySchema>;

export const updateParentEnquirySchema = createParentEnquirySchema.partial().omit({ branchId: true });

// ── Shared ───────────────────────────────────────────────────────────────
export const updateEnquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
});

export const convertEnquirySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(10).optional(),
  // Parent conversion only (ignored for tutor conversion) — a last chance
  // to set/correct the fees agreed with the family at the moment they're
  // actually registered, which may be later/different than whatever was
  // entered when the enquiry was first raised. Left unset preserves
  // whatever the enquiry already had (see enquiries.service.ts
  // convertParentEnquiry) rather than clearing it.
  feesPrescribed: z.coerce.number().positive().optional(),
  agreedFinalFees: z.coerce.number().positive().optional(),
});
export type ConvertEnquiryInput = z.infer<typeof convertEnquirySchema>;

export const listEnquiriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  branchId: z.string().cuid().optional(),
});

export const enquiryIdParamSchema = z.object({ enquiryId: z.string().cuid() });
