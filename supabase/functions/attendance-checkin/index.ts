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

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/')
    const mask = ~((1 << (32 - Number(bits))) - 1) >>> 0
    const ipParts = ip.split('.').map(Number)
    const rangeParts = range.split('.').map(Number)
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false
    const ipInt = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0
    const rangeInt = ((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0
    return (ipInt & mask) === (rangeInt & mask)
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // 1. Parse body
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

  // 2. Auth
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

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, job_type, allowed_check_in')
    .eq('id', profileId)
    .maybeSingle()
  const privileged = callerProfile?.role === 'admin' || callerProfile?.role === 'super_admin'

  // Per-job-type attendance policy (network gate + schedule-window enforcement).
  // Fall back to the strict on-site defaults if the row is missing.
  const jobType = callerProfile?.job_type ?? 'on_site'
  const { data: policyRow } = await supabase
    .from('job_type_policies')
    .select('require_office_network, auto_detect_network, enforce_schedule_window')
    .eq('job_type', jobType)
    .maybeSingle()
  const policy = policyRow ?? {
    require_office_network: true,
    auto_detect_network: false,
    enforce_schedule_window: true,
  }

  // 3. Load settings
  const { data: settings, error: settingsError } = await supabase
    .from('attendance_settings')
    .select('*')
    .single()
  if (settingsError || !settings) return json({ error: 'Attendance settings not configured' }, 500)

  const tz = settings.timezone ?? 'Asia/Karachi'

  // 4. Time window check
  // Use Intl.DateTimeFormat to extract local time — avoids new Date(toLocaleString())
  // which is unreliable in Deno because the locale string format is not guaranteed parseable.
  const now = new Date()

  const localTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  const [localH, localM] = localTimeStr.split(':').map(Number)
  const localMinutes = localH * 60 + localM

  // en-CA locale reliably formats as YYYY-MM-DD, which PostgreSQL date columns expect
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)

  // 4a. Weekend gate — derive day-of-week from the already-localized date string
  const [ty, tm, td] = today.split('-').map(Number)
  const dayOfWeek = new Date(ty, tm - 1, td).getDay() // 0 = Sun, 6 = Sat

  if (dayOfWeek === 0) {
    return json({ error: 'Check-in is not allowed on Sundays.', code: 'weekend' }, 422)
  }

  if (dayOfWeek === 6) {
    if (!settings.saturday_working) {
      // Check if this specific Saturday is in the working_saturdays table
      const { data: workingSat } = await supabase
        .from('working_saturdays')
        .select('id')
        .eq('date', today)
        .maybeSingle()

      if (!workingSat) {
        return json({ error: 'Check-in is not allowed on Saturdays.', code: 'weekend' }, 422)
      }
    }
  }

  // 4b. Holiday gate — no check-in on a company holiday (any weekday).
  const { data: holiday } = await supabase
    .from('holidays')
    .select('name')
    .eq('date', today)
    .maybeSingle()
  if (holiday) {
    return json({
      error: `Check-in is not allowed on a holiday${holiday.name ? ` (${holiday.name})` : ''}.`,
      code: 'holiday',
    }, 422)
  }

  const [startH, startM] = settings.work_start_time.split(':').map(Number)
  const [endH, endM] = settings.work_end_time.split(':').map(Number)
  const graceMin = settings.grace_period_min

  const earlyMin = settings.early_checkin_min ?? 0
  const EXC_GRACE_MIN = 10 // grace applied to approved exception times

  const startMinutes = startH * 60 + startM
  const openMinutes  = startMinutes - earlyMin
  const endMinutes   = endH * 60 + endM
  let   lateCutoff   = startMinutes + graceMin

  // Per-employee allowed check-in overrides the start+grace cutoff entirely: arriving
  // at or before this time is on-time, and the grace period does NOT apply on top.
  if (callerProfile?.allowed_check_in) {
    const [ah, am] = callerProfile.allowed_check_in.split(':').map(Number)
    lateCutoff = ah * 60 + am
  }

  const fmtHHMM = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  // 4c. Approved late-arrival exception widens the late cutoff to requested_time + grace
  //     and waives the early-window lower bound (they are arriving late on purpose).
  let lowerBoundActive = true
  const { data: lateExc } = await supabase
    .from('attendance_exceptions')
    .select('requested_time')
    .eq('profile_id', profileId)
    .eq('date', today)
    .eq('exception_type', 'late_arrival')
    .eq('status', 'approved')
    .maybeSingle()
  if (lateExc?.requested_time) {
    const [eh, em] = lateExc.requested_time.split(':').map(Number)
    lateCutoff = eh * 60 + em + EXC_GRACE_MIN
    lowerBoundActive = false
  }

  // Schedule-window enforcement is per-job-type. When disabled (e.g. flexible
  // remote/hybrid hours) the early/late bounds are skipped and the arrival is
  // never marked late (see status computation below). Weekend/holiday gates
  // above still apply to everyone.
  if (policy.enforce_schedule_window) {
    if (lowerBoundActive && localMinutes < openMinutes) {
      return json({
        error: `Check-in is not allowed before ${fmtHHMM(openMinutes)} (${tz})`,
        code: 'outside_window',
      }, 422)
    }
    if (localMinutes > endMinutes) {
      return json({
        error: `Check-in is not allowed after ${settings.work_end_time} (${tz})`,
        code: 'outside_window',
      }, 422)
    }
  }

  // 5. Existing-row handling.
  //    An approved WFH/Leave or the daily absence job may have already written a
  //    'system' row for today. WFH employees may still check in (to record hours);
  //    Leave blocks; a real self row is a true duplicate; any other system row
  //    (e.g. 'absent') is overridden by a normal check-in.
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, source, status')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()

  let wfhOverride = false
  if (existing) {
    if (existing.source === 'self') {
      return json({ error: 'Already checked in today', code: 'duplicate' }, 409)
    }
    if (existing.source === 'system' && existing.status === 'leave') {
      return json({ error: 'You are on approved leave today.', code: 'on_leave' }, 409)
    }
    if (existing.source === 'system' && existing.status === 'wfh') {
      wfhOverride = true
    }
  }

  // 6. WiFi / IP check — driven by the job-type policy:
  //    • require_office_network (on-site): hard gate, block when off-network.
  //    • auto_detect_network (hybrid): never block; just record office vs remote.
  //    • otherwise (remote): no gate at all.
  //    An approved-WFH override always waives the gate (the employee is off-site).
  let wifiValidated = false
  if (!wfhOverride && settings.office_ip_cidr) {
    const forwarded = req.headers.get('X-Forwarded-For')
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : ''
    const inOffice = !!clientIp && ipInCidr(clientIp, settings.office_ip_cidr)

    if (policy.require_office_network) {
      if (!inOffice) {
        return json({
          error: 'Check-in is only allowed from the office network.',
          code: 'wrong_network',
        }, 403)
      }
      wifiValidated = true
    } else if (policy.auto_detect_network) {
      // Hybrid: record whether they're physically on the office network, but
      // accept the check-in regardless of location.
      wifiValidated = inOffice
    }
  }

  // 7. Device gating (register-first model)
  // Devices are no longer auto-enrolled on check-in. An employee must self-register a
  // device and have an admin approve it first; admins/super-admins are auto-approved.
  const deviceFlagged = false

  if (privileged) {
    // Admins/super-admins silently auto-approve their own device — no notification.
    await supabase.from('enrolled_devices').upsert(
      {
        profile_id: profileId,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        fingerprint_hint: fingerprintHint,
        is_active: true,
        approved_by: profileId,
        approved_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,device_fingerprint' },
    )
  } else {
    const { data: device } = await supabase
      .from('enrolled_devices')
      .select('id, is_active, approved_by')
      .eq('profile_id', profileId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle()

    if (!device) {
      return json({
        error: 'This device is not registered. Register it on the Attendance page and ask an admin to approve it before checking in.',
        code: 'device_unregistered',
      }, 403)
    }
    if (!device.is_active) {
      return json({
        error: 'This device has been blocked by an admin. Contact your admin or use an approved device to check in.',
        code: 'device_blocked',
      }, 403)
    }
    if (!device.approved_by) {
      return json({
        error: 'This device is awaiting admin approval. You can check in once it has been approved.',
        code: 'device_pending',
      }, 403)
    }

    await supabase
      .from('enrolled_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device.id)
  }

  // 8. Write attendance.
  const checkInTime = new Date().toISOString()

  // 8a. WFH override — keep status 'wfh' and source 'system' (so the BEFORE-UPDATE status
  //     trigger, which only acts on source='self', won't overwrite it) and record hours.
  //     No LP: the on-time LP trigger is AFTER INSERT only, and WFH is not an arrival.
  if (wfhOverride && existing) {
    const { data: updated, error: updErr } = await supabase
      .from('attendance')
      .update({
        check_in: checkInTime,
        device_name: deviceName,
        device_fingerprint: deviceFingerprint,
        wifi_validated: false,
        device_flagged: deviceFlagged,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (updErr) return json({ error: updErr.message }, 500)
    return json({
      status: updated.status,
      check_in: updated.check_in,
      device_flagged: updated.device_flagged,
    }, 200)
  }

  // With schedule enforcement off, there is no late penalty — always 'present'.
  const attendanceStatus = !policy.enforce_schedule_window || localMinutes <= lateCutoff
    ? 'present'
    : 'late'

  // 8b. Override a non-blocking system row (e.g. 'absent') with a real self check-in.
  if (existing) {
    const { data: updated, error: updErr } = await supabase
      .from('attendance')
      .update({
        check_in: checkInTime,
        source: 'self',
        status: attendanceStatus,
        device_name: deviceName,
        device_fingerprint: deviceFingerprint,
        wifi_validated: wifiValidated,
        device_flagged: deviceFlagged,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (updErr) return json({ error: updErr.message }, 500)
    return json({
      status: updated.status,
      check_in: updated.check_in,
      device_flagged: updated.device_flagged,
    }, 200)
  }

  // 8c. Normal first check-in of the day (fires the on-time LP trigger when present).
  const { data: inserted, error: insertError } = await supabase
    .from('attendance')
    .insert({
      profile_id: profileId,
      date: today,
      check_in: checkInTime,
      source: 'self',
      status: attendanceStatus,
      device_name: deviceName,
      device_fingerprint: deviceFingerprint,
      wifi_validated: wifiValidated,
      device_flagged: deviceFlagged,
    })
    .select()
    .single()

  if (insertError) return json({ error: insertError.message }, 500)

  return json({
    status: inserted.status,
    check_in: inserted.check_in,
    device_flagged: inserted.device_flagged,
  }, 200)
})
