import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Invites a new internal user: verifies the caller may invite the requested role,
// creates the auth user + an invite link (service role), sets role/team/service on
// the auto-created profile, and emails the link via Resend.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (auto),
//                   RESEND_API_KEY, RESEND_FROM (optional), PUBLIC_SITE_URL (optional).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INTERNAL_ROLES = ['super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance']

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function canGrant(actor: string, role: string): boolean {
  if (actor === 'super_admin') return true
  if (actor === 'admin') return role !== 'super_admin'
  if (actor === 'hr') return role !== 'super_admin' && role !== 'admin'
  return false
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let name: string, email: string, role: string, teamId: string | null, serviceType: string | null
  try {
    const body = await req.json()
    name = (body.name ?? '').trim()
    email = (body.email ?? '').trim().toLowerCase()
    role = body.role
    teamId = body.team_id ?? null
    serviceType = body.service_type ?? null
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!name || !email || !role) return json({ error: 'name, email and role are required' }, 400)
  if (!INTERNAL_ROLES.includes(role)) return json({ error: 'Invalid role' }, 400)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader } } },
  )

  // 1. Resolve & authorize the caller
  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

  const { data: me } = await service.from('profiles').select('role').eq('id', caller.id).maybeSingle()
  if (!me || !['super_admin', 'admin', 'hr'].includes(me.role)) {
    return json({ error: 'You do not have permission to invite users' }, 403)
  }
  if (!canGrant(me.role, role)) {
    return json({ error: `Your role cannot grant "${role}"` }, 403)
  }

  // 2. Create the user + invite link (also fires fn_handle_new_user → profile row)
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? req.headers.get('Origin') ?? ''
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { name },
      redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
    },
  })
  if (linkError || !linkData.user) {
    const msg = linkError?.message ?? 'Could not create user'
    const status = msg.toLowerCase().includes('already') ? 409 : 400
    return json({ error: msg }, status)
  }

  const newUserId = linkData.user.id
  const inviteLink = linkData.properties?.action_link ?? null

  // 3. Apply role / team / service to the auto-created profile (service role bypasses RLS)
  const { error: updErr } = await service
    .from('profiles')
    .update({ role, team_id: teamId, service_type: serviceType })
    .eq('id', newUserId)
  if (updErr) return json({ error: updErr.message }, 500)

  // 4. Email the invite via Resend (best-effort; link is always returned as fallback)
  let emailed = false
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey && inviteLink) {
    const from = Deno.env.get('RESEND_FROM') ?? 'Linknbit <onboarding@resend.dev>'
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>You've been invited to the Linknbit Operations Portal</h2>
        <p>Hi ${name}, an administrator has created an account for you.</p>
        <p>Click below to set your password and sign in:</p>
        <p><a href="${inviteLink}" style="display:inline-block;background:#EE2737;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invite</a></p>
        <p style="color:#888;font-size:12px">If the button doesn't work, copy this link:<br>${inviteLink}</p>
      </div>`
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: email, subject: 'Your Linknbit Portal invitation', html }),
      })
      emailed = res.ok
    } catch {
      emailed = false
    }
  }

  return json({ ok: true, profile_id: newUserId, invite_link: inviteLink, emailed }, 200)
})
