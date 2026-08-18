import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DEFAULT_POLICY,
  checkDayGates,
  classifyExistingRow,
  computeStatus,
  fmtHHMM,
  ipInCidr,
  localParts,
  resolveCutoffs,
} from '../_shared/attendancePolicy.ts'

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
    .select('role, job_type, allowed_check_in, attendance_excluded')
    .eq('id', profileId)
    .maybeSingle()
  const privileged = callerProfile?.role === 'admin' || callerProfile?.role === 'super_admin'

  // Employees exempt from attendance (e.g. CEO/COO) never check in.
  if (callerProfile?.attendance_excluded) {
    return json({ error: 'You are exempt from attendance and do not need to check in.', code: 'attendance_exempt' }, 403)
  }

  // Per-job-type attendance policy (network gate + schedule-window enforcement).
  // Fall back to the strict on-site defaults if the row is missing.
  const jobType = callerProfile?.job_type ?? 'on_site'
  const { data: policyRow } = await supabase
    .from('job_type_policies')
    .select('require_office_network, auto_detect_network, enforce_schedule_window, attendance_via_terminal')
    .eq('job_type', jobType)
    .maybeSingle()
  const policy = policyRow ?? DEFAULT_POLICY

  // 3. Load settings
  const { data: settings, error: settingsError } = await supabase
    .from('attendance_settings')
    .select('*')
    .single()
  if (settingsError || !settings) return json({ error: 'Attendance settings not configured' }, 500)

  const tz = settings.timezone ?? 'Asia/Karachi'

  // 3a. Terminal routing — on-site staff mark attendance at the biometric
  //     terminal, not here. Enforced only while a terminal relay is actually
  //     alive; if every terminal has gone stale this falls through so a dead Pi
  //     can't strand anyone. get_my_terminal_gate() applies the same rule for the
  //     UI, and both read terminal_stale_min so they cannot disagree.
  if (policy.attendance_via_terminal) {
    const staleMin = settings.terminal_stale_min ?? 10
    const staleBefore = new Date(Date.now() - staleMin * 60_000).toISOString()
    const { data: liveTerminal } = await supabase
      .from('biometric_terminals')
      .select('name, location')
      .eq('is_active', true)
      .gte('last_heartbeat_at', staleBefore)
      .limit(1)
      .maybeSingle()

    if (liveTerminal) {
      const where = liveTerminal.location ?? liveTerminal.name
      return json({
        error: `Please check in at the biometric terminal (${where}).`,
        code: 'use_terminal',
      }, 403)
    }
  }

  // 4. Time window check
  const now = new Date()
  const { today, localMinutes, dayOfWeek } = localParts(now, tz)

  // 4a/4b. Weekend and holiday gates.
  const dayGate = await checkDayGates(supabase, today, dayOfWeek, settings)
  if (dayGate.blocked) {
    return json({ error: dayGate.message, code: dayGate.code }, 422)
  }

  // 4c. Late cutoff, layering per-employee allowance, a first-half day off and
  //     an approved late arrival.
  const { lateCutoff, openMinutes, endMinutes, lowerBoundActive } = await resolveCutoffs(
    supabase, profileId, today, settings, callerProfile?.allowed_check_in ?? null,
  )

  // Schedule-window enforcement is per-job-type. When disabled (e.g. flexible
  // remote/hybrid hours) the early/late bounds are skipped and the arrival is
  // never marked late. Weekend/holiday gates above still apply to everyone.
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
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, source, status, day_type, day_part, check_in')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()

  const existingKind = classifyExistingRow(existing)
  if (existingKind === 'duplicate') {
    return json({ error: 'Already checked in today', code: 'duplicate' }, 409)
  }
  if (existingKind === 'leave') {
    return json({ error: 'You are on approved leave today.', code: 'on_leave' }, 409)
  }
  const wfhOverride = existingKind === 'wfh'

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

  const attendanceStatus = computeStatus(localMinutes, lateCutoff, policy.enforce_schedule_window)

  // 8a/8b. One update path for every existing row — WFH, half-day leave, holiday or
  //        an absence placeholder. There used to be a separate WFH branch that
  //        deliberately withheld `status` to stop it clobbering the literal string
  //        'wfh' in the same column. day_type owns that fact now, so the arrival can
  //        always be recorded and WFH differs only in waiving the network check.
  //
  //        day_type and day_part are pointedly NOT in this payload: an arrival states
  //        who turned up and when, and nothing about what kind of day it is. That is
  //        what stops a check-in erasing an approved half day.
  if (existing) {
    const { data: updated, error: updErr } = await supabase
      .from('attendance')
      .update({
        check_in: checkInTime,
        source: 'self',
        status: attendanceStatus,
        device_name: deviceName,
        device_fingerprint: deviceFingerprint,
        wifi_validated: wfhOverride ? false : wifiValidated,
        device_flagged: deviceFlagged,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (updErr) return json({ error: updErr.message }, 500)
    return json({
      status: updated.status,
      day_type: updated.day_type,
      day_part: updated.day_part,
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
    day_type: inserted.day_type,
    day_part: inserted.day_part,
    check_in: inserted.check_in,
    device_flagged: inserted.device_flagged,
  }, 200)
})
