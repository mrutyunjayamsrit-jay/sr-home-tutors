import { prisma } from "@/common/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/common/errors/AppError";
import { enquiriesRepository } from "./enquiries.repository";
import { resolveInitialCredential } from "@/modules/auth/credential.util";
import { generateUniqueUsername } from "@/modules/auth/username.util";
import type { EnquiryStatus } from "@prisma/client";
import type {
  ConvertEnquiryInput,
  CreateParentEnquiryInput,
  CreateTutorEnquiryInput,
} from "./enquiries.types";

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
}

/** BRANCH_ADMIN/TUTOR/PARENT are always forced onto their own branch — the client-supplied branchId (if any) is ignored, not just validated, so there's no way to smuggle a different branch in. SUPER_ADMIN must specify one. */
function resolveBranchIdForCreate(actor: Actor, requested: string | undefined): string {
  if (actor.role === "BRANCH_ADMIN" || actor.role === "TUTOR" || actor.role === "PARENT") {
    if (!actor.branchId) throw new ForbiddenError("Your account isn't attached to a branch");
    return actor.branchId;
  }
  if (!requested) throw new ValidationError("branchId is required for Super Admin");
  return requested;
}

function assertBranchAccess(actor: Actor, ownerBranchId: string) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.branchId !== ownerBranchId) throw new ForbiddenError("You don't have access to this branch's data");
}

/** A referrer's (tutor or parent) enquiry access is narrower than "same branch" — they can only see/edit referrals THEY submitted, not the whole branch's enquiry pipeline (that stays office-only). */
function assertOwnEnquiryAccess(actor: Actor, enquiry: { branchId: string; createdById: string }) {
  assertBranchAccess(actor, enquiry.branchId);
  if ((actor.role === "TUTOR" || actor.role === "PARENT") && enquiry.createdById !== actor.id) {
    throw new ForbiddenError("You can only manage referrals you submitted");
  }
}

