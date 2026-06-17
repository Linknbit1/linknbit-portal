import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendInviteEmail } from '../_shared/mail.ts'

// Re-sends an invitation to a user who hasn't signed in yet (e.g. the first email
// failed to deliver). Generates a fresh recovery link — which lands on the same
// /reset-password screen as the original invite — and emails it. A recovery-type
// link works for an existing, not-yet-accepted user, whereas an invite-type link
// would 422 on an already-created user.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_SITE_URL = 'https://portal.linknbit.com'

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  let profileId: string
  try {
    const body = await req.json()
    profileId = body.profile_id ?? body.profileId ?? ''
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!profileId) return json({ error: 'profile_id is required' }, 400)

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

  // Authorize caller
  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

  const { data: me } = await service.from('profiles').select('role').eq('id', caller.id).maybeSingle()
  if (!me || !['super_admin', 'admin', 'hr'].includes(me.role)) {
    return json({ error: 'You do not have permission to invite users' }, 403)
  }

  // Load target + guard
  const { data: target } = await service
    .from('profiles')
    .select('name, email, role, last_sign_in_at')
    .eq('id', profileId)
    .maybeSingle()
  if (!target) return json({ error: 'profile_not_found' }, 404)
  if (!canGrant(me.role, target.role)) return json({ error: 'forbidden_target' }, 403)
  if (target.last_sign_in_at) return json({ error: 'already_active' }, 409)

  // Generate a fresh link (recovery → /reset-password) and email it
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? DEFAULT_SITE_URL).replace(/\/+$/, '')
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  })
  if (linkError || !linkData) return json({ error: linkError?.message ?? 'Could not create invite link' }, 400)

  const inviteLink = linkData.properties?.action_link ?? null
  const emailed = inviteLink ? await sendInviteEmail(target.email, target.name, inviteLink) : false

  return json({ ok: true, invite_link: inviteLink, emailed }, 200)
})
