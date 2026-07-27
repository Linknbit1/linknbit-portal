import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute, HomeRedirect } from './components/layout/PrivateRoute'
import { RoleGuard } from './components/layout/RoleGuard'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'
import { showWipFeatures } from './lib/featureFlags'
import { SETTINGS_ROLES, CLIENT_ROLES, STANDUP_REVIEW_ROLES } from './constants/roles'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import MemberProfilePage from './pages/MemberProfilePage'
import MorePage from './pages/MorePage'
import NotificationsPage from './pages/NotificationsPage'
import InboxPage from './pages/InboxPage'
import ChatPage from './pages/ChatPage'
import StandupPage from './pages/StandupPage'
import StandupTeamPage from './pages/StandupTeamPage'
import StandupHistoryPage from './pages/StandupHistoryPage'
import StandupSettingsPage from './pages/StandupSettingsPage'
import { AttendanceSectionScreen, TeamAttendanceSectionScreen } from './pages/AttendanceMobile'
import { GamificationSectionScreen } from './pages/admin/GamificationPage'
import AdminProjectsPage from './pages/admin/ProjectsPage'
import AdminProjectDetailPage from './pages/admin/ProjectDetailPage'
import AdminTaskDetailPage from './pages/admin/TaskDetailPage'
import ClientsPage from './pages/admin/ClientsPage'
import TeamsPage from './pages/admin/TeamsPage'
import PeoplePage from './pages/admin/PeoplePage'
import TasksPage from './pages/admin/TasksPage'
import ReportsPage from './pages/admin/ReportsPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import SettingsPage, { SettingsSectionScreen } from './pages/admin/SettingsPage'
import AttendancePage from './pages/AttendancePage'

import ClientDashboardPage from './pages/client/DashboardPage'
import ClientProjectsPage from './pages/client/ProjectsPage'
import ClientProjectDetailPage from './pages/client/ProjectDetailPage'
import ClientApprovalsPage from './pages/client/ApprovalsPage'
import ClientFilesPage from './pages/client/FilesPage'
import ClientReportsPage from './pages/client/ReportsPage'
import ClientAccountPage from './pages/client/AccountPage'
import ClientSettingsPage from './pages/client/SettingsPage'
import ClientHelpPage from './pages/client/HelpPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Internal portal (dark mode) */}
              <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Public (to all internal staff) member profile — tiered sections gated by role/RLS */}
                <Route path="/members/:id" element={<RoleGuard allowedRoles={SETTINGS_ROLES}><MemberProfilePage /></RoleGuard>} />
                <Route path="/more" element={<MorePage />} />
                {/* Mobile-only list; redirects to /dashboard on desktop (bell dropdown). */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:channelId" element={<ChatPage />} />
                <Route path="/standup" element={<StandupPage />} />
                {/* Team board: reviewers only. RLS scopes leads/PMs to their own team. */}
                <Route
                  path="/standup/team"
                  element={<RoleGuard allowedRoles={STANDUP_REVIEW_ROLES}><StandupTeamPage /></RoleGuard>}
                />
                <Route path="/standup/history" element={<StandupHistoryPage />} />
                <Route
                  path="/standup/settings"
                  element={<RoleGuard feature="can_manage_standups"><StandupSettingsPage /></RoleGuard>}
                />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/attendance/team/:sub" element={<TeamAttendanceSectionScreen />} />
                <Route path="/attendance/:section" element={<AttendanceSectionScreen />} />
                {/* No combined Gamification page — land on the first sub-page. */}
                <Route path="/gamification" element={<Navigate to="/gamification/leaderboard" replace />} />
                <Route path="/gamification/:section" element={<GamificationSectionScreen />} />
                <Route
                  path="/settings"
                  element={<RoleGuard allowedRoles={SETTINGS_ROLES}><SettingsPage /></RoleGuard>}
                />
                <Route
                  path="/settings/:section"
                  element={<RoleGuard allowedRoles={SETTINGS_ROLES}><SettingsSectionScreen /></RoleGuard>}
                />

                {/* Directory — readable by all internal staff; actions gated in-page */}
                <Route
                  path="/people"
                  element={<RoleGuard allowedRoles={SETTINGS_ROLES}><PeoplePage /></RoleGuard>}
                />
                <Route
                  path="/teams"
                  element={<RoleGuard allowedRoles={SETTINGS_ROLES}><TeamsPage /></RoleGuard>}
                />

                {/* Projects, Tasks & Clients — live for internal staff (RLS scopes data) */}
                <Route path="/admin/projects" element={<RoleGuard allowedRoles={SETTINGS_ROLES}><AdminProjectsPage /></RoleGuard>} />
                <Route path="/admin/projects/:id" element={<RoleGuard allowedRoles={SETTINGS_ROLES}><AdminProjectDetailPage /></RoleGuard>} />
                <Route path="/admin/tasks" element={<RoleGuard allowedRoles={SETTINGS_ROLES}><TasksPage /></RoleGuard>} />
                <Route path="/admin/tasks/:id" element={<RoleGuard allowedRoles={SETTINGS_ROLES}><AdminTaskDetailPage /></RoleGuard>} />
                <Route path="/admin/clients" element={<RoleGuard feature="can_manage_clients"><ClientsPage /></RoleGuard>} />
                <Route path="/admin/audit" element={<RoleGuard feature="can_view_audit_log"><AuditLogPage /></RoleGuard>} />

                {/* Still work-in-progress — only routable in development builds */}
                {showWipFeatures && (
                  <Route path="/admin/reports" element={<RoleGuard feature="can_view_reports"><ReportsPage /></RoleGuard>} />
                )}

                {/* Legacy path redirects */}
                <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/employee/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/admin/people" element={<Navigate to="/people" replace />} />
                <Route path="/admin/teams" element={<Navigate to="/teams" replace />} />
                <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
                <Route path="/admin/gamification" element={<Navigate to="/gamification" replace />} />
                <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} />
                <Route path="/employee/attendance" element={<Navigate to="/attendance" replace />} />
              </Route>

              {/* Client portal (light mode) */}
              <Route element={<PrivateRoute><RoleGuard allowedRoles={CLIENT_ROLES} redirectTo="/dashboard"><ClientShell /></RoleGuard></PrivateRoute>}>
                <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/client/dashboard" element={<ClientDashboardPage />} />
                <Route path="/client/projects" element={<ClientProjectsPage />} />
                <Route path="/client/projects/:id" element={<ClientProjectDetailPage />} />
                <Route path="/client/approvals" element={<ClientApprovalsPage />} />
                <Route path="/client/files" element={<ClientFilesPage />} />
                <Route path="/client/reports" element={<ClientReportsPage />} />
                <Route path="/client/account" element={<ClientAccountPage />} />
                <Route path="/client/settings" element={<ClientSettingsPage />} />
                <Route path="/client/help" element={<ClientHelpPage />} />
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
