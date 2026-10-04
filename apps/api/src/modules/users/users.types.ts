import { z } from "zod";
import { strongPasswordSchema } from "@/modules/auth/auth.types";

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "BRANCH_ADMIN", "TUTOR", "PARENT", "STUDENT"]).optional(),
  branchId: z.string().cuid().optional(),
  status: z.enum(["PENDING_ACTIVATION", "ACTIVE", "DISABLED"]).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({ userId: z.string().cuid() });

// Fields shared by every role that gets a login here.
const baseCredentialFields = {
  email: z.string().email(),
  password: strongPasswordSchema.optional(),
};

export const createUserSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("BRANCH_ADMIN"),
    name: z.string().min(2).max(120),
    branchId: z.string().cuid(),
    ...baseCredentialFields,
  }),
  z.object({
    role: z.literal("TUTOR"),
    name: z.string().min(2).max(120),
    branchId: z.string().cuid(),
    education: z.string().min(1).max(200),
    contactNumber: z.string().min(6).max(20),
    address: z.string().min(1).max(500),
    ...baseCredentialFields,
  }),
  z.object({
    role: z.literal("PARENT"),
    name: z.string().min(2).max(120),
    branchId: z.string().cuid(),
    contactNumber: z.string().min(6).max(20),
    address: z.string().min(1).max(500),
    ...baseCredentialFields,
  }),
  z.object({
    role: z.literal("STUDENT"),
    name: z.string().min(2).max(120),
    parentId: z.string().cuid(),
    studentClass: z.string().min(1).max(40),
    board: z.enum(["STATE", "CBSE", "ICSE", "OTHER"]),
    ...baseCredentialFields,
  }),
]);
export type CreateUserInput = z.infer<typeof createUserSchema>;
