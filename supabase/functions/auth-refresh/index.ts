import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cookie helpers inlined (kept self-contained so this critical auth function
// has no cross-file dependency at deploy time). Mirrors _shared/cookie.ts.
const REFRESH_COOKIE = 'sb-refresh-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
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
  const refreshToken = parseCookie(req.headers.get('cookie') ?? '', REFRESH_COOKIE)

  if (!refreshToken) return json({ error: 'No session' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data.session) {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE, secure))
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers })
  }

  const { session, user } = data
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', setCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE, secure))

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

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
