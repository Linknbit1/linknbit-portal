import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cookie helpers inlined (kept self-contained so this critical auth function
// has no cross-file dependency at deploy time). Mirrors _shared/cookie.ts.
const REFRESH_COOKIE = 'sb-refresh-token'
const IMPERSONATION_COOKIE = 'sb-impersonation'
function isSecureRequest(req: Request): boolean {
  const origin = req.headers.get('origin') ?? ''
  if (origin.startsWith('http://')) return false
  if (origin.startsWith('https://')) return true
  return (req.headers.get('x-forwarded-proto') ?? 'https') !== 'http'
}
function clearCookie(name: string, secure: boolean): string {
  return `${name}=; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=0`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  // x-access-token is the user's JWT sent from memory — used to revoke all sessions server-side
  const accessToken = req.headers.get('x-access-token')

  if (accessToken) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    // Best-effort — revoke all tokens for this user globally
    await supabase.auth.admin.signOut(accessToken).catch(() => {})
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })
  const secure = isSecureRequest(req)
  headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE, secure))
  // Signing out must not leave an impersonation behind for the next person to
  // open the browser — that cookie would outlive the session it belonged to.
  headers.append('Set-Cookie', clearCookie(IMPERSONATION_COOKIE, secure))

  return new Response(JSON.stringify({ success: true }), { headers })
})
