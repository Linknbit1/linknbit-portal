import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

export const MGMT_ROLES        = ['super_admin', 'admin', 'hr'] as const
export const SETTINGS_ROLES    = ['super_admin', 'admin'] as const
export const ATTENDANCE_ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'project_manager'] as const

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="size-8 animate-spin rounded-full border-2 border-surface-2 border-t-brand-red" />
    </div>
  )
}

interface RoleGuardProps {
  allowedRoles: readonly string[]
  children: ReactNode
  redirectTo?: string
}

export function RoleGuard({ allowedRoles, children, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuthContext()
  if (loading) return <Spinner />
  if (!profile) return <Navigate to="/login" replace />
  if (!(allowedRoles as string[]).includes(profile.role)) {
    const fallback =
      redirectTo ??
      (['employee', 'team_lead'].includes(profile.role)
        ? '/employee/dashboard'
        : '/admin/dashboard')
    return <Navigate to={fallback} replace />
  }
  return <>{children}</>
}
