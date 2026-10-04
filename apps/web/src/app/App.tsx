import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/authStore";
import { ROLE_HOME_PATH } from "@/features/auth/types";
import { LoginPage } from "@/features/auth/LoginPage";
import { GoogleCompletePage } from "@/features/auth/GoogleCompletePage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { RulesGate } from "@/features/auth/RulesGate";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { RoleDashboard } from "@/pages/RoleDashboard";
import { HomePage } from "@/features/public-site/HomePage";
import { ParentDashboardPage } from "@/features/parent-dashboard/ParentDashboardPage";
import { ParentAttendancePage } from "@/features/parent-attendance/ParentAttendancePage";
import { ParentPerformancePage } from "@/features/parent-performance/ParentPerformancePage";
import { ParentFeesPage } from "@/features/parent-fees/ParentFeesPage";
import { ParentTimetablePage } from "@/features/parent-timetable/ParentTimetablePage";
import { ParentMaterialsPage } from "@/features/parent-materials/ParentMaterialsPage";
import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";
import { AnnouncementsAdminPage } from "@/features/announcements/AnnouncementsAdminPage";
import { UnauthorizedPage, NotFoundPage } from "@/pages/StatusPages";
import { Spinner, Toaster } from "@/components/ui";
import { AdminDashboardPage } from "@/features/dashboard/AdminDashboardPage";
import { BranchDashboardPage } from "@/features/dashboard/BranchDashboardPage";
import { BranchProfilePage } from "@/features/dashboard/BranchProfilePage";
import { BranchListPage } from "@/features/branches/BranchListPage";
import { BranchDetailPage } from "@/features/branches/BranchDetailPage";
import { UsersPage } from "@/features/users/UsersPage";
import { RateCardsPage } from "@/features/fees/RateCardsPage";
import { MasterDataPage } from "@/features/master-data/MasterDataPage";
import { TasksPage } from "@/features/tasks/TasksPage";
import { BranchTasksPage } from "@/features/tasks/BranchTasksPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { BranchReportsPage } from "@/features/reports/BranchReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { EnquiriesPage } from "@/features/enquiries/EnquiriesPage";
import { RegistrationPage } from "@/features/registration/RegistrationPage";
import { AssignTutorPage } from "@/features/assignments/AssignTutorPage";
import { AttendancePage } from "@/features/attendance/AttendancePage";
import { FeesPage } from "@/features/fees/FeesPage";
import { AccountsPage } from "@/features/expenses/AccountsPage";
import { BranchAttendancePage } from "@/features/staff-attendance/BranchAttendancePage";
import { TutorDashboardPage } from "@/features/tutor-dashboard/TutorDashboardPage";
import { MyStudentsPage } from "@/features/my-students/MyStudentsPage";
import { TestsPage } from "@/features/tests/TestsPage";
import { MaterialsPage } from "@/features/materials/MaterialsPage";
import { TimetablePage } from "@/features/timetable/TimetablePage";
import { TutorReportsPage } from "@/features/tutor-reports/TutorReportsPage";
import { EarningsPage } from "@/features/earnings/EarningsPage";
import { ReferralsPage } from "@/features/referrals/ReferralsPage";
import { ReferTutorPage } from "@/features/referrals/ReferTutorPage";
import { ReferParentPage } from "@/features/referrals/ReferParentPage";
import { ParentQueriesPage } from "@/features/parent-queries/ParentQueriesPage";
import { QueriesInboxPage } from "@/features/parent-queries/QueriesInboxPage";
import { ADMIN_NAV, TUTOR_NAV } from "./navConfig";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/**
 * "/" is the public marketing home page (enquiry forms, contact info) when
 * signed out — NOT an automatic redirect to /login — but a signed-in user
 * landing here still goes straight to their own dashboard, never the
 * marketing page.
 */
function RootRedirect() {
  const { user, status } = useAuthStore();
  if (status === "idle" || status === "loading") {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <HomePage />;
  return <Navigate to={ROLE_HOME_PATH[user.role]} replace />;
}

export function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
          <Route
            path="/reset-password"
            element={
              <ProtectedRoute>
                <ResetPasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={["SUPER_ADMIN"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="branches" element={<BranchListPage />} />
            <Route path="branches/:branchId" element={<BranchDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="rate-cards" element={<RateCardsPage />} />
            <Route path="fees" element={<FeesPage nav={ADMIN_NAV} />} />
            <Route path="expenses" element={<AccountsPage nav={ADMIN_NAV} />} />
            <Route path="master-data" element={<MasterDataPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="announcements" element={<AnnouncementsAdminPage />} />
            <Route path="queries" element={<QueriesInboxPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Branch Admin (office assistant) */}
          <Route
            path="/branch"
            element={
              <ProtectedRoute allow={["BRANCH_ADMIN"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<BranchDashboardPage />} />
            <Route path="profile" element={<BranchProfilePage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="registration" element={<RegistrationPage />} />
            <Route path="assign-tutor" element={<AssignTutorPage />} />
            <Route path="attendance" element={<AttendancePage title="Class Attendance" />} />
            <Route path="my-attendance" element={<BranchAttendancePage />} />
            <Route path="tasks" element={<BranchTasksPage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="reports" element={<BranchReportsPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="announcements" element={<AnnouncementsAdminPage />} />
            <Route path="queries" element={<QueriesInboxPage />} />
          </Route>

          {/* Tutor */}
          <Route
            path="/tutor"
            element={
              <ProtectedRoute allow={["TUTOR"]}>
                <RulesGate>
                  <Outlet />
                </RulesGate>
              </ProtectedRoute>
            }
          >
            <Route index element={<TutorDashboardPage />} />
            <Route path="students" element={<MyStudentsPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="attendance" element={<AttendancePage nav={TUTOR_NAV} showTutorColumn={false} allowTutorMark />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="reports" element={<TutorReportsPage />} />
            <Route path="referrals" element={<ReferralsPage />} />
            <Route path="refer-tutor" element={<ReferTutorPage />} />
          </Route>
          {/* Parent */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allow={["PARENT"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParentDashboardPage />} />
            <Route path="attendance" element={<ParentAttendancePage />} />
            <Route path="performance" element={<ParentPerformancePage />} />
            <Route path="fees" element={<ParentFeesPage />} />
            <Route path="timetable" element={<ParentTimetablePage />} />
            <Route path="materials" element={<ParentMaterialsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="refer" element={<ReferParentPage />} />
            <Route path="queries" element={<ParentQueriesPage />} />
          </Route>
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allow={["STUDENT"]}>
                <RoleDashboard
                  heading="Student"
                  upcomingModules={["Timetable", "Assignments", "Test results", "Study materials"]}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
