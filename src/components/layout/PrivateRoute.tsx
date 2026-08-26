import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="size-8 animate-spin rounded-full border-2 border-surface-2 border-t-brand-red" />
    </div>
  )
}

export function PrivateRoute({ children }: { children: ReactNode }) {
  const { accessToken, loading } = useAuthContext()
  if (loading) return <FullPageSpinner />
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Landing route ("/" and unknown paths). Waits for the session to restore on a
// cold launch (e.g. the installed PWA's start_url) before deciding where to go,
// so a still-valid session resumes instead of dropping the user on /login.
export function HomeRedirect() {
  const { accessToken, profile, loading } = useAuthContext()
  if (loading) return <FullPageSpinner />
  if (!accessToken) return <Navigate to="/login" replace />
  const isClient = profile?.role === 'client_owner' || profile?.role === 'client_member'
  // Internal staff land on My Day: the first thing someone needs on opening the
  // portal is their own next few hours.
  return <Navigate to={isClient ? '/client/dashboard' : '/my-day'} replace />
}
