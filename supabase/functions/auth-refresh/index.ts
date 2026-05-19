import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { REFRESH_COOKIE, COOKIE_MAX_AGE, parseCookie, setCookie, clearCookie } from '../_shared/cookie.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

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
    headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE))
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers })
  }

  const { session, user } = data
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', setCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE))

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
