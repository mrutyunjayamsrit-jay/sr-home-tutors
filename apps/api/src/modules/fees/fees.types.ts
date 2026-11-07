import { z } from "zod";

const BOARDS = ["STATE", "CBSE", "ICSE", "OTHER"] as const;

// ── Fee rate cards ──────────────────────────────────────────────────────
// MONTHLY needs a per-class rate plus how many subjects that rate covers.
// PACKAGE needs a fixed bundle instead — some number of subjects for a
// fixed total number of classes at a fixed total price (e.g. "3 subjects,
// 100 classes, ₹45,000") — never both shapes on the same row, so this is a
// discriminated union rather than a pile of optional fields with ad-hoc
// validation.
export const createRateCardSchema = z.discriminatedUnion("billingCycle", [
  z.object({
    branchId: z.string().cuid().optional(),
    board: z.enum(BOARDS),
    classCategory: z.string().min(1).max(40),
    billingCycle: z.literal("MONTHLY"),
    numberOfSubjects: z.coerce.number().int().positive(),
    ratePerClass: z.coerce.number().positive(),
  }),
  z.object({
    branchId: z.string().cuid().optional(),
    board: z.enum(BOARDS),
    classCategory: z.string().min(1).max(40),
    billingCycle: z.literal("PACKAGE"),
    numberOfSubjects: z.coerce.number().int().positive(),
    totalClasses: z.coerce.number().int().positive(),
    totalAmount: z.coerce.number().positive(),
  }),
]);
export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;

export const rateCardIdParamSchema = z.object({ rateCardId: z.string().cuid() });

export const listRateCardsQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  board: z.enum(BOARDS).optional(),
  classCategory: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "PACKAGE"]).optional(),
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
  period: z.string().optional(),
  paymentMethod: z.string().optional(),
  // Range filter on paidAt ("date of payment"), not createdAt/dueDate.
  paidFrom: z.coerce.date().optional(),
  paidTo: z.coerce.date().optional(),
});