export const enquiriesService = {
  // ── Tutor enquiries ──────────────────────────────────────────────────
  // A tutor referring another tutor only ever sees referrals THEY
  // submitted (see assertOwnEnquiryAccess) — the rest of the branch's
  // tutor-enquiry pipeline stays office-only.
  async listTutorEnquiries(params: { page: number; pageSize: number; search?: string; status?: string; branchId?: string }, actor: Actor) {
    const branchId = actor.role === "BRANCH_ADMIN" || actor.role === "TUTOR" ? actor.branchId ?? undefined : params.branchId;
    const createdById = actor.role === "TUTOR" ? actor.id : undefined;
    return enquiriesRepository.listTutorEnquiries({ ...params, branchId, createdById });
  },

  async getTutorEnquiry(id: string, actor: Actor) {
    const enquiry = await enquiriesRepository.findTutorEnquiry(id);
    if (!enquiry) throw new NotFoundError("Tutor enquiry not found");
    assertOwnEnquiryAccess(actor, enquiry);
    return enquiry;
  },

  async createTutorEnquiry(input: CreateTutorEnquiryInput, actor: Actor) {
    const branchId = resolveBranchIdForCreate(actor, input.branchId);
    return enquiriesRepository.createTutorEnquiry({
      branchId,
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
      createdById: actor.id,
      status: "NEW",
    });
  },

  async updateTutorEnquiry(id: string, input: Partial<CreateTutorEnquiryInput>, actor: Actor) {
    const existing = await enquiriesRepository.findTutorEnquiry(id);
    if (!existing) throw new NotFoundError("Tutor enquiry not found");
    assertOwnEnquiryAccess(actor, existing);
    return enquiriesRepository.updateTutorEnquiry(id, input);
  },

  async updateTutorEnquiryStatus(id: string, status: EnquiryStatus, actor: Actor) {
    const existing = await enquiriesRepository.findTutorEnquiry(id);
    if (!existing) throw new NotFoundError("Tutor enquiry not found");
    assertBranchAccess(actor, existing.branchId);
    return enquiriesRepository.updateTutorEnquiry(id, { status });
  },

  /**
   * "Move to registered tutors" — per the source spec, accepting an enquiry
   * IS the registration step, so this both marks the enquiry ACCEPTED and
   * provisions the Tutor profile + login in one action, rather than making
   * office staff do two separate steps for what's conceptually one decision.
   */
  async convertTutorEnquiry(id: string, input: ConvertEnquiryInput, actor: Actor) {
    const enquiry = await enquiriesRepository.findTutorEnquiry(id);
    if (!enquiry) throw new NotFoundError("Tutor enquiry not found");
    assertBranchAccess(actor, enquiry.branchId);
    if (enquiry.status === "REJECTED") {
      throw new ValidationError("This enquiry was rejected. Re-open it before registering.");
    }
    if (enquiry.tutor) {
      throw new ValidationError("This enquiry has already been converted to a registered tutor");
    }
    if (input.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingEmail) throw new ValidationError(`A user with email "${input.email}" already exists`);
    }

    const credential = await resolveInitialCredential(input.email, input.password);
    const username = await generateUniqueUsername(enquiry.name);

    const tutor = await prisma.$transaction(async (tx) => {
      await tx.tutorEnquiry.update({ where: { id }, data: { status: "ACCEPTED" } });
      const user = await tx.user.create({
        data: {
          role: "TUTOR",
          branchId: enquiry.branchId,
          name: enquiry.name,
          email: input.email,
          username,
          passwordHash: credential.passwordHash,
          status: "PENDING_ACTIVATION",
          mustResetPassword: credential.mustResetPassword,
        },
      });
      return tx.tutor.create({
        data: {
          branchId: enquiry.branchId,
          userId: user.id,
          enquiryId: enquiry.id,
          name: enquiry.name,
          gender: enquiry.gender,
          education: enquiry.education,
          contactNumber: enquiry.contactNumber,
          address: enquiry.presentAddress,
          ownsVehicle: enquiry.ownsVehicle,
          categories: enquiry.categories,
          subjects: enquiry.subjectsInterested,
          areas: enquiry.areasInterested,
          status: "REGISTERED",
        },
      });
    });

    return {
      tutor,
      credentials: {
        username,
        email: input.email ?? null,
        tempPassword: credential.tempPasswordToDisplay,
        wasGenerated: credential.wasGenerated,
        passwordSkipped: credential.passwordSkipped,
      },
    };
  },

  // ── Parent (student) enquiries ───────────────────────────────────────
  // A tutor or a parent (referring another family) only ever sees
  // referrals THEY submitted (see assertOwnEnquiryAccess) — the rest of
  // the branch's enquiry pipeline stays office-only, same reasoning as
  // the branch scoping below.
  async listParentEnquiries(params: { page: number; pageSize: number; search?: string; status?: string; branchId?: string }, actor: Actor) {
    const branchId =
      actor.role === "BRANCH_ADMIN" || actor.role === "TUTOR" || actor.role === "PARENT"
        ? actor.branchId ?? undefined
        : params.branchId;
    const createdById = actor.role === "TUTOR" || actor.role === "PARENT" ? actor.id : undefined;
    return enquiriesRepository.listParentEnquiries({ ...params, branchId, createdById });
  },

  async getParentEnquiry(id: string, actor: Actor) {
    const enquiry = await enquiriesRepository.findParentEnquiry(id);
    if (!enquiry) throw new NotFoundError("Parent enquiry not found");
    assertOwnEnquiryAccess(actor, enquiry);
    return enquiry;
  },

  async createParentEnquiry(input: CreateParentEnquiryInput, actor: Actor) {
    const branchId = resolveBranchIdForCreate(actor, input.branchId);
    return enquiriesRepository.createParentEnquiry({
      branchId,
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
      agreedFinalFees: input.agreedFinalFees,
      parentQueries: input.parentQueries,
      createdById: actor.id,
      status: "NEW",
    });
  },

  async updateParentEnquiry(id: string, input: Partial<CreateParentEnquiryInput>, actor: Actor) {
    const existing = await enquiriesRepository.findParentEnquiry(id);
    if (!existing) throw new NotFoundError("Parent enquiry not found");
    assertOwnEnquiryAccess(actor, existing);
    return enquiriesRepository.updateParentEnquiry(id, input);
  },

  async updateParentEnquiryStatus(id: string, status: EnquiryStatus, actor: Actor) {
    const existing = await enquiriesRepository.findParentEnquiry(id);
    if (!existing) throw new NotFoundError("Parent enquiry not found");
    assertBranchAccess(actor, existing.branchId);
    return enquiriesRepository.updateParentEnquiry(id, { status });
  },

  /**
   * "Move to registered parents" — creates the Parent (the login-holding
   * contact) AND the Student (the child named in the enquiry) together,
   * since a parent enquiry is fundamentally about one child. Only the
   * parent gets a login here; a student login (if wanted) is a separate,
   * later step via Users & Roles.
   */
  async convertParentEnquiry(id: string, input: ConvertEnquiryInput, actor: Actor) {
    const enquiry = await enquiriesRepository.findParentEnquiry(id);
    if (!enquiry) throw new NotFoundError("Parent enquiry not found");
    assertBranchAccess(actor, enquiry.branchId);
    if (enquiry.status === "REJECTED") {
      throw new ValidationError("This enquiry was rejected. Re-open it before registering.");
    }
    if (enquiry.parent) {
      throw new ValidationError("This enquiry has already been converted to a registered parent");
    }
    if (input.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingEmail) throw new ValidationError(`A user with email "${input.email}" already exists`);
    }

    const credential = await resolveInitialCredential(input.email, input.password);
    // Per the source spec: parent username is auto-generated from name + phone digits.
    const username = await generateUniqueUsername(`${enquiry.studentName.split(" ")[0]}${enquiry.contactNumber.slice(-3)}`);

    const parent = await prisma.$transaction(async (tx) => {
      await tx.parentEnquiry.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          ...(input.feesPrescribed !== undefined ? { feesPrescribed: input.feesPrescribed } : {}),
          ...(input.agreedFinalFees !== undefined ? { agreedFinalFees: input.agreedFinalFees } : {}),
        },
      });
      const user = await tx.user.create({
        data: {
          role: "PARENT",
          branchId: enquiry.branchId,
          name: `Parent of ${enquiry.studentName}`,
          email: input.email,
          username,
          passwordHash: credential.passwordHash,
          status: "PENDING_ACTIVATION",
          mustResetPassword: credential.mustResetPassword,
        },
      });
      const parentRow = await tx.parent.create({
        data: {
          branchId: enquiry.branchId,
          userId: user.id,
          enquiryId: enquiry.id,
          name: `Parent of ${enquiry.studentName}`,
          contactNumber: enquiry.contactNumber,
          address: enquiry.presentAddress,
          area: enquiry.area,
          // Carries over whatever GPS was captured on the public enquiry
          // form, if any — the parent can always refresh it later from
          // their own dashboard (see family.service.ts updateMyLocation).
          latitude: enquiry.latitude,
          longitude: enquiry.longitude,
          locationUpdatedAt: enquiry.latitude != null ? new Date() : null,
          status: "REGISTERED",
        },
      });
      await tx.student.create({
        data: {
          parentId: parentRow.id,
          name: enquiry.studentName,
          studentClass: enquiry.studentClass,
          board: enquiry.board,
          subjectsNeeded: enquiry.subjectsRequired,
          preferredTutorGender: enquiry.preferredTutorGender,
          status: "REGISTERED",
        },
      });
      return parentRow;
    });

    return {
      parent,
      credentials: {
        username,
        email: input.email ?? null,
        tempPassword: credential.tempPasswordToDisplay,
        wasGenerated: credential.wasGenerated,
        passwordSkipped: credential.passwordSkipped,
      },
    };
  },
};
