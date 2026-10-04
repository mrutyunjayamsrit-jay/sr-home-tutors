export type StaffAttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";

export interface StaffAttendanceRecord {
  id: string;
  branchId: string;
  staffUserId: string;
  date: string;
  loginAt: string | null;
  logoutAt: string | null;
  status: StaffAttendanceStatus;
  payableAmount: number | null;
  createdAt: string;
}

export interface BranchOverviewAdmin {
  id: string;
  name: string | null;
  email: string | null;
  loginAt: string | null;
  logoutAt: string | null;
  status: StaffAttendanceStatus | null;
}

export interface BranchOverviewRow {
  branchId: string;
  branchName: string;
  date: string;
  admins: BranchOverviewAdmin[];
  marked: boolean;
}
