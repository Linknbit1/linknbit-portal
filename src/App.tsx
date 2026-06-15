import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute } from './components/layout/PrivateRoute'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'
import { showWipFeatures } from './lib/featureFlags'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminProjectsPage from './pages/admin/ProjectsPage'
import AdminProjectDetailPage from './pages/admin/ProjectDetailPage'
import AdminTaskDetailPage from './pages/admin/TaskDetailPage'
import GamificationPage from './pages/admin/GamificationPage'
import ClientsPage from './pages/admin/ClientsPage'
import TeamsPage from './pages/admin/TeamsPage'
import PeoplePage from './pages/admin/PeoplePage'
import TasksPage from './pages/admin/TasksPage'
import ReportsPage from './pages/admin/ReportsPage'
import ClickUpPage from './pages/admin/ClickUpPage'
import SettingsPage from './pages/admin/SettingsPage'
import AttendancePage from './pages/AttendancePage'
import EmployeeDashboardPage from './pages/employee/DashboardPage'

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
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Internal portal (dark mode) */}
              <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/teams" element={<TeamsPage />} />
                <Route path="/admin/people" element={<PeoplePage />} />
                <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} />
                <Route path="/admin/settings" element={<SettingsPage />} />

                {/* Work-in-progress modules — only routable in development builds */}
                {showWipFeatures && (
                  <>
                    <Route path="/admin/projects" element={<AdminProjectsPage />} />
                    <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
                    <Route path="/admin/tasks/:id" element={<AdminTaskDetailPage />} />
                    <Route path="/admin/tasks" element={<TasksPage />} />
                    <Route path="/admin/clients" element={<ClientsPage />} />
                    <Route path="/admin/reports" element={<ReportsPage />} />
                    <Route path="/admin/clickup" element={<ClickUpPage />} />
                    <Route path="/employee/tasks" element={<TasksPage />} />
                    <Route path="/employee/projects" element={<AdminProjectsPage />} />
                  </>
                )}

                {/* Employee portal */}
                <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
                <Route path="/employee/attendance" element={<Navigate to="/attendance" replace />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/employee/leaderboard" element={<GamificationPage />} />
                <Route path="/employee/rewards" element={<GamificationPage />} />
              </Route>

              {/* Client portal (light mode) */}
              <Route element={<PrivateRoute><ClientShell /></PrivateRoute>}>
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

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
