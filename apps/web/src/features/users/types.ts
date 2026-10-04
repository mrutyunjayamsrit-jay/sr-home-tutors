import type { Role } from "@/features/auth/types";

export interface UserListItem {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  username: string | null;
  status: "PENDING_ACTIVATION" | "ACTIVE" | "DISABLED";
  branch: { id: string; name: string; code: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ParentOption {
  id: string;
  name: string;
  contactNumber: string;
  branch: { name: string };
}

interface BaseCreateFields {
  email: string;
  password?: string;
  name: string;
}

export type CreateUserInput =
  | (BaseCreateFields & { role: "BRANCH_ADMIN"; branchId: string })
  | (BaseCreateFields & { role: "TUTOR"; branchId: string; education: string; contactNumber: string; address: string })
  | (BaseCreateFields & { role: "PARENT"; branchId: string; contactNumber: string; address: string })
  | (BaseCreateFields & { role: "STUDENT"; parentId: string; studentClass: string; board: "STATE" | "CBSE" | "ICSE" | "OTHER" });

export interface CreateUserCredentials {
  username: string;
  email: string;
  tempPassword: string | null;
  wasGenerated: boolean;
  passwordSkipped: boolean;
}

export interface CreateUserResponse {
  user: { id: string; role: Role };
  credentials: CreateUserCredentials;
}
