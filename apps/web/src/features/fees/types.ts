export type Board = "STATE" | "CBSE" | "ICSE" | "OTHER";
export type BillingCycle = "MONTHLY" | "PACKAGE";
export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export interface FeeRateCard {
  id: string;
  branchId: string;
  board: Board;
  classCategory: string;
  ratePerClass: number;
  billingCycle: BillingCycle;
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
  student: {
    id: string;
    name: string;
    studentClass: string;
    parent: { name: string; contactNumber: string; branch?: { id: string; name: string } };
  };
  /** How many payment-proof files are attached — see fees.service.ts listInvoices. */
  proofCount: number;
}
