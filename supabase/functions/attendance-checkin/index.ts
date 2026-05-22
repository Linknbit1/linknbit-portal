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

  const [startH, startM] = settings.work_start_time.split(':').map(Number)
  const [endH, endM] = settings.work_end_time.split(':').map(Number)
  const graceMin = settings.grace_period_min

  const startMinutes = startH * 60 + startM
  const lateCutoff   = startMinutes + graceMin
  const endMinutes   = endH * 60 + endM

  if (localMinutes < startMinutes) {
    return json({
      error: `Check-in is not allowed before ${settings.work_start_time} (${tz})`,
      code: 'outside_window',
    }, 422)
  }
  if (localMinutes > endMinutes) {
    return json({
      error: `Check-in is not allowed after ${settings.work_end_time} (${tz})`,
      code: 'outside_window',
    }, 422)
  }

  // 5. WiFi / IP check
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

  // 6. Duplicate check
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()
  if (existing) {
    return json({ error: 'Already checked in today', code: 'duplicate' }, 409)
  }

  // 7. Device enrollment check
  let deviceFlagged = false

  // Block check-in if this profile's device was explicitly deactivated by HR/admin.
  // Must run before the active-device query so the auto-enroll upsert below never
  // re-activates a device that was intentionally blocked.
  const { data: blockedRecord } = await supabase
    .from('enrolled_devices')
    .select('id')
    .eq('profile_id', profileId)
    .eq('device_fingerprint', deviceFingerprint)
    .eq('is_active', false)
    .maybeSingle()

  if (blockedRecord) {
    return json({
      error: 'This device has been blocked by HR. Please contact HR or use an approved device to check in.',
      code: 'device_blocked',
    }, 403)
  }

  const { data: matchedDevices } = await supabase
    .from('enrolled_devices')
    .select('id, profile_id, is_active')
    .eq('device_fingerprint', deviceFingerprint)
    .eq('is_active', true)

  if (!matchedDevices || matchedDevices.length === 0) {
    await supabase
      .from('enrolled_devices')
      .upsert(
        { profile_id: profileId, device_fingerprint: deviceFingerprint, device_name: deviceName, is_active: true },
        { onConflict: 'profile_id,device_fingerprint' },
      )
    deviceFlagged = true

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
    const foreign = matchedDevices.find((d: { profile_id: string }) => d.profile_id !== profileId)
    if (foreign) {
      deviceFlagged = true
      // Enroll this user on the shared device as pending review
      await supabase
        .from('enrolled_devices')
        .upsert(
          { profile_id: profileId, device_fingerprint: deviceFingerprint, device_name: deviceName, is_active: true },
          { onConflict: 'profile_id,device_fingerprint' },
        )
    } else {
      await supabase
        .from('enrolled_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('device_fingerprint', deviceFingerprint)
    }
  }

  // 8. Insert attendance row
  const checkInTime = new Date().toISOString()
  const attendanceStatus = localMinutes <= lateCutoff ? 'present' : 'late'

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
