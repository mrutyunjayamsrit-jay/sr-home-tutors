import { z } from "zod";
import { strongPasswordSchema } from "@/modules/auth/auth.types";
import { optionalString } from "@/common/utils/zodHelpers";

export const createBranchSchema = z.object({
  name: z.string().min(2).max(120),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, hyphens or underscores"),
  address: z.string().max(500).optional(),
  contactEmail: z.string().email(),
  contactPhone: optionalString(z.string().min(6).max(20)),
  adminName: z.string().min(2).max(120),
  // Optional: lets the super admin set the branch admin's password directly
  // instead of getting a generated temp password — mainly useful when
  // contactEmail isn't a Gmail address, so Google sign-in isn't available
  // as a fallback. See branch.service.ts for the resulting behavior.
  password: strongPasswordSchema.optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().max(500).optional(),
  contactEmail: optionalString(z.string().email()),
  contactPhone: optionalString(z.string().min(6).max(20)),
  isActive: z.boolean().optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const listBranchesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().cuid(),
});

export const setBranchPasswordSchema = z.object({
  password: strongPasswordSchema,
});
export type SetBranchPasswordInput = z.infer<typeof setBranchPasswordSchema>;
