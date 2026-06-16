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

const EXC_GRACE_MIN = 10

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let action: 'depart' | 'return'
  try {
    const body = await req.json()
    action = body.action
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (action !== 'depart' && action !== 'return') {
    return json({ error: "action must be 'depart' or 'return'" }, 400)
  }

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

  // ── 3. Settings + local time ────────────────────────────────────────────────
  const { data: settings, error: settingsError } = await supabase
    .from('attendance_settings').select('*').single()
  if (settingsError || !settings) return json({ error: 'Attendance settings not configured' }, 500)

  const tz = settings.timezone ?? 'Asia/Karachi'
  const now = new Date()
  const localTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  const [localH, localM] = localTimeStr.split(':').map(Number)
  const localMinutes = localH * 60 + localM
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)

  // ── 4. Approved out-of-office exception for today ───────────────────────────
  const { data: exc } = await supabase
    .from('attendance_exceptions')
    .select('id, requested_time, return_time, actual_departure, actual_return')
    .eq('profile_id', profileId)
    .eq('date', today)
    .eq('exception_type', 'out_of_office')
    .eq('status', 'approved')
    .maybeSingle()
  if (!exc) {
    return json({ error: 'No approved out-of-office request for today.', code: 'no_ooo' }, 422)
  }

  // ── 5. Today's attendance row (must have checked in) ────────────────────────
  const { data: record } = await supabase
    .from('attendance')
    .select('id, check_in, excluded_minutes')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()
  if (!record || !record.check_in) {
    return json({ error: 'You must be checked in before leaving on an out-of-office.', code: 'not_checked_in' }, 422)
  }

  const nowIso = new Date().toISOString()

  if (action === 'depart') {
    if (exc.actual_departure) {
      return json({ error: 'You have already left on this out-of-office.', code: 'already_departed' }, 409)
    }
    const [dh, dm] = exc.requested_time.split(':').map(Number)
    const departMinutes = dh * 60 + dm
    if (localMinutes < departMinutes - EXC_GRACE_MIN) {
      return json({
        error: `Your approved out-of-office starts at ${exc.requested_time}. It is too early to leave.`,
        code: 'too_early',
      }, 422)
    }
    const { error: updErr } = await supabase
      .from('attendance_exceptions')
      .update({ actual_departure: nowIso })
      .eq('id', exc.id)
    if (updErr) return json({ error: updErr.message }, 500)
    return json({ actual_departure: nowIso }, 200)
  }

  // action === 'return'
  if (!exc.actual_departure) {
    return json({ error: 'Record your departure before returning.', code: 'not_departed' }, 422)
  }
  if (exc.actual_return) {
    return json({ error: 'You have already returned from this out-of-office.', code: 'already_returned' }, 409)
  }
  if (exc.return_time) {
    const [rh, rm] = exc.return_time.split(':').map(Number)
    const returnMinutes = rh * 60 + rm
    if (localMinutes > returnMinutes + EXC_GRACE_MIN) {
      return json({
        error: `Your approved return time was ${exc.return_time}. The return window has passed — contact your admin.`,
        code: 'too_late',
      }, 422)
    }
  }

  const gapMinutes = Math.max(
    0,
    Math.round((new Date(nowIso).getTime() - new Date(exc.actual_departure).getTime()) / 60000),
  )

  const { error: excErr } = await supabase
    .from('attendance_exceptions')
    .update({ actual_return: nowIso })
    .eq('id', exc.id)
  if (excErr) return json({ error: excErr.message }, 500)

  const { error: attErr } = await supabase
    .from('attendance')
    .update({ excluded_minutes: (record.excluded_minutes ?? 0) + gapMinutes })
    .eq('id', record.id)
  if (attErr) return json({ error: attErr.message }, 500)

  return json({ actual_return: nowIso, excluded_minutes: (record.excluded_minutes ?? 0) + gapMinutes }, 200)
})
