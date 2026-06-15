import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

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
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo ?? '/dashboard'} replace />
  }
  return <>{children}</>
}
