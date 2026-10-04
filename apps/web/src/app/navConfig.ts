import type { NavItem } from "./AppShell";

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Branches", to: "/admin/branches" },
  { label: "Users & Roles", to: "/admin/users" },
  { label: "Fee Rate Cards", to: "/admin/rate-cards" },
  { label: "Fees", to: "/admin/fees" },
  { label: "Expenses", to: "/admin/expenses" },
  { label: "Subjects & Areas", to: "/admin/master-data" },
  { label: "Tasks", to: "/admin/tasks" },
  { label: "Announcements", to: "/admin/announcements" },
  { label: "Parent Queries", to: "/admin/queries" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Settings", to: "/admin/settings" },
];

// Mirrors the PDF's branch-login structure (Enquiries, Registration, Assign
// Tutor, Fees, Report, Accounts) — see docs/ARCHITECTURE.md.
export const BRANCH_NAV: NavItem[] = [
  { label: "Dashboard", to: "/branch", end: true },
  { label: "Enquiries", to: "/branch/enquiries" },
  { label: "Registration", to: "/branch/registration" },
  { label: "Assign Tutor", to: "/branch/assign-tutor" },
  { label: "Class Attendance", to: "/branch/attendance" },
  { label: "My Attendance", to: "/branch/my-attendance" },
  { label: "Tasks", to: "/branch/tasks" },
  { label: "Fees", to: "/branch/fees" },
  { label: "Reports", to: "/branch/reports" },
  { label: "Accounts", to: "/branch/accounts" },
  { label: "Announcements", to: "/branch/announcements" },
  { label: "Parent Queries", to: "/branch/queries" },
  { label: "Branch Profile", to: "/branch/profile" },
];

// Mirrors the source spec's tutor-login structure (assigned students,
// tests, attendance) plus everything a tutor needs to be self-sufficient
// day to day — see docs/ARCHITECTURE.md.
export const TUTOR_NAV: NavItem[] = [
  { label: "Dashboard", to: "/tutor", end: true },
  { label: "My Students", to: "/tutor/students" },
  { label: "Timetable", to: "/tutor/timetable" },
  { label: "Attendance", to: "/tutor/attendance" },
  { label: "Tests & Marks", to: "/tutor/tests" },
  { label: "Study Materials", to: "/tutor/materials" },
  { label: "Earnings", to: "/tutor/earnings" },
  { label: "Reports", to: "/tutor/reports" },
  { label: "Refer a Student", to: "/tutor/referrals" },
  { label: "Refer a Tutor", to: "/tutor/refer-tutor" },
];

// Warm, read-only parent portal — everything a parent needs to follow their
// child's progress without ever needing to call the office.
export const PARENT_NAV: NavItem[] = [
  { label: "Dashboard", to: "/parent", end: true },
  { label: "Attendance", to: "/parent/attendance" },
  { label: "Performance", to: "/parent/performance" },
  { label: "Fees", to: "/parent/fees" },
  { label: "Timetable", to: "/parent/timetable" },
  { label: "Study Materials", to: "/parent/materials" },
  { label: "Announcements", to: "/parent/announcements" },
  { label: "Refer a Parent", to: "/parent/refer" },
  { label: "Ask a Question", to: "/parent/queries" },
];
