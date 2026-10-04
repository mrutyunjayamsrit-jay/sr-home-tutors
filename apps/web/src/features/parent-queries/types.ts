export type QueryTarget = "BRANCH" | "SUPER_ADMIN";
export type QueryStatus = "OPEN" | "ANSWERED";

export interface ParentQuery {
  id: string;
  branchId: string;
  askedById: string;
  target: QueryTarget;
  subject: string;
  message: string;
  status: QueryStatus;
  answer: string | null;
  answeredById: string | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present for the office/Super Admin view only (see parent-queries.service.ts). */
  branch?: { id: string; name: string } | null;
  askedBy?: { name: string; contactNumber: string } | null;
}

export interface CreateParentQueryInput {
  target: QueryTarget;
  subject: string;
  message: string;
}
