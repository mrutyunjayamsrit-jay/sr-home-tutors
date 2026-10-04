import { z } from "zod";

export const documentOwnerTypeSchema = z.enum([
  "TUTOR_ENQUIRY",
  "PARENT_ENQUIRY",
  "TUTOR",
  "PARENT",
  "STUDENT",
  "EXPENSE",
  "MATERIAL",
  "STUDENT_FEE_INVOICE",
]);

export const uploadDocumentSchema = z.object({
  ownerType: documentOwnerTypeSchema,
  ownerId: z.string().cuid(),
  docType: z.string().min(1).max(60),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
  ownerType: documentOwnerTypeSchema,
  ownerId: z.string().cuid(),
});

export const documentIdParamSchema = z.object({ documentId: z.string().cuid() });
