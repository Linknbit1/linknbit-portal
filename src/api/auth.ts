import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ProfileRow = Tables<'profiles'>

// ── BFF response shape ────────────────────────────────────────────────────────

export interface BffSession {
  access_token: string
  refresh_token: string
  expires_at: number // Unix seconds
  user: { id: string; email: string | undefined }
  /** Present when the restored session is an impersonation, not the caller's own. */
  impersonating?: { targetName: string; adminName: string }
}

// ── BFF fetch helper ──────────────────────────────────────────────────────────

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function bffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: 'include', // always send the HTTP-only cookie
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      ...(init.headers ?? {}),
    },
  })
}

// ── BFF auth calls (go through Vite proxy / Vercel rewrite) ──────────────────

export async function bffSignIn(email: string, password: string): Promise<BffSession> {
  const res = await bffFetch('/api/auth/auth-signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Sign in failed')
  return data as BffSession
}

/**
 * Exchanges the HTTP-only cookie for a fresh session.
 *
 * If an impersonation cookie is present the member's session comes back instead
 * of the admin's, which is what makes a reload stay in the impersonated portal.
 * `stopImpersonation` clears that cookie and returns the admin's session.
 */
export async function bffRefreshSession(
  opts: { stopImpersonation?: boolean } = {},
): Promise<BffSession> {
  const res = await bffFetch('/api/auth/auth-refresh', {
    method: 'POST',
    body: JSON.stringify({ stop_impersonation: opts.stopImpersonation === true }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Session expired')
  return data as BffSession
}

export async function bffSignOut(accessToken: string): Promise<void> {
  await bffFetch('/api/auth/auth-signout', {
    method: 'POST',
    headers: { 'x-access-token': accessToken },
  })
}

// ── Impersonation (admin only) ────────────────────────────────────────────────

export interface ImpersonationSession {
  access_token: string
  refresh_token: string
  user: { id: string; name: string }
}

/**
 * Mints a real session for a member via the auth-impersonate Edge Function. The
 * admin's own token authorises the call; the function checks the caller is an
 * admin and the target ranks strictly below them.
 *
 * Routed through the /api/auth proxy rather than supabase.functions.invoke, and
 * that matters: the function replies with an HTTP-only impersonation cookie, and
 * a cookie set by a *.supabase.co response would belong to that domain and never
 * be sent back by the app. Same-origin is what lets the session survive a reload.
 * The admin's own cookie is left untouched, so exiting stays clean.
 */
export async function impersonateUser(
  profileId: string,
  adminAccessToken: string,
): Promise<ImpersonationSession> {
  const res = await bffFetch('/api/auth/auth-impersonate', {
    method: 'POST',
    // The function reads the caller from Authorization, so the admin's JWT
    // replaces the anon key here; apikey still satisfies the API gateway.
    headers: { Authorization: `Bearer ${adminAccessToken}`, apikey: ANON_KEY },
    body: JSON.stringify({ profile_id: profileId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Impersonation failed')
  return data as ImpersonationSession
}

// ── Direct Supabase calls (OTP / password reset / invite flows) ───────────────
// These use the in-memory Supabase session set by AuthContext.

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  if (error) throw error
}

export async function verifyOtp(
  email: string,
  token: string,
): Promise<{ session: Session; user: User }> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  // Hydrate the Supabase client so updatePassword works in the next step
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }
  return { session: data.session!, user: data.user! }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function fetchActiveProfiles(): Promise<Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'allowed_check_in' | 'attendance_excluded'>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, allowed_check_in, attendance_excluded')
    .eq('is_active', true)
    .not('role', 'in', '(client_owner,client_member)')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}
