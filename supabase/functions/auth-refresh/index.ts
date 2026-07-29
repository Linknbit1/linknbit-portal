import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cookie helpers inlined (kept self-contained so this critical auth function
// has no cross-file dependency at deploy time). Mirrors _shared/cookie.ts.
const REFRESH_COOKIE = 'sb-refresh-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
// Set by auth-impersonate; holds the member's refresh token and the two names
// the impersonation banner shows. Kept separate from REFRESH_COOKIE so the
// admin's own session is never overwritten and exiting is a single delete.
const IMPERSONATION_COOKIE = 'sb-impersonation'
const IMPERSONATION_MAX_AGE = 60 * 60 * 12
function parseCookie(header: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}
// Only mark Secure on HTTPS origins — browsers (esp. iOS Safari) drop Secure
// cookies on plain-HTTP origins (local/LAN dev), which breaks login persistence.
function isSecureRequest(req: Request): boolean {
  const origin = req.headers.get('origin') ?? ''
  if (origin.startsWith('http://')) return false
  if (origin.startsWith('https://')) return true
  return (req.headers.get('x-forwarded-proto') ?? 'https') !== 'http'
}
function setCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}
function clearCookie(name: string, secure: boolean): string {
  return `${name}=; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=0`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const secure = isSecureRequest(req)
  const cookieHeader = req.headers.get('cookie') ?? ''
  const refreshToken = parseCookie(cookieHeader, REFRESH_COOKIE)

  // Exiting impersonation: drop that cookie and fall through to the admin's,
  // which was never touched. Sent as a body flag so no new route is needed.
  let stopImpersonation = false
  try {
    const body = await req.json()
    stopImpersonation = body?.stop_impersonation === true
  } catch { /* no body — an ordinary refresh */ }

  const impersonation = stopImpersonation
    ? null
    : readImpersonation(parseCookie(cookieHeader, IMPERSONATION_COOKIE))

  if (!refreshToken && !impersonation) return json({ error: 'No session' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // While impersonating, the member's session is the live one — refreshing the
  // admin's here is exactly what used to snap the page back on reload.
  if (impersonation) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: impersonation.rt })

    if (!error && data.session) {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      // Refresh tokens are single-use, so the rotated one has to be written back
      // or the next reload finds a token that has already been spent.
      headers.append('Set-Cookie', setCookie(
        IMPERSONATION_COOKIE,
        JSON.stringify({ ...impersonation, rt: data.session.refresh_token }),
        IMPERSONATION_MAX_AGE,
        secure,
      ))
      return new Response(
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: { id: data.user!.id, email: data.user!.email },
          impersonating: { targetName: impersonation.targetName, adminName: impersonation.adminName },
        }),
        { headers },
      )
    }

    // The member's session is gone (expired, or revoked by a global sign-out).
    // Clear it and carry on to the admin's cookie rather than logging them out.
    if (!refreshToken) {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      headers.append('Set-Cookie', clearCookie(IMPERSONATION_COOKIE, secure))
      return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers })
    }
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken! })

  if (error || !data.session) {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE, secure))
    headers.append('Set-Cookie', clearCookie(IMPERSONATION_COOKIE, secure))
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers })
  }

  const { session, user } = data
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', setCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE, secure))
  // Reached either by stopping deliberately or by the member's session failing;
  // either way no impersonation is in effect any more.
  headers.append('Set-Cookie', clearCookie(IMPERSONATION_COOKIE, secure))

  return new Response(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: { id: user!.id, email: user!.email },
    }),
    { headers },
  )
})

interface Impersonation { rt: string; targetName: string; adminName: string }

function readImpersonation(raw: string | null): Impersonation | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.rt !== 'string' || !parsed.rt) return null
    return {
      rt: parsed.rt,
      targetName: typeof parsed.targetName === 'string' ? parsed.targetName : 'that member',
      adminName: typeof parsed.adminName === 'string' ? parsed.adminName : 'an admin',
    }
  } catch {
    return null
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
