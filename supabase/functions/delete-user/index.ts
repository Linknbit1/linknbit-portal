import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function clearNonOwnerProfileReferences(
  service: ReturnType<typeof createClient>,
  profileId: string,
): Promise<string | null> {
  const updates = await Promise.all([
    service.from('attendance').update({ marked_by: null }).eq('marked_by', profileId),
    service.from('attendance_exceptions').update({ reviewed_by: null }).eq('reviewed_by', profileId),
    service.from('attendance_settings').update({ updated_by: null }).eq('updated_by', profileId),
    service.from('badge_awards').update({ awarded_by: null }).eq('awarded_by', profileId),
    service.from('employee_of_the_month').update({ awarded_by: null }).eq('awarded_by', profileId),
    service.from('enrolled_devices').update({ approved_by: null }).eq('approved_by', profileId),
    service.from('profiles').update({ restricted_by: null }).eq('restricted_by', profileId),
    service.from('quest_task_claims').update({ reviewed_by: null }).eq('reviewed_by', profileId),
    service.from('quest_tasks').update({ created_by: null }).eq('created_by', profileId),
    service.from('reward_redemptions').update({ reviewed_by: null }).eq('reviewed_by', profileId),
    service.from('rewards').update({ created_by: null }).eq('created_by', profileId),
    service.from('role_feature_flags').update({ updated_by: null }).eq('updated_by', profileId),
    service.from('services').update({ created_by: null }).eq('created_by', profileId),
    service.from('shoutouts').update({ reviewed_by: null }).eq('reviewed_by', profileId),
  ])

  const failed = updates.find((res) => res.error)
  return failed?.error?.message ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST' && req.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405)

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

  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)
  if (caller.id === profileId) return json({ error: 'cannot_manage_self' }, 403)

  const { data: me } = await service.from('profiles').select('role').eq('id', caller.id).maybeSingle()
  if (!me || !['super_admin', 'admin'].includes(me.role)) {
    return json({ error: 'You do not have permission to delete users' }, 403)
  }

  const { data: target } = await service.from('profiles').select('role').eq('id', profileId).maybeSingle()
  if (!target) return json({ error: 'profile_not_found' }, 404)
  if (me.role === 'admin' && target.role === 'super_admin') return json({ error: 'forbidden_target' }, 403)

  const cleanupError = await clearNonOwnerProfileReferences(service, profileId)
  if (cleanupError) return json({ error: cleanupError }, 400)

  const { error: deleteError } = await service.auth.admin.deleteUser(profileId, false)
  if (deleteError) return json({ error: deleteError.message }, 400)

  return json({ ok: true }, 200)
})
