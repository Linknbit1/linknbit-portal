import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute, HomeRedirect } from './components/layout/PrivateRoute'
import { RoleGuard } from './components/layout/RoleGuard'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import MyDayPage from './pages/MyDayPage'
import ProfilePage from './pages/ProfilePage'
import MemberProfilePage from './pages/MemberProfilePage'
import MorePage from './pages/MorePage'
import NotificationsPage from './pages/NotificationsPage'
import ChatPage from './pages/ChatPage'
import StandupPage from './pages/StandupPage'
import StickyNotesPage from './pages/StickyNotesPage'
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
import TeamDetailPage from './pages/admin/TeamDetailPage'
import PeoplePage from './pages/admin/PeoplePage'
import TasksPage from './pages/admin/TasksPage'
import ReportsPage from './pages/admin/ReportsPage'
import TimesheetPage from './pages/admin/TimesheetPage'
import ProjectBacklogDetailPage, { EmployeeBacklogDetailPage } from './pages/admin/BacklogDetailPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import AdminConsolePage, { AdminConsoleSectionScreen } from './pages/admin/AdminConsolePage'
import SettingsPage, { SettingsSectionScreen } from './pages/admin/SettingsPage'
import AttendancePage from './pages/AttendancePage'
import MyMeetingsPage from './pages/MyMeetingsPage'
import BdLayout from './pages/bd/BdLayout'
import BdSectionScreen from './pages/bd/BdSectionScreen'
import BdProjectDetailPage from './pages/bd/BdProjectDetailPage'
import DocumentationPage from './pages/docs/DocumentationPage'
import ChangelogPage from './pages/docs/ChangelogPage'

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

/**
 * Keeps a deep link to a moved screen working, id and query string intact.
 * `<Navigate>` alone cannot do this: the id is a route param, not part of a
 * fixed path, and a bookmarked task or project is exactly the link people have.
 */
function LegacyAdminRedirect({ to }: { to: string }) {
  const { id } = useParams()
  const { search } = useLocation()
  return <Navigate to={`${to}/${id ?? ''}${search}`} replace />
}

