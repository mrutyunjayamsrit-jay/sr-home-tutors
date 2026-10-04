export type TaskStatus = "PENDING" | "COMPLETED";

export interface Task {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  createdById: string;
  completedById: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Only populated for Super Admin (see tasks.service.ts list).
  branch?: { id: string; name: string };
}

export interface CreateTaskInput {
  branchId: string;
  title: string;
  description?: string;
  dueDate?: string;
}
