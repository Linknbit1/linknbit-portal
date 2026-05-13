import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'

import LoginPage from './pages/auth/LoginPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminProjectsPage from './pages/admin/ProjectsPage'
import AdminProjectDetailPage from './pages/admin/ProjectDetailPage'
import GamificationPage from './pages/admin/GamificationPage'
import PlaceholderPage from './pages/admin/PlaceholderPage'
import EmployeeDashboardPage from './pages/employee/DashboardPage'

import ClientProjectsPage from './pages/client/ProjectsPage'
import ClientProjectDetailPage from './pages/client/ProjectDetailPage'
import ClientApprovalsPage from './pages/client/ApprovalsPage'
import ClientFilesPage from './pages/client/FilesPage'
import ClientReportsPage from './pages/client/ReportsPage'

function AdminPlaceholder({ title }: { title: string }) {
  return <PlaceholderPage title={title} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Internal portal (dark mode) */}
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/projects" element={<AdminProjectsPage />} />
          <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
          <Route path="/admin/clients" element={<AdminPlaceholder title="Clients" />} />
          <Route path="/admin/teams" element={<AdminPlaceholder title="Teams" />} />
          <Route path="/admin/tasks" element={<AdminPlaceholder title="Tasks" />} />
          <Route path="/admin/reports" element={<AdminPlaceholder title="Reports & Analytics" />} />
          <Route path="/admin/gamification" element={<GamificationPage />} />
          <Route path="/admin/clickup" element={<AdminPlaceholder title="ClickUp Integration" />} />
          <Route path="/admin/settings" element={<AdminPlaceholder title="Settings" />} />

          {/* Employee portal */}
          <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
          <Route path="/employee/tasks" element={<AdminPlaceholder title="My Tasks" />} />
          <Route path="/employee/projects" element={<AdminPlaceholder title="My Projects" />} />
          <Route path="/employee/leaderboard" element={<GamificationPage />} />
          <Route path="/employee/rewards" element={<GamificationPage />} />
        </Route>

        {/* Client portal (light mode) */}
        <Route element={<ClientShell />}>
          <Route path="/client" element={<Navigate to="/client/projects" replace />} />
          <Route path="/client/projects" element={<ClientProjectsPage />} />
          <Route path="/client/projects/:id" element={<ClientProjectDetailPage />} />
          <Route path="/client/approvals" element={<ClientApprovalsPage />} />
          <Route path="/client/files" element={<ClientFilesPage />} />
          <Route path="/client/reports" element={<ClientReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
