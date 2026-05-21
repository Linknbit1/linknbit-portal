import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let attendanceId: string
  try {
    const body = await req.json()
    attendanceId = body.attendance_id
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!attendanceId) return json({ error: 'attendance_id is required' }, 400)

  // ── 2. Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    },
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)
  const profileId = user.id

  // ── 3. Load settings ───────────────────────────────────────────────────────
  const { data: settings, error: settingsError } = await supabase
    .from('attendance_settings').select('*').single()
  if (settingsError || !settings) return json({ error: 'Attendance settings not configured' }, 500)

  // ── 4. Load and validate today's attendance row ────────────────────────────
  const { data: record, error: recordError } = await supabase
    .from('attendance')
    .select('id, profile_id, check_out, date')
    .eq('id', attendanceId)
    .single()

  if (recordError || !record) return json({ error: 'Attendance record not found' }, 404)
  if (record.profile_id !== profileId) return json({ error: 'Forbidden' }, 403)
  if (record.check_out) return json({ error: 'Already checked out', code: 'duplicate_checkout' }, 409)

  // ── 5. Time validation ─────────────────────────────────────────────────────
  const tz = settings.timezone ?? 'Asia/Karachi'
  const now = new Date()
  const localTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  const [localH, localM] = localTimeStr.split(':').map(Number)
  const localMinutes = localH * 60 + localM
  const [endH, endM] = settings.work_end_time.split(':').map(Number)
  const endMinutes   = endH * 60 + endM

  const canCheckOut = localMinutes >= endMinutes

  // ── 6. Early departure exception check ────────────────────────────────────
  if (!canCheckOut) {
    const today = record.date // already stored as YYYY-MM-DD

    const { data: exception } = await supabase
      .from('attendance_exceptions')
      .select('id, requested_time, status')
      .eq('profile_id', profileId)
      .eq('date', today)
      .eq('exception_type', 'early_departure')
      .eq('status', 'approved')
      .maybeSingle()

    if (!exception) {
      return json({
        error: `Early checkout requires an approved early departure request. Work ends at ${settings.work_end_time} (${tz}).`,
        code: 'early_checkout',
      }, 422)
    }

    // Verify the exception allows checkout at the current time
    const [excH, excM] = exception.requested_time.split(':').map(Number)
    const excMinutes = excH * 60 + excM
    if (localMinutes < excMinutes) {
      return json({
        error: `Your approved early departure is at ${exception.requested_time}. It is too early to check out.`,
        code: 'early_checkout',
      }, 422)
    }
  }

  // ── 7. Write checkout ──────────────────────────────────────────────────────
  const checkOutTime = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('attendance')
    .update({ check_out: checkOutTime })
    .eq('id', attendanceId)
    .select()
    .single()

  if (updateError) return json({ error: updateError.message }, 500)

  return json({ check_out: updated.check_out, date: updated.date }, 200)
})
