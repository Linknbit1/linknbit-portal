import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { useAnyFeatureAccess } from '../../hooks/useRoleFlags'
import { isClientRole } from '../../lib/roles'

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="size-8 animate-spin rounded-full border-2 border-surface-2 border-t-brand-red" />
    </div>
  )
}

interface RoleGuardProps {
  /**
   * Which side of the client/staff line this route belongs to. That boundary is
   * not a capability — it is what the whole permission system sits inside — so
   * it is the one thing here still expressed in terms of who somebody is.
   */
  audience?: 'internal' | 'client'
  /**
   * Capability required to view this route. Mirrors the nav's `feature` key and
   * the SQL `has_feature()` check, so a hidden nav item cannot be reached by
   * URL. An array means any one of them is enough.
   */
  feature?: string | readonly string[]
  children: ReactNode
  redirectTo?: string
}

export function RoleGuard({ audience, feature, children, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuthContext()
  // Always called (hooks can't be conditional); ignored when `feature` is absent.
  const keys = feature === undefined ? ['__none__'] : typeof feature === 'string' ? [feature] : feature
  const access = useAnyFeatureAccess(keys)

  if (loading) return <Spinner />
  if (!profile) return <Navigate to="/login" replace />

  if (audience) {
    const isClient = isClientRole(profile.role)
    const wrongSide = audience === 'internal' ? isClient : !isClient && profile.role !== 'super_admin'
    if (wrongSide) return <Navigate to={redirectTo ?? '/my-day'} replace />
  }

  if (feature) {
    // Wait for the flag matrix rather than bouncing — redirecting mid-load would
    // eject a user who actually has the capability.
    if (access.isLoading) return <Spinner />
    if (!access.allowed) return <Navigate to={redirectTo ?? '/my-day'} replace />
  }

  return <>{children}</>
}
