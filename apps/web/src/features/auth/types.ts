export type Role = "SUPER_ADMIN" | "BRANCH_ADMIN" | "TUTOR" | "PARENT" | "STUDENT";

export interface AuthUser {
  id: string;
  role: Role;
  branchId: string | null;
  name: string | null;
  email: string | null;
  username: string | null;
  status: "PENDING_ACTIVATION" | "ACTIVE" | "DISABLED";
  mustResetPassword: boolean;
  lastLoginAt: string | null;
  tutorProfile: { id: string } | null;
  parentProfile: { id: string } | null;
  studentProfile: { id: string } | null;
}

export const ROLE_HOME_PATH: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  BRANCH_ADMIN: "/branch",
  TUTOR: "/tutor",
  PARENT: "/parent",
  STUDENT: "/student",
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  BRANCH_ADMIN: "Branch Office",
  TUTOR: "Tutor",
  PARENT: "Parent",
  STUDENT: "Student",
};
