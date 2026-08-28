// Deletes files whose owning row is gone.
//
// Invoked by the drain-storage-cleanup cron (via pg_net), never by a browser.
// Postgres queues paths into storage_cleanup_queue: a trigger does it when an
// attachment row is deleted (directly or by a cascade from a project, task,
// lead, BD task, message or channel), and fn_sweep_orphan_storage does it for
// files that never had a row at all, which is what a cancelled upload leaves.
//
// This is the only part that can actually remove an object. Deleting the row in
// storage.objects would unlink the metadata and leave the blob behind, so the
// storage API is the one supported way, and it needs the service role.
//
// Auth: the cron sends `x-janitor-secret`, and this checks it against Vault
// rather than against an env var. JWT verification is off because the caller is
// Postgres, not a signed-in user, so the header IS the authentication.
//
// Vault rather than a JANITOR_HOOK_SECRET env var on purpose: the secret then
// has one home, the same one fn_request_storage_cleanup reads when it sends it,
// and there is no window where the function is deployed with no secret set and
// an `if (SECRET && ...)` check quietly waves everyone through.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Storage removes in bulk, and one oversized request is worse than four. */
const BATCH = 100
/** Give up on a path after this many tries so one bad row cannot block the queue. */
const MAX_ATTEMPTS = 5

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-janitor-secret',
      },
    })
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE)

  // fn_verify_janitor_secret compares against Vault and answers yes or no. It
  // never hands the secret back, so a leak here cannot become a leak of it.
  const { data: allowed, error: authError } = await db.rpc('fn_verify_janitor_secret', {
    p_secret: req.headers.get('x-janitor-secret') ?? '',
  })
  if (authError) return json({ error: authError.message }, 500)
  if (allowed !== true) return json({ error: 'forbidden' }, 403)

  const { data: pending, error } = await db
    .from('storage_cleanup_queue')
    .select('id, bucket_id, storage_path, attempts')
    .is('deleted_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('queued_at', { ascending: true })
    .limit(BATCH * 4)
  if (error) return json({ error: error.message }, 500)
  if (!pending || pending.length === 0) return json({ deleted: 0, failed: 0 })

  // Group by bucket: storage.remove() takes a list of paths within one bucket.
  const byBucket = new Map<string, typeof pending>()
  for (const row of pending) {
    const rows = byBucket.get(row.bucket_id) ?? []
    rows.push(row)
    byBucket.set(row.bucket_id, rows)
  }

  let deleted = 0
  let failed = 0

  for (const [bucket, rows] of byBucket) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH)
      const { error: rmError } = await db.storage
        .from(bucket)
        .remove(slice.map((r) => r.storage_path))

      if (rmError) {
        // Count the attempt rather than dropping the row: a transient storage
        // error should be retried next hour, and a permanent one gives up on
        // its own once MAX_ATTEMPTS is reached, leaving the error to read.
        failed += slice.length
        for (const r of slice) {
          await db
            .from('storage_cleanup_queue')
            .update({ attempts: r.attempts + 1, last_error: rmError.message })
            .eq('id', r.id)
        }
        continue
      }

      // remove() is idempotent: a path that was already gone is not an error,
      // which is exactly what we want for a queue that may be drained twice.
      deleted += slice.length
      await db
        .from('storage_cleanup_queue')
        .update({ deleted_at: new Date().toISOString(), last_error: null })
        .in('id', slice.map((r) => r.id))
    }
  }

  return json({ deleted, failed })
})