/** The reports tree keeps its own sub-paths (project/:id, employee/:id). */
function LegacyReportsRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={pathname.replace('/admin/reports', '/reports') + search} replace />
}

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
                <Route path="/my-day" element={<MyDayPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Public (to all internal staff) member profile — tiered sections gated by role/RLS */}
                <Route path="/members/:id" element={<RoleGuard audience="internal"><MemberProfilePage /></RoleGuard>} />
                <Route path="/more" element={<MorePage />} />
                {/* Handbook + changelog. Inside PrivateRoute, so both are staff-only;
                    the handbook filters its own chapters by role and capability. */}
                <Route path="/docs" element={<DocumentationPage />} />
                <Route path="/docs/changelog" element={<ChangelogPage />} />
                {/* Notifications and the "waiting on you" queue, in one place. */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:channelId" element={<ChatPage />} />
                {/* Same capability key as the nav item, so the URL can't bypass it. */}
                <Route
                  path="/notes"
                  element={<RoleGuard feature="can_use_sticky_notes"><StickyNotesPage /></RoleGuard>}
                />
                <Route path="/standup" element={<StandupPage />} />
                {/* Team board: reviewers only. RLS scopes leads/PMs to their own team. */}
                <Route
                  path="/standup/team"
                  element={<RoleGuard feature={['can_view_standups', 'can_view_team_standups']}><StandupTeamPage /></RoleGuard>}
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
                {/* Renamed: the section grants XP and decides who takes part, so it
                    was never "settings". Old links keep working. */}
                <Route path="/gamification/admin" element={<Navigate to="/gamification/governance" replace />} />
                <Route path="/gamification/:section" element={<GamificationSectionScreen />} />
                <Route
                  path="/settings"
                  element={<RoleGuard audience="internal"><SettingsPage /></RoleGuard>}
                />
                <Route
                  path="/settings/:section"
                  element={<RoleGuard audience="internal"><SettingsSectionScreen /></RoleGuard>}
                />

                {/* Directory — readable by all internal staff; actions gated in-page */}
                <Route
                  path="/people"
                  element={<RoleGuard audience="internal"><PeoplePage /></RoleGuard>}
                />
                <Route
                  path="/teams"
                  element={<RoleGuard audience="internal"><TeamsPage /></RoleGuard>}
                />
                {/* Single team — roster is open to all internal staff; the
                    attendance and template tabs gate themselves in-page. */}
                <Route
                  path="/teams/:id"
                  element={<RoleGuard audience="internal"><TeamDetailPage /></RoleGuard>}
                />

                {/* Projects, Tasks & Clients — live for internal staff (RLS scopes data) */}
                <Route path="/projects" element={<RoleGuard audience="internal"><AdminProjectsPage /></RoleGuard>} />
                <Route path="/projects/:id" element={<RoleGuard audience="internal"><AdminProjectDetailPage /></RoleGuard>} />
                <Route path="/tasks" element={<RoleGuard audience="internal"><TasksPage /></RoleGuard>} />
                <Route path="/tasks/:id" element={<RoleGuard audience="internal"><AdminTaskDetailPage /></RoleGuard>} />
                <Route path="/clients" element={<RoleGuard feature="can_manage_clients"><ClientsPage /></RoleGuard>} />
                <Route path="/admin/audit" element={<RoleGuard feature="can_view_audit_log"><AuditLogPage /></RoleGuard>} />

                {/* Projects, tasks, clients and reports used to live under /admin,
                    which said they were governance when they are the day job.
                    These keep every link that is already out there working, and
                    must sit above /admin/:section or the catch-all swallows them. */}
                <Route path="/admin/projects" element={<Navigate to="/projects" replace />} />
                <Route path="/admin/projects/:id" element={<LegacyAdminRedirect to="/projects" />} />
                <Route path="/admin/tasks" element={<Navigate to="/tasks" replace />} />
                <Route path="/admin/tasks/:id" element={<LegacyAdminRedirect to="/tasks" />} />
                <Route path="/admin/clients" element={<Navigate to="/clients" replace />} />
                <Route path="/admin/reports/*" element={<LegacyReportsRedirect />} />
                <Route path="/admin/reports" element={<Navigate to="/reports" replace />} />

                {/* The console lives at /admin itself. React Router ranks static
                    segments above dynamic ones, so the redirects above still win
                    over /admin/:section — which only ever resolves the console's
                    own keys and redirects otherwise. */}
                <Route path="/admin" element={<AdminConsolePage />} />
                <Route path="/admin/console" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/:section" element={<AdminConsoleSectionScreen />} />

                {/* Backlog reporting and the timesheet. Out of the WIP gate now
                    that both read real timer and standup data rather than the
                    mock arrays the prototype shipped with. Row-level scoping
                    lives in the RPCs: leads and PMs see their own team,
                    management sees everyone, an employee sees themselves. */}
                <Route path="/reports" element={<RoleGuard feature="can_view_reports"><ReportsPage /></RoleGuard>} />
                {/* One project / one person in full. Both read the same scoped
                    RPCs as the summary tables, so a URL cannot widen access. */}
                <Route path="/reports/project/:id" element={<RoleGuard feature="can_view_reports"><ProjectBacklogDetailPage /></RoleGuard>} />
                <Route path="/reports/employee/:id" element={<RoleGuard feature="can_view_reports"><EmployeeBacklogDetailPage /></RoleGuard>} />
                <Route path="/timesheet" element={<RoleGuard feature="can_view_reports"><TimesheetPage /></RoleGuard>} />
                {/* Your own client meetings. Open to all internal staff and not
                    behind the BD guard on purpose: an invitee holds no
                    can_view_bd, and an invitation you cannot see is none. The
                    page reads a scoped RPC, so it shows the viewer's schedule
                    and nothing else about the pipeline. */}
                <Route
                  path="/my-meetings"
                  element={<RoleGuard audience="internal"><MyMeetingsPage /></RoleGuard>}
                />
                {/* Business Development. Guarded by the same capability as the
                    sidebar row, so the URL can no more be reached without it
                    than the row can be seen. */}
                <Route path="/bd" element={<RoleGuard feature="can_view_bd"><BdLayout /></RoleGuard>}>
                  <Route index element={<Navigate to="/bd/pipeline" replace />} />
                  {/* Before the :section catch-all, or "projects" would swallow it. */}
                  <Route path="projects/:id" element={<BdProjectDetailPage />} />
                  <Route path=":section" element={<BdSectionScreen />} />
                </Route>

                {/* Legacy path redirects */}
                <Route path="/dashboard" element={<Navigate to="/my-day" replace />} />
                <Route path="/admin/dashboard" element={<Navigate to="/my-day" replace />} />
                <Route path="/employee/dashboard" element={<Navigate to="/my-day" replace />} />
                <Route path="/inbox" element={<Navigate to="/notifications" replace />} />
                <Route path="/admin/people" element={<Navigate to="/people" replace />} />
                <Route path="/admin/teams" element={<Navigate to="/teams" replace />} />
                <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
                <Route path="/admin/gamification" element={<Navigate to="/gamification" replace />} />
                <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} />
                <Route path="/employee/attendance" element={<Navigate to="/attendance" replace />} />
              </Route>

              {/* Client portal (light mode) */}
              <Route element={<PrivateRoute><RoleGuard audience="client" redirectTo="/my-day"><ClientShell /></RoleGuard></PrivateRoute>}>
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
