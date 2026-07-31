import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Admin impersonation ("log in as member"). Verifies the caller is an admin/super_admin,
// checks the target is active and ranked strictly below the caller, mints a real session
// for that member via a magic-link token, records an audit row, and returns the tokens.
//
// The minted session is also written to its own HTTP-only cookie, separate from and
// alongside the admin's. That is what survives a reload: auth-refresh prefers the
// impersonation cookie when it is present, so a hard refresh comes back as the member
// rather than snapping to the admin. The admin's own cookie is never touched, so exiting
// is still just a matter of clearing this one and re-reading that.
//
// Because the cookie has to belong to the app's origin, this function must be called
// through the /api/auth proxy — a response from *.supabase.co cannot set a cookie the
// app origin will send back.
//
// Required secrets (all auto-provided): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cookie helpers inlined, matching the other auth functions — see auth-refresh.
const IMPERSONATION_COOKIE = 'sb-impersonation'
// A working session, not a login. Short enough that a forgotten impersonation
// lapses on its own rather than persisting for the admin cookie's 30 days.
const IMPERSONATION_MAX_AGE = 60 * 60 * 12

function isSecureRequest(req: Request): boolean {
  const origin = req.headers.get('origin') ?? ''
  if (origin.startsWith('http://')) return false
  if (origin.startsWith('https://')) return true
  return (req.headers.get('x-forwarded-proto') ?? 'https') !== 'http'
}

function setCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let profileId: string
  try {
    const body = await req.json()
    profileId = body.profile_id
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!profileId) return json({ error: 'profile_id is required' }, 400)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const callerClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })

  // 1. Resolve & authorize the caller — must be admin or super_admin.
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

  // `name` is carried into the cookie so the banner can still say who is behind
  // the impersonation after a reload, when the client has no admin profile loaded.
  const { data: me } = await service.from('profiles').select('role, name').eq('id', caller.id).maybeSingle()
  if (!me || !['super_admin', 'admin'].includes(me.role)) {
    return json({ error: 'Only admins can impersonate' }, 403)
  }

  // 2. Validate the target — exists, active, and ranked strictly below the caller.
  //
  // Rank rather than a flat "no admins" rule: a super admin needs to be able to
  // step into an admin's account, while an admin still must not be able to take
  // a peer's or a super admin's. Strictly-below is what prevents escalation.
  if (profileId === caller.id) return json({ error: 'Cannot impersonate yourself' }, 400)
  const { data: target } = await service
    .from('profiles')
    .select('id, name, email, role, is_active')
    .eq('id', profileId)
    .maybeSingle()
  if (!target) return json({ error: 'Member not found' }, 404)
  if (!target.is_active) return json({ error: 'That member is inactive' }, 400)

  const [{ data: callerRank }, { data: targetRank }] = await Promise.all([
    service.rpc('top_role_position', { p_profile: caller.id }),
    service.rpc('top_role_position', { p_profile: target.id }),
  ])
  if (typeof callerRank !== 'number' || typeof targetRank !== 'number') {
    return json({ error: 'Could not resolve role ranks' }, 500)
  }
  if (targetRank >= callerRank) {
    return json({ error: 'You can only log in as someone ranked below you' }, 403)
  }
  if (!target.email) return json({ error: 'That member has no email to sign in with' }, 400)

  // 3. Mint a real session for the target via a single-use magic-link token.
  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
  })
  if (linkError || !link?.properties?.hashed_token) {
    return json({ error: 'Could not start impersonation session' }, 500)
  }

  // A fresh anon client (no caller auth) verifies the token → member session.
  const verifyClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: verified, error: verifyError } = await verifyClient.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  })
  if (verifyError || !verified?.session) {
    return json({ error: 'Could not establish impersonation session' }, 500)
  }

  // 4. Audit (best-effort — never block impersonation on a logging failure).
  //
  // Super admins are exempt, matching the audit posture set in migration
  // 20260728220000. The exemption has to be applied here rather than relying on
  // that one: this insert runs under the service role, so auth.uid() is null and
  // fn_audit_capture's guard cannot see who the actor is. Skipping the row also
  // suppresses the audit_log entry, which is written by impersonation_log's own
  // AFTER INSERT trigger rather than by fn_audit_capture.
  if (me.role !== 'super_admin') {
    await service.from('impersonation_log').insert({ admin_id: caller.id, target_id: target.id })
  }

  // The cookie carries the member's refresh token plus the two names the
  // impersonation banner needs, so a reload can rebuild the whole state without
  // the client having to remember anything itself.
  const cookie = setCookie(
    IMPERSONATION_COOKIE,
    JSON.stringify({
      rt: verified.session.refresh_token,
      targetName: target.name,
      adminName: me.name ?? 'an admin',
    }),
    IMPERSONATION_MAX_AGE,
    isSecureRequest(req),
  )

  const headers = new Headers({ 'Content-Type': 'application/json', ...CORS_HEADERS })
  headers.append('Set-Cookie', cookie)

  return new Response(
    JSON.stringify({
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      user: { id: target.id, name: target.name },
    }),
    { status: 200, headers },
  )
})
