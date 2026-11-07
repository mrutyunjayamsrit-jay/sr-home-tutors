export type TaskStatus = "PENDING" | "COMPLETED";
/** TO_BRANCH: Super Admin assigned this to the branch. TO_SUPER_ADMIN: the branch raised this for Super Admin. */
export type TaskDirection = "TO_BRANCH" | "TO_SUPER_ADMIN";

export interface Task {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  /** When this was assigned — distinct from createdAt, and can be backdated/postdated. */
  assignedDate: string;
  dueDate: string | null;
  status: TaskStatus;
  direction: TaskDirection;
  createdById: string;
  completedById: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Only populated for Super Admin (see tasks.service.ts list).
  branch?: { id: string; name: string };
}

export interface CreateTaskInput {
  /** Required for Super Admin; ignored for a Branch Admin, who can only raise a task for their own branch. */
  branchId?: string;
  title: string;
  description?: string;
  assignedDate?: string;
  dueDate?: string;
}
