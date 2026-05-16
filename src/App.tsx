import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'

import LoginPage from './pages/auth/LoginPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminProjectsPage from './pages/admin/ProjectsPage'
import AdminProjectDetailPage from './pages/admin/ProjectDetailPage'
import AdminTaskDetailPage from './pages/admin/TaskDetailPage'
import GamificationPage from './pages/admin/GamificationPage'
import ClientsPage from './pages/admin/ClientsPage'
import TeamsPage from './pages/admin/TeamsPage'
import TasksPage from './pages/admin/TasksPage'
import ReportsPage from './pages/admin/ReportsPage'
import ClickUpPage from './pages/admin/ClickUpPage'
import SettingsPage from './pages/admin/SettingsPage'
import AttendancePage from './pages/admin/AttendancePage'
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

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Internal portal (dark mode) */}
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/projects" element={<AdminProjectsPage />} />
            <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
            <Route path="/admin/tasks/:id" element={<AdminTaskDetailPage />} />
            <Route path="/admin/tasks" element={<TasksPage />} />
            <Route path="/admin/clients" element={<ClientsPage />} />
            <Route path="/admin/teams" element={<TeamsPage />} />
            <Route path="/admin/attendance" element={<AttendancePage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/gamification" element={<GamificationPage />} />
            <Route path="/admin/clickup" element={<ClickUpPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />

            {/* Employee portal */}
            <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
            <Route path="/employee/tasks" element={<TasksPage />} />
            <Route path="/employee/projects" element={<AdminProjectsPage />} />
            <Route path="/employee/leaderboard" element={<GamificationPage />} />
            <Route path="/employee/rewards" element={<GamificationPage />} />
          </Route>

          {/* Client portal (light mode) */}
          <Route element={<ClientShell />}>
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
      </BrowserRouter>
    </ToastProvider>
  )
}
