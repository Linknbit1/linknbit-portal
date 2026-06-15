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

export async function fetchActiveProfiles(): Promise<Pick<ProfileRow, 'id' | 'name'>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('is_active', true)
    .not('role', 'in', '(client_owner,client_member)')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}
