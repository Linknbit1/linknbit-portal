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
 * Checks if an IP address falls within a given CIDR range.
 * Supports IPv4 only (office networks are IPv4).
 */
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

  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let deviceFingerprint: string
  let deviceName: string
  try {
    const body = await req.json()
    deviceFingerprint = body.device_fingerprint
    deviceName = body.device_name
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!deviceFingerprint || !deviceName) {
    return json({ error: 'device_fingerprint and device_name are required' }, 400)
  }

  // ── 2. Auth — verify JWT and resolve profile ───────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Verify the JWT by calling auth.getUser
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
    .from('attendance_settings')
    .select('*')
    .single()

  if (settingsError || !settings) {
    return json({ error: 'Attendance settings not configured' }, 500)
  }

  const tz = settings.timezone ?? 'Asia/Karachi'

  // ── 4. Time window check ───────────────────────────────────────────────────
  const nowLocal = new Date().toLocaleString('en-US', { timeZone: tz })
  const localDate = new Date(nowLocal)
  const localTimeStr = localDate.toTimeString().substring(0, 5) // "HH:MM"

  const [startH, startM] = settings.work_start_time.split(':').map(Number)
  const [endH, endM] = settings.work_end_time.split(':').map(Number)
  const graceMin = settings.grace_period_min

  const localMinutes = localDate.getHours() * 60 + localDate.getMinutes()
  const startMinutes = startH * 60 + startM
  const lateCutoff = startMinutes + graceMin
  const endMinutes = endH * 60 + endM

  if (localMinutes < startMinutes || localMinutes > lateCutoff) {
    return json({
      error: `Check-in only allowed between ${settings.work_start_time} and ${String(Math.floor(lateCutoff / 60)).padStart(2, '0')}:${String(lateCutoff % 60).padStart(2, '0')} (${tz})`,
      code: 'outside_window',
    }, 422)
  }

  // ── 5. WiFi / IP check ─────────────────────────────────────────────────────
  let wifiValidated = false
  if (settings.office_ip_cidr) {
    const forwarded = req.headers.get('X-Forwarded-For')
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : ''
    if (!clientIp || !ipInCidr(clientIp, settings.office_ip_cidr)) {
      return json({
        error: 'Check-in is only allowed from the office network.',
        code: 'wrong_network',
      }, 403)
    }
    wifiValidated = true
  }

  // ── 6. Duplicate check ─────────────────────────────────────────────────────
  const today = new Date(nowLocal).toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return json({ error: 'Already checked in today', code: 'duplicate' }, 409)
  }

  // ── 7. Device enrollment check ─────────────────────────────────────────────
  let deviceFlagged = false

  const { data: matchedDevices } = await supabase
    .from('enrolled_devices')
    .select('id, profile_id, is_active')
    .eq('device_fingerprint', deviceFingerprint)
    .eq('is_active', true)

  if (!matchedDevices || matchedDevices.length === 0) {
    // Unknown device — upsert as pending (approved_by = NULL), flag attendance
    await supabase
      .from('enrolled_devices')
      .upsert(
        { profile_id: profileId, device_fingerprint: deviceFingerprint, device_name: deviceName, is_active: true },
        { onConflict: 'profile_id,device_fingerprint' },
      )
    deviceFlagged = true

    // Notify HR about unrecognised device
    const { data: hrProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['hr', 'admin', 'super_admin'])
    if (hrProfiles) {
      const notifications = hrProfiles.map((p: { id: string }) => ({
        profile_id: p.id,
        title: 'Unrecognised device check-in',
        body: `An employee checked in from an unrecognised device (${deviceName}). Review enrolled devices.`,
        resource_type: 'enrolled_device',
        resource_id: deviceFingerprint,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  } else {
    // Check if this fingerprint is registered to a DIFFERENT employee
    const foreign = matchedDevices.find((d: { profile_id: string }) => d.profile_id !== profileId)
    if (foreign) {
      deviceFlagged = true
    } else {
      // Update last_seen_at for this device
      await supabase
        .from('enrolled_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('device_fingerprint', deviceFingerprint)
    }
  }

  // ── 8. Insert attendance row ───────────────────────────────────────────────
  const checkInTime = new Date().toISOString()
  const attendanceStatus = localMinutes <= startMinutes ? 'present' : 'late'

  // Use service role client so the SECURITY DEFINER XP trigger fires correctly
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

  if (insertError) {
    return json({ error: insertError.message }, 500)
  }

  return json({
    status: inserted.status,
    check_in: inserted.check_in,
    device_flagged: inserted.device_flagged,
  }, 200)
})
