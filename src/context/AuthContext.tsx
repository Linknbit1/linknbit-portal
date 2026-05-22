import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  bffSignIn,
  bffRefreshSession,
  bffSignOut,
  fetchProfile,
  type BffSession,
  type ProfileRow,
} from '../api/auth'

interface AuthContextValue {
  user: User | null
  profile: ProfileRow | null
  accessToken: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return Date.now() + 55 * 60 * 1000 // fallback: 55 min
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Stable ref so the scheduled refresh timer always closes over the latest token
  const accessTokenRef = useRef<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // React 18 StrictMode double-invokes effects in dev. Refresh tokens are single-use,
  // so the second concurrent call gets a 401 and its setLoading(false) races ahead of
  // the successful applySession(), causing a spurious logout. This guard ensures init
  // runs only once across the StrictMode mount/unmount/remount cycle.
  const initDone = useRef(false)

  function clearAll(): void {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = null
    accessTokenRef.current = null
    setUser(null)
    setProfile(null)
    setAccessToken(null)
    // scope:'local' clears the in-memory Supabase client session without making a
    // network request. Using the default 'global' scope would revoke the refresh token
    // on Supabase's server, permanently breaking the HTTP-only cookie for future loads.
    supabase.auth.signOut({ scope: 'local' })
  }

  async function applySession(bffSession: BffSession): Promise<void> {
    // Hydrate the Supabase JS client so DB queries include the JWT
    await supabase.auth.setSession({
      access_token: bffSession.access_token,
      refresh_token: bffSession.refresh_token,
    })

    const { data } = await supabase.auth.getUser()
    // Fall back to the BFF-supplied user if getUser() returns null due to a transient
    // network error. The BFF already validated the token against Supabase server-side,
    // so the session is genuine — we just can't afford to clearAll() here and revoke it.
    const resolvedUser = data.user ?? null
    if (!resolvedUser) return

    setUser(resolvedUser)
    setAccessToken(bffSession.access_token)
    accessTokenRef.current = bffSession.access_token

    fetchProfile(resolvedUser.id).then(setProfile)

    // Schedule a silent refresh 5 minutes before the access token expires
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiry = getTokenExpiry(bffSession.access_token)
    const delay = Math.max(expiry - Date.now() - 5 * 60 * 1000, 30_000)

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const next = await bffRefreshSession()
        await applySession(next)
      } catch {
        clearAll()
      }
    }, delay)
  }

  async function signIn(email: string, password: string): Promise<void> {
    const session = await bffSignIn(email, password)
    await applySession(session)
  }

  async function signOut(): Promise<void> {
    const token = accessTokenRef.current
    clearAll() // clear state immediately so UI responds at once
    if (token) await bffSignOut(token).catch(() => {}) // best-effort server revocation
  }

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    // On every page load: ask the BFF to exchange the HTTP-only cookie for a fresh token.
    // If there's no cookie (or it's expired), the user stays logged out.
    bffRefreshSession()
      .then(applySession)
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, profile, accessToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
