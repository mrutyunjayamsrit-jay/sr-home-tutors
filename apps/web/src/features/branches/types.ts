export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
  latitude?: number;
  longitude?: number;
  contactEmail: string;
  contactPhone?: string;
  adminName: string;
  password?: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
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
  /** Currently outstanding (not a date-range window) — see branch.service.ts getStats. */
  outstandingFeesAmount: number;
  outstandingInvoiceCount: number;
}

/** One IST calendar day's distinct present counts — see branch.service.ts getAttendanceTrend. */
export interface AttendanceTrendPoint {
  date: string;
  tutorsPresent: number;
  studentsPresent: number;
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
