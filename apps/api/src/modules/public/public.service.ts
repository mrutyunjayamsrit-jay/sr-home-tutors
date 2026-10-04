import { prisma } from "@/common/prisma";
import { NotFoundError } from "@/common/errors/AppError";
import { enquiriesRepository } from "@/modules/enquiries/enquiries.repository";
import type { PublicParentEnquiryInput, PublicTutorEnquiryInput } from "./public.types";

const SETTINGS_SINGLETON_ID = "singleton";

// Sentinel createdById for web-submitted enquiries — createdById is a plain
// string column (not an FK, see schema.prisma's comment on TutorEnquiry),
// used elsewhere only to let a tutor find referrals THEY personally
// submitted. A public visitor has no such account, so this sentinel just
// needs to read clearly in the office's enquiry list, not resolve to a user.
const PUBLIC_SUBMITTER = "PUBLIC_WEBSITE";

async function assertBranchIsPublic(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, isActive: true } });
  if (!branch || !branch.isActive) throw new NotFoundError("The selected branch isn't accepting enquiries right now");
}

export const publicService = {
  /** Active branches only, and only the fields safe to show an anonymous visitor — never contactEmail's staff inbox details beyond what's already public-facing. */
  async listBranches() {
    return prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, contactPhone: true },
      orderBy: { name: "asc" },
    });
  },

  /** Every subject Super Admin has added — global, not branch-scoped, so no filter needed. */
  async listSubjects() {
    return prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  },

  /** Areas for the one branch the visitor picked — never every branch's, since that'd leak unrelated locations into a dropdown that only makes sense once a branch is chosen. */
  async listAreas(branchId: string) {
    return prisma.area.findMany({ where: { branchId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  },

  /** Org-level support contact only — never tutorRulesText or anything else on OrgSettings meant for logged-in eyes. */
  async getContact() {
    const settings = await prisma.orgSettings.upsert({
      where: { id: SETTINGS_SINGLETON_ID },
      update: {},
      create: { id: SETTINGS_SINGLETON_ID },
    });
    return {
      organizationName: settings.organizationName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
    };
  },

  async submitTutorEnquiry(input: PublicTutorEnquiryInput) {
    await assertBranchIsPublic(input.branchId);
    return enquiriesRepository.createTutorEnquiry({
      branchId: input.branchId,
      name: input.name,
      gender: input.gender,
      education: input.education,
      contactNumber: input.contactNumber,
      presentAddress: input.presentAddress,
      permanentAddress: input.permanentAddress,
      ownsVehicle: input.ownsVehicle,
      addressProofType: input.addressProofType,
      categories: input.categories,
      subjectsInterested: input.subjectsInterested,
      areasInterested: input.areasInterested,
      notes: input.notes,
      createdById: PUBLIC_SUBMITTER,
      status: "NEW",
    });
  },

  async submitParentEnquiry(input: PublicParentEnquiryInput) {
    await assertBranchIsPublic(input.branchId);
    return enquiriesRepository.createParentEnquiry({
      branchId: input.branchId,
      studentName: input.studentName,
      contactNumber: input.contactNumber,
      studentClass: input.studentClass,
      board: input.board,
      subjectsRequired: input.subjectsRequired,
      presentAddress: input.presentAddress,
      area: input.area,
      preferredTutorGender: input.preferredTutorGender,
      latitude: input.latitude,
      longitude: input.longitude,
      addressProofType: input.addressProofType,
      feesPrescribed: input.feesPrescribed,
      parentQueries: input.parentQueries,
      createdById: PUBLIC_SUBMITTER,
      status: "NEW",
    });
  },
};
