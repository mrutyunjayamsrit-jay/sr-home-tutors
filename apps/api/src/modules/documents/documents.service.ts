import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/common/prisma";
import { env } from "@/config/env";
import { NotFoundError, ValidationError, ForbiddenError } from "@/common/errors/AppError";
import { assertParentOwnsStudent } from "@/common/access/family";
import type { DocumentOwnerType } from "@prisma/client";

const UPLOAD_DIR = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR, "documents");

// Storage is abstracted behind these three functions so the rest of this
// module (access checks, DB bookkeeping) never needs to know which backend
// is in play. `forcePathStyle` is required for every S3-*compatible*
// provider this app has actually been deployed against (Supabase Storage,
// Cloudflare R2, MinIO) — real AWS S3 accepts it too, so there's no reason
// to special-case it away.
const s3Client =
  env.STORAGE_PROVIDER === "s3"
    ? new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      })
    : null;

async function storageWrite(storageKey: string, buffer: Buffer, mimeType: string) {
  if (s3Client) {
    await s3Client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey, Body: buffer, ContentType: mimeType }));
    return;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, storageKey), buffer);
}

/** Local mode returns a filePath (Express's res.download reads it directly); S3 mode returns a Readable stream (the controller pipes it). Only ever one of the two is set. */
async function storageRead(storageKey: string): Promise<{ filePath?: string; stream?: Readable }> {
  if (s3Client) {
    const result = await s3Client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }));
    return { stream: result.Body as Readable };
  }
  return { filePath: path.join(UPLOAD_DIR, storageKey) };
}

async function storageDelete(storageKey: string) {
  if (s3Client) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey })).catch(() => {});
    return;
  }
  await fs.unlink(path.join(UPLOAD_DIR, storageKey)).catch(() => {});
}

interface Actor {
  id: string;
  role: string;
  branchId: string | null;
  profileId?: string;
}

// Documents are polymorphic by convention (ownerType + ownerId), not a real
// DB relation — see schema.prisma's comment on Document. Referential
// integrity and branch-tenant isolation are enforced here instead: before
// any upload/download, resolve which branch actually owns the referenced
// row and reject if it doesn't exist or belongs to a different branch.
async function resolveOwnerBranchId(ownerType: DocumentOwnerType, ownerId: string): Promise<string | null> {
  switch (ownerType) {
    case "TUTOR_ENQUIRY": {
      const row = await prisma.tutorEnquiry.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (!row) throw new NotFoundError("Tutor enquiry not found");
      return row.branchId;
    }
    case "PARENT_ENQUIRY": {
      const row = await prisma.parentEnquiry.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (!row) throw new NotFoundError("Parent enquiry not found");
      return row.branchId;
    }
    case "TUTOR": {
      const row = await prisma.tutor.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (!row) throw new NotFoundError("Tutor not found");
      return row.branchId;
    }
    case "PARENT": {
      const row = await prisma.parent.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (!row) throw new NotFoundError("Parent not found");
      return row.branchId;
    }
    case "STUDENT": {
      const row = await prisma.student.findUnique({ where: { id: ownerId }, select: { parent: { select: { branchId: true } } } });
      if (!row) throw new NotFoundError("Student not found");
      return row.parent.branchId;
    }
    case "EXPENSE": {
      const row = await prisma.expense.findUnique({ where: { id: ownerId }, select: { branchId: true } });
      if (!row) throw new NotFoundError("Expense not found");
      return row.branchId;
    }
    case "STUDENT_FEE_INVOICE": {
      const row = await prisma.studentFeeInvoice.findUnique({
        where: { id: ownerId },
        select: { student: { select: { parent: { select: { branchId: true } } } } },
      });
      if (!row) throw new NotFoundError("Invoice not found");
      return row.student.parent.branchId;
    }
    case "MATERIAL":
      // Study materials aren't branch-scoped the same way yet — allow, no branch check.
      return null;
    default:
      return null;
  }
}

async function assertAccess(actor: Actor, ownerType: DocumentOwnerType, ownerId: string) {
  // A tutor's only document permission is study materials for their OWN
  // students (verified via an actual Assignment) — never KYC/enquiry/
  // expense documents, and never another tutor's student, even in the
  // same branch.
  if (actor.role === "TUTOR") {
    if (ownerType !== "STUDENT") {
      throw new ForbiddenError("Tutors can only manage study materials for their own students");
    }
    const link = await prisma.assignment.findFirst({
      where: { tutorId: actor.profileId, studentId: ownerId },
      select: { id: true },
    });
    if (!link) throw new ForbiddenError("This student isn't assigned to you");
    return;
  }

  // A parent may only view (list/download — never upload/delete, blocked at
  // the route level) study materials filed against their own child.
  if (actor.role === "PARENT") {
    if (ownerType !== "STUDENT") {
      throw new ForbiddenError("Parents can only view their child's study materials");
    }
    await assertParentOwnsStudent(actor.profileId, ownerId);
    return;
  }

  const ownerBranchId = await resolveOwnerBranchId(ownerType, ownerId);
  if (actor.role === "SUPER_ADMIN") return;
  if (ownerBranchId && ownerBranchId !== actor.branchId) {
    throw new ValidationError("You don't have access to this record");
  }
}

export const documentsService = {
  async upload(
    input: { ownerType: DocumentOwnerType; ownerId: string; docType: string },
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actor: Actor,
  ) {
    await assertAccess(actor, input.ownerType, input.ownerId);

    const ext = path.extname(file.originalname).slice(0, 10);
    const storageKey = `${crypto.randomUUID()}${ext}`;
    await storageWrite(storageKey, file.buffer, file.mimetype);

    return prisma.document.create({
      data: {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        docType: input.docType,
        storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: actor.id,
      },
    });
  },

  async list(ownerType: DocumentOwnerType, ownerId: string, actor: Actor) {
    await assertAccess(actor, ownerType, ownerId);
    return prisma.document.findMany({ where: { ownerType, ownerId }, orderBy: { createdAt: "desc" } });
  },

  async getForDownload(documentId: string, actor: Actor) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError("Document not found");
    await assertAccess(actor, doc.ownerType, doc.ownerId);
    return { doc, ...(await storageRead(doc.storageKey)) };
  },

  async remove(documentId: string, actor: Actor) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError("Document not found");
    await assertAccess(actor, doc.ownerType, doc.ownerId);

    await prisma.document.delete({ where: { id: documentId } });
    await storageDelete(doc.storageKey);
  },
};
