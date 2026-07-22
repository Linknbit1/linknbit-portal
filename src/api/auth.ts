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

export async function bffRefreshSession(): Promise<BffSession> {
  const res = await bffFetch('/api/auth/auth-refresh', { method: 'POST' })
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

// Mints a real session for a member via the auth-impersonate Edge Function. Uses the
// current (admin) session's token for authorization; the function verifies the caller
// is an admin and the target is a non-admin. AuthContext applies the returned tokens
// in memory only, leaving the admin's HTTP-only cookie intact for a clean exit.
export async function impersonateUser(profileId: string): Promise<ImpersonationSession> {
  const { data, error } = await supabase.functions.invoke('auth-impersonate', {
    body: { profile_id: profileId },
  })
  if (error) {
    // Surface the function's JSON error message when present.
    if (error && typeof error === 'object' && 'context' in error) {
      const ctx = (error as { context: unknown }).context
      if (ctx instanceof Response) {
        try {
          const body = await ctx.json()
          if (body?.error) throw new Error(body.error)
        } catch { /* fall through */ }
      }
    }
    throw error instanceof Error ? error : new Error('Impersonation failed')
  }
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
