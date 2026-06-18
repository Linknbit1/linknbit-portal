import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APPROVER_ROLES = ['admin', 'super_admin']

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let deviceFingerprint: string
  let deviceName: string
  let fingerprintHint: string | null = null
  try {
    const body = await req.json()
    deviceFingerprint = body.device_fingerprint
    deviceName = body.device_name
    fingerprintHint = body.fingerprint_hint ?? null
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!deviceFingerprint || !deviceName) {
    return json({ error: 'device_fingerprint and device_name are required' }, 400)
  }

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

  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)
  const profileId = user.id

  const { data: me } = await service.from('profiles').select('role, name').eq('id', profileId).maybeSingle()
  const privileged = APPROVER_ROLES.includes(me?.role ?? '')

  // Idempotency: if this device already has a row for this user, honour its current state
  // instead of silently re-creating / un-approving it.
  const { data: existing } = await service
    .from('enrolled_devices')
    .select('id, is_active, approved_by')
    .eq('profile_id', profileId)
    .eq('device_fingerprint', deviceFingerprint)
    .maybeSingle()

  if (existing) {
    if (!existing.is_active) {
      return json({
        error: 'This device was blocked by an admin. Contact your admin to use it.',
        code: 'device_blocked',
      }, 403)
    }
    if (existing.approved_by) return json({ status: 'approved' }, 200)
    return json({ status: 'pending' }, 200)
  }

  const nowIso = new Date().toISOString()

  // Admins / super-admins self-approve silently — no notification to anyone.
  if (privileged) {
    const { error } = await service.from('enrolled_devices').upsert(
      {
        profile_id: profileId,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        fingerprint_hint: fingerprintHint,
        is_active: true,
        approved_by: profileId,
        approved_at: nowIso,
      },
      { onConflict: 'profile_id,device_fingerprint' },
    )
    if (error) return json({ error: error.message }, 500)
    return json({ status: 'approved' }, 200)
  }

  // Everyone else (incl. HR): register as pending and notify the approvers (admins).
  const { error: insertError } = await service.from('enrolled_devices').upsert(
    {
      profile_id: profileId,
      device_fingerprint: deviceFingerprint,
      device_name: deviceName,
      fingerprint_hint: fingerprintHint,
      is_active: true,
      approved_by: null,
      approved_at: null,
    },
    { onConflict: 'profile_id,device_fingerprint' },
  )
  if (insertError) return json({ error: insertError.message }, 500)

  const { data: approvers } = await service
    .from('profiles')
    .select('id')
    .in('role', APPROVER_ROLES)
  if (approvers && approvers.length > 0) {
    const callerName = me?.name ?? 'An employee'
    const notifications = approvers.map((p: { id: string }) => ({
      profile_id: p.id,
      title: 'Device approval requested',
      body: `${callerName} registered a new device (${deviceName}) and needs approval to check in.`,
      resource_type: 'enrolled_device',
      resource_id: deviceFingerprint,
    }))
    await service.from('notifications').insert(notifications)
  }

  return json({ status: 'pending' }, 200)
})
