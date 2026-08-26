import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { useFeatureAccess } from '../../hooks/useRoleFlags'

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="size-8 animate-spin rounded-full border-2 border-surface-2 border-t-brand-red" />
    </div>
  )
}

interface RoleGuardProps {
  /** Static role allowlist. Optional when `feature` is supplied. */
  allowedRoles?: readonly string[]
  /**
   * Capability required to view this route. Mirrors the nav's `feature` key and the
   * SQL `has_feature()` check, so a hidden nav item cannot be reached by URL.
   */
  feature?: string
  children: ReactNode
  redirectTo?: string
}

export function RoleGuard({ allowedRoles, feature, children, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuthContext()
  // Always called (hooks can't be conditional); ignored when `feature` is absent.
  const access = useFeatureAccess(feature ?? '__none__')

  if (loading) return <Spinner />
  if (!profile) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo ?? '/my-day'} replace />
  }

  if (feature) {
    // Wait for the flag matrix rather than bouncing — redirecting mid-load would
    // eject a user who actually has the capability.
    if (access.isLoading) return <Spinner />
    if (!access.allowed) return <Navigate to={redirectTo ?? '/my-day'} replace />
  }

  return <>{children}</>
}
