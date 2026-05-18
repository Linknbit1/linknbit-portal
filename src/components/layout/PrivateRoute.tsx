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
  const { session, loading } = useAuthContext()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
