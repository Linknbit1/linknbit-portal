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

/**
 * Every column that points at a profile and is NOT cleaned up by the database.
 *
 * A foreign key to `profiles` either cascades (the row belongs to that person and
 * goes with them) or sets null (their name comes off a record that outlives them).
 * These fourteen do neither — they are ON DELETE NO ACTION — so the delete fails on
 * a foreign-key violation unless they are cleared first.
 *
 * Kept as data rather than fourteen hand-written statements because the list drifts:
 * `designations.created_by` was added to the schema and never added here, which
 * meant deleting anyone who had created a designation failed with a raw Postgres
 * error. The query that generates this list is in the migration alongside it, so a
 * new NO ACTION key is one query away from being spotted.
 */
const PROFILE_REFERENCES: { table: string; column: string }[] = [
  { table: 'attendance', column: 'marked_by' },
  { table: 'attendance_exceptions', column: 'reviewed_by' },
  { table: 'attendance_settings', column: 'updated_by' },
  { table: 'badge_awards', column: 'awarded_by' },
  { table: 'designations', column: 'created_by' },
  { table: 'employee_of_the_month', column: 'awarded_by' },
  { table: 'enrolled_devices', column: 'approved_by' },
  { table: 'profiles', column: 'restricted_by' },
  { table: 'quest_task_claims', column: 'reviewed_by' },
  { table: 'quest_tasks', column: 'created_by' },
  { table: 'reward_redemptions', column: 'reviewed_by' },
  { table: 'rewards', column: 'created_by' },
  { table: 'services', column: 'created_by' },
  { table: 'shoutouts', column: 'reviewed_by' },
]

/**
 * Clears those references. Returns a message naming the table that failed rather
 * than a bare Postgres string, because "violates foreign key constraint" on its own
 * has sent people looking in the wrong place more than once.
 */
async function clearNonOwnerProfileReferences(
  service: ReturnType<typeof createClient>,
  profileId: string,
): Promise<string | null> {
  const results = await Promise.all(
    PROFILE_REFERENCES.map(async ({ table, column }) => {
      const { error } = await service
        .from(table)
        .update({ [column]: null })
        .eq(column, profileId)
      return error ? `${table}.${column}: ${error.message}` : null
    }),
  )
  return results.find((message) => message !== null) ?? null
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

  // Asked as a capability, not as a role name. `can_delete_people` was defined in
  // the permission catalogue and enforced nowhere — this is where it belongs. The
  // holders are the same two roles the old `['super_admin','admin']` list named, so
  // this changes the mechanism and not who may do it.
  const { data: mayDelete, error: featureError } = await anonClient.rpc('has_feature', {
    p_key: 'can_delete_people',
  })
  if (featureError) return json({ error: featureError.message }, 400)
  if (!mayDelete) return json({ error: 'You do not have permission to delete users' }, 403)

  const { data: target } = await service.from('profiles').select('id').eq('id', profileId).maybeSingle()
  if (!target) return json({ error: 'profile_not_found' }, 404)

  // Standing, not role names. top_role_position() returns the sentinel max int for
  // anyone holding `administrator`, so an administrator cannot be deleted from a
  // lower rung however the roles are renamed or reconfigured.
  const [{ data: myRank }, { data: targetRank }] = await Promise.all([
    anonClient.rpc('my_role_rank'),
    anonClient.rpc('top_role_position', { p_profile: profileId }),
  ])
  if (typeof myRank !== 'number' || typeof targetRank !== 'number') {
    return json({ error: 'Could not resolve role standing' }, 400)
  }
  if (myRank < targetRank) return json({ error: 'forbidden_target' }, 403)

  const cleanupError = await clearNonOwnerProfileReferences(service, profileId)
  if (cleanupError) return json({ error: cleanupError }, 400)

  const { error: deleteError } = await service.auth.admin.deleteUser(profileId, false)
  if (deleteError) return json({ error: deleteError.message }, 400)

  return json({ ok: true }, 200)
})
