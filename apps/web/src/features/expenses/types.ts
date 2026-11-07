export interface Expense {
  id: string;
  branchId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
  /** How many receipt files are attached — see expenses.service.ts list. */
  receiptCount: number;
  /** Super Admin's own sign-off on this expense — see expenses.service.ts approve. */
  approvedAt: string | null;
  /** Only populated when Super Admin lists across every branch (no branchId filter) — see expenses.service.ts list. */
  branch?: { id: string; name: string };
}
