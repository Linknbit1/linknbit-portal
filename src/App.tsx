import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ClientShell } from './components/layout/ClientShell'

import LoginPage from './pages/auth/LoginPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import ProjectsPage from './pages/admin/ProjectsPage'
import ProjectDetailPage from './pages/admin/ProjectDetailPage'
import GamificationPage from './pages/admin/GamificationPage'
import PlaceholderPage from './pages/admin/PlaceholderPage'
import EmployeeDashboardPage from './pages/employee/DashboardPage'
import ClientDashboardPage from './pages/client/DashboardPage'

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
          <Route path="/admin/projects" element={<ProjectsPage />} />
          <Route path="/admin/projects/:id" element={<ProjectDetailPage />} />
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
          <Route path="/client/projects" element={<ClientDashboardPage />} />
          <Route path="/client/approvals" element={<ClientDashboardPage />} />
          <Route path="/client/files" element={<ClientDashboardPage />} />
          <Route path="/client/reports" element={<ClientDashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
