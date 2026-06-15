import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cookie helpers inlined (kept self-contained so this critical auth function
// has no cross-file dependency at deploy time). Mirrors _shared/cookie.ts.
const REFRESH_COOKIE = 'sb-refresh-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let email: string, password: string
  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!email || !password) return json({ error: 'Email and password are required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return json({ error: error?.message ?? 'Invalid credentials' }, 401)
  }

  const { session, user } = data

  // Reject deactivated accounts (HR/admin set this via admin_set_profile_active).
  // The client is now authenticated in-memory, so RLS lets it read the own profile row.
  const { data: prof } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (prof && prof.is_active === false) {
    await supabase.auth.signOut()
    return json({ error: 'Your account has been deactivated. Please contact your administrator.' }, 403)
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', setCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE))

  return new Response(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: { id: user.id, email: user.email },
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
