import { z } from "zod";

const BOARDS = ["STATE", "CBSE", "ICSE", "OTHER"] as const;

// ── Fee rate cards ──────────────────────────────────────────────────────
export const createRateCardSchema = z.object({
  branchId: z.string().cuid().optional(),
  board: z.enum(BOARDS),
  classCategory: z.string().min(1).max(40),
  ratePerClass: z.coerce.number().positive(),
  billingCycle: z.enum(["MONTHLY", "PACKAGE"]).default("MONTHLY"),
});
export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;

export const rateCardIdParamSchema = z.object({ rateCardId: z.string().cuid() });

export const listRateCardsQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  board: z.enum(BOARDS).optional(),
});

// ── Student fee invoices ─────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  studentId: z.string().cuid(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM")
    .or(z.string().min(1).max(40)),
  fixedClasses: z.coerce.number().int().positive(),
  fixedFees: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().min(1).max(60),
  paidAt: z.coerce.date().optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const invoiceIdParamSchema = z.object({ invoiceId: z.string().cuid() });

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  search: z.string().optional(),
});
