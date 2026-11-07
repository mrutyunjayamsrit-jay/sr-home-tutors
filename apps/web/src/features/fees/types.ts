export type Board = "STATE" | "CBSE" | "ICSE" | "OTHER";
export type BillingCycle = "MONTHLY" | "PACKAGE";
export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export interface FeeRateCard {
  id: string;
  branchId: string;
  board: Board;
  classCategory: string;
  billingCycle: BillingCycle;
  // MONTHLY only.
  ratePerClass: number | null;
  // PACKAGE only — a fixed bundle (e.g. "3 subjects, 100 classes, ₹45,000"), not a per-class rate.
  numberOfSubjects: number | null;
  totalClasses: number | null;
  totalAmount: number | null;
  // Only populated when Super Admin lists across every branch (no branchId filter) — see fees.service.ts listRateCards.
  branch?: { id: string; name: string };
}

export interface StudentFeeInvoice {
  id: string;
  period: string;
  fixedClasses: number;
  classesTaken: number;
  fixedFees: number;
  payableFees: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  status: InvoiceStatus;
  /** Super Admin's own sign-off on the payment the branch recorded — independent of `status` (see fees.service.ts approveInvoice). */
  approvedAt: string | null;
  student: {
    id: string;
    name: string;
    studentClass: string;
    parent: { name: string; contactNumber: string; branch?: { id: string; name: string } };
  };
  /** How many payment-proof files are attached — see fees.service.ts listInvoices. */
  proofCount: number;
}
