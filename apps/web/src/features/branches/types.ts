export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  adminName: string;
  password?: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface AdminCredentials {
  username: string;
  email: string;
  tempPassword: string | null;
  wasGenerated: boolean;
  passwordSkipped: boolean;
}

export interface CreateBranchResponse {
  branch: Branch;
  adminCredentials: AdminCredentials;
}

/** Live-computed dashboard tile numbers for one branch — see branch.service.ts getStats. */
export interface BranchStats {
  pendingEnquiries: number;
  pendingTutorEnquiries: number;
  pendingParentEnquiries: number;
  registeredTutors: number;
  registeredStudents: number;
  runningClasses: number;
}

/** Org-wide Super Admin dashboard numbers — see branch.service.ts getOrgSummary. */
export interface BranchEnquirySummaryRow {
  branchId: string;
  branchName: string;
  tutorEnquiries: number;
  parentEnquiries: number;
  totalEnquiries: number;
  registeredTutors: number;
  registeredStudents: number;
  totalEnrolled: number;
}

export interface OrgSummary {
  totals: {
    registeredTutors: number;
    registeredStudents: number;
    totalEnquiries: number;
    totalEnrolled: number;
  };
  branches: BranchEnquirySummaryRow[];
}
