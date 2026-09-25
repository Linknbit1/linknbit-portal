// Ingest for ZKTeco terminal punches relayed by the Raspberry Pi bridge.
//
// Contract with the Pi (see script/README.md):
//   Header: x-terminal-secret          (kept out of the body so it can't leak
//                                       into request-body logging)
//   Body:   { terminal, action: 'punches' | 'heartbeat' | 'roster', ... }
//
// AUTH: verify_jwt MUST stay false on this function. The Pi is a device, not a
// signed-in user: it holds a terminal secret and no Supabase session, so a
// gateway JWT check 401s every request before this code runs and the terminal
// goes silent. Authentication is the secret_hash comparison below.
//
// The Pi is an at-least-once relay: it re-sends anything it hasn't seen acked,
// and the device keeps its own copy until we confirm. Everything here is
// therefore idempotent — punches dedupe on punch_uid, and a day's attendance is
// always *recomputed* from the full punch set rather than incrementally patched.
//
// Attendance model: only the morning check-in matters. The FIRST punch of the
// day is the arrival; the terminal never writes check_out (the day-end cron does
// that for every row) and never derives out-of-office time from punch patterns
// (that stays approval-driven). Every punch after the first is recorded raw but
// does not affect attendance.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DEFAULT_POLICY,
  checkDayGates,
  computeStatus,
  localParts,
  resolveCutoffs,
  type PolicySettings,
} from '../_shared/attendancePolicy.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-terminal-secret',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Both operands are fixed-length hex digests, but compare in constant time so a
// wrong secret can't be narrowed down by timing the response.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

interface PunchRow {
  id: string
  punched_at: string
}

/**
 * Writes an audit row for a terminal event, skipping it when an equivalent row
 * already exists for that member/date. Reconciliation re-runs on every poll, so
 * without this guard a single holiday punch would file a fresh danger flag
 * every 30 seconds.
 */
async function auditOnce(
  db: SupabaseClient,
  args: {
    action: string
    severity: 'info' | 'warning' | 'danger'
    summary: string
    flagReason: string | null
    subjectId: string | null
    subjectName: string | null
    date: string
    terminalName: string
    context?: Record<string, unknown>
  },
): Promise<void> {
  let probe = db
    .from('audit_log')
    .select('id')
    .eq('module', 'attendance')
    .eq('action', args.action)
    .eq('context->>date', args.date)

  if (args.subjectId === null) {
    // `subject_id = NULL` is never true in SQL, so an unmatched-enroll-number
    // event has to be matched with IS NULL plus the enroll number from context —
    // otherwise the dedupe silently fails and files a fresh row every poll.
    const zkUserId = args.context?.zk_user_id
    probe = probe.is('subject_id', null)
    if (typeof zkUserId === 'string') {
      probe = probe.eq('context->>zk_user_id', zkUserId)
    }
  } else {
    probe = probe.eq('subject_id', args.subjectId)
  }

  const existing = await probe.limit(1).maybeSingle()

  if (existing.data) return

  await db.from('audit_log').insert({
    module: 'attendance',
    table_name: 'biometric_punches',
    operation: 'INSERT',
    action: args.action,
    severity: args.severity,
    actor_id: null,
    actor_name: args.terminalName,
    actor_kind: 'device',
    subject_id: args.subjectId,
    subject_name: args.subjectName,
    summary: args.summary,
    flagged: args.severity !== 'info',
    flag_reason: args.flagReason,
    context: { date: args.date, terminal: args.terminalName, ...(args.context ?? {}) },
  })
}

/**
 * Recomputes one member's attendance for one date from the full punch set.
 *
 * The first punch of the day is the check-in; its time sets present/late via the
 * usual cutoffs. Later punches are recorded raw ('ignored_extra') but change
 * nothing — the terminal never writes check_out (the day-end cron owns that) and
 * never infers out-of-office time from punch patterns (approval-driven only).
 *
 * Ownership: the terminal owns a row that is absent or machine-written
 * ('system'/'biometric'). A human record ('self' portal check-in, or an 'admin'
 * correction) wins and is left untouched — a punch never rewrites it.
 */
async function reconcileDay(
  db: SupabaseClient,
  settings: PolicySettings,
  profileId: string,
  date: string,
  terminalName: string,
): Promise<void> {
  const tz = settings.timezone

  const { data: punches } = await db
    .from('biometric_punches')
    .select('id, punched_at')
    .eq('profile_id', profileId)
    .eq('local_date', date)
    .order('punched_at', { ascending: true })

  const rows: PunchRow[] = punches ?? []
  if (rows.length === 0) return

  const now = new Date().toISOString()
  const setResolution = async (ids: string[], resolution: string): Promise<void> => {
    if (ids.length === 0) return
    await db
      .from('biometric_punches')
      .update({ resolution, processed_at: now })
      .in('id', ids)
  }
  const allIds = rows.map((p) => p.id)

  const { data: profile } = await db
    .from('profiles')
    .select('name, job_type, allowed_check_in, attendance_excluded')
    .eq('id', profileId)
    .maybeSingle()

  const subjectName: string | null = profile?.name ?? null

  // Exempt members (e.g. CEO/COO) never get attendance rows at all.
  if (profile?.attendance_excluded) {
    await setResolution(allIds, 'ignored_exempt')
    return
  }

  // ── Calendar gates. A punch on a non-working day is recorded and flagged,
  //    never turned into attendance: the person was physically here, but the
  //    day is not a working day and must not silently become one.
  const { dayOfWeek } = localParts(new Date(rows[0].punched_at), tz)
  const gate = await checkDayGates(db, profileId, date, dayOfWeek, settings)
  if (gate.blocked) {
    await setResolution(allIds, gate.code === 'holiday' ? 'ignored_holiday' : 'ignored_weekend')
    await auditOnce(db, {
      action: 'attendance.terminal_punch_on_non_working_day',
      severity: 'danger',
      summary: `${subjectName ?? 'A member'} punched in at ${terminalName} on a non-working day (${date}).`,
      flagReason: gate.code === 'holiday'
        ? `Biometric punch recorded on a company holiday${gate.holidayName ? ` (${gate.holidayName})` : ''} — no attendance was created.`
        : 'Biometric punch recorded on a weekend / non-working day — no attendance was created.',
      subjectId: profileId,
      subjectName,
      date,
      terminalName,
      context: { punch_count: rows.length, gate: gate.code },
    })
    return
  }

  // ── A whole day off already owns the date. Record and flag; never overwrite,
  //    since that would silently cancel an approved absence.
  //
  //    Keyed off day_type, and only when day_part = 'full'. Previously this tested
  //    status === 'leave' || 'wfh', which meant a HALF-day leave (then status
  //    'half_day') matched neither branch, fell through, and had its status
  //    overwritten with present/late by the update below — the terminal silently
  //    cancelled the approved half day. A half day is now workable by design: the
  //    punch records the arrival and leaves day_type/day_part alone.
  const { data: existing } = await db
    .from('attendance')
    .select('id, source, status, day_type, day_part, check_in')
    .eq('profile_id', profileId)
    .eq('date', date)
    .maybeSingle()

  const fullDayOff = existing?.day_part === 'full'
    && (existing.day_type === 'leave' || existing.day_type === 'wfh')

  if (fullDayOff) {
    const onLeave = existing!.day_type === 'leave'
    await setResolution(allIds, onLeave ? 'ignored_leave' : 'ignored_wfh')
    await auditOnce(db, {
      action: onLeave ? 'attendance.terminal_punch_while_on_leave' : 'attendance.terminal_punch_while_wfh',
      severity: 'danger',
      summary: `${subjectName ?? 'A member'} punched in at ${terminalName} on ${date} while marked ${onLeave ? 'on leave' : 'WFH'}.`,
      flagReason: onLeave
        ? 'Biometric punch recorded while on approved leave — the leave record was left untouched.'
        : 'Biometric punch recorded at the office while approved for WFH — the WFH record was left untouched.',
      subjectId: profileId,
      subjectName,
      date,
      terminalName,
      context: { punch_count: rows.length },
    })
    return
  }

  // ── A human self/admin record wins; punches are then redundant. Terminal owns
  //    only an absent/machine-written row.
  //
  //    A leave sync now stamps day_type on a row without changing its source, so
  //    source still answers "who last recorded an arrival here" and stays the right
  //    test. A half-day leave row written by the sync is source='system', which the
  //    terminal owns — correct, since the punch is the arrival for the worked half.
  const terminalOwnsRow = !existing || existing.source === 'system' || existing.source === 'biometric'
  if (!terminalOwnsRow) {
    await setResolution(allIds, 'ignored_extra')
    return
  }

  // ── First punch = the arrival. Status from its time (a first-half day off
  //    moves the cutoff to the second half; a late-arrival exception still widens
  //    it; schedule-window-off job types are never late).
  const first = rows[0]
  const extraIds = rows.slice(1).map((p) => p.id)

  const jobType = profile?.job_type ?? 'on_site'
  const { data: policyRow } = await db
    .from('job_type_policies')
    .select('require_office_network, auto_detect_network, enforce_schedule_window, attendance_via_terminal')
    .eq('job_type', jobType)
    .maybeSingle()
  const policy = policyRow ?? DEFAULT_POLICY

  const { lateCutoff } = await resolveCutoffs(
    db, profileId, date, settings, profile?.allowed_check_in ?? null,
  )
  const arrivalMinutes = localParts(new Date(first.punched_at), tz).localMinutes
  const status = computeStatus(arrivalMinutes, lateCutoff, policy.enforce_schedule_window)

  // ── Write the check-in only. check_out is deliberately never set — the day-end
  //    cron records the end of day for every row, so biometric rows stay
  //    consistent with portal/absent ones. Standing at the terminal is stronger
  //    proof than office WiFi, so the network gate is satisfied by definition.
  //    day_type/day_part are absent from both payloads on purpose: a punch is
  //    evidence of an arrival and says nothing about what kind of day it is. On a
  //    half-day-leave row the sync's day_type='leave'/day_part survives untouched
  //    alongside the arrival this records.
  if (!existing) {
    await db.from('attendance').insert({
      profile_id: profileId,
      date,
      check_in: first.punched_at,
      source: 'biometric',
      status,
      device_name: terminalName,
      wifi_validated: true,
      device_flagged: false,
    })
  } else {
    await db
      .from('attendance')
      .update({
        check_in: first.punched_at,
        source: 'biometric',
        status,
        device_name: terminalName,
        wifi_validated: true,
      })
      .eq('id', existing.id)
  }

  // ── Record how each punch was interpreted: the first is the check-in, the
  //    rest are extra scans with no effect.
  await setResolution([first.id], 'check_in')
  await setResolution(extraIds, 'ignored_extra')
}

/**
 * Keeps attendance_settings.office_ip_cidr pointed at the office's real public IP.
 *
 * The office IP is an ISP lease: it changes whenever the router reboots, and
 * until someone retypes the CIDR by hand every on-site check-in is rejected as
 * 'wrong_network'. The fix costs nothing extra, because the Pi already
 * heartbeats from inside the office every minute — so THIS request's source
 * address IS the office's public IP, observed through exactly the same proxy
 * that stamps X-Forwarded-For on an employee's check-in. That is strictly
 * better than asking api.ipify.org: no third party, no outage surface, and the
 * value is measured by the same mechanism it will later be compared against.
 *
 * The Pi still resolves its own public IP independently and sends it as
 * `public_ip`; the SQL side treats a disagreement as "this terminal is reaching
 * us over some other network" and refuses to write, rather than risking locking
 * the office out. All of the decision (validation, prefix preservation, audit)
 * lives in fn_terminal_sync_office_ip — the CIDR maths is native to Postgres'
 * inet type, and the audit-suppression GUC only works in the same transaction
 * as the UPDATE.
 */
async function maintainOfficeIp(
  db: SupabaseClient,
  req: Request,
  terminalName: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  // Left-most X-Forwarded-For entry = the original client, i.e. the office's
  // WAN address. Read exactly as attendance-checkin reads it, so the two can
  // never disagree about what "the office IP" means.
  const forwarded = req.headers.get('X-Forwarded-For')
  const observedIp = forwarded ? forwarded.split(',')[0].trim() : ''
  if (!observedIp) return { status: 'no_client_ip' }

  const reportedIp = typeof body.public_ip === 'string' && body.public_ip.trim()
    ? body.public_ip.trim()
    : null

  const { data, error } = await db.rpc('fn_terminal_sync_office_ip', {
    p_terminal_name: terminalName,
    p_observed_ip: observedIp,
    p_reported_ip: reportedIp,
  })

  // A failure here must never fail the heartbeat: the heartbeat is what keeps
  // terminal-gated portal check-in open.
  if (error) return { status: 'error', message: error.message }
  return data
}

/**
 * Is this row a punch, or a piece of a packet?
 *
 * The relay lost byte alignment for five weeks and read packet headers as
 * records: 122 rows arrived with an enroll number starting at byte 0x01 (SOH,
 * the ZKTeco start marker) and a timestamp of 2000-01-01 — the device epoch,
 * which is what the clock reads when the timestamp bytes fail to decode. Two
 * more carried a real enroll number with that same epoch date, so neither field
 * can vouch for the other.
 *
 * Dropped here rather than left to the table's CHECK constraints, because the
 * insert is one batch: a single malformed frame would otherwise reject the whole
 * sync and take everybody else's punches down with it. The constraints stay as
 * the backstop for anything this misses.
 */
function isPlausiblePunch(zkUserId: string, at: Date): boolean {
  return /^[0-9]+$/.test(zkUserId) && at.getUTCFullYear() >= 2020
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const terminalSecret = req.headers.get('x-terminal-secret')
  if (!terminalSecret) return json({ error: 'Missing terminal secret' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  // The name is in the body rather than a header: HTTP headers are latin-1, and
  // terminal names legitimately contain characters outside it (e.g. an em dash).
  // Only the secret is header-borne, to keep it out of request-body logging.
  const terminalName = typeof body.terminal === 'string' ? body.terminal : null
  if (!terminalName) return json({ error: 'Missing terminal name' }, 400)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: terminal } = await db
    .from('biometric_terminals')
    .select('id, name, secret_hash, is_active')
    .eq('name', terminalName)
    .maybeSingle()

  if (!terminal || !terminal.is_active) {
    return json({ error: 'Unknown or inactive terminal' }, 401)
  }
  if (!safeEqual(await sha256Hex(terminalSecret), terminal.secret_hash)) {
    return json({ error: 'Invalid terminal secret' }, 401)
  }

  const action = typeof body.action === 'string' ? body.action : 'punches'
  const nowIso = new Date().toISOString()

  // ── Heartbeat: terminal health, and the signal attendance-checkin uses to
  //    decide whether portal check-in stays closed for terminal-gated staff.
  //    It also carries the office's public IP for free — see maintainOfficeIp.
  if (action === 'heartbeat') {
    // The Pi's device_ip is its LAN address (192.168.x) and is only ever a
    // health detail. A heartbeat that could not reach the device omits it
    // entirely, so absent fields must not clobber the last known good values.
    const health: Record<string, unknown> = {
      last_heartbeat_at: nowIso,
      last_poll_at: typeof body.last_poll_at === 'string' ? body.last_poll_at : nowIso,
      updated_at: nowIso,
    }
    if (typeof body.firmware === 'string') health.firmware = body.firmware
    if (typeof body.serial_number === 'string') health.serial_number = body.serial_number
    if (typeof body.device_ip === 'string') health.device_ip = body.device_ip
    if (typeof body.device_log_count === 'number') health.device_log_count = body.device_log_count
    if (typeof body.clock_skew_sec === 'number') health.clock_skew_sec = body.clock_skew_sec

    await db.from('biometric_terminals').update(health).eq('id', terminal.id)

    const officeIp = await maintainOfficeIp(db, req, terminal.name, body)

    return json({ ok: true, office_ip: officeIp }, 200)
  }

  // ── Roster: the device's enrolled users, so admins can link enroll numbers to
  //    members by name instead of typing raw numbers.
  if (action === 'roster') {
    const users = Array.isArray(body.users) ? body.users : []
    await db
      .from('biometric_terminals')
      .update({ device_roster: users, roster_synced_at: nowIso, updated_at: nowIso })
      .eq('id', terminal.id)

    return json({ ok: true, count: users.length }, 200)
  }

  if (action !== 'punches') return json({ error: `Unknown action '${action}'` }, 400)

  // ── Punch ingest.
  const incoming = Array.isArray(body.punches) ? body.punches : []
  if (incoming.length === 0) return json({ ok: true, accepted: 0, reconciled: 0 }, 200)

  const { data: settingsRow, error: settingsError } = await db
    .from('attendance_settings')
    .select('*')
    .single()
  if (settingsError || !settingsRow) {
    return json({ error: 'Attendance settings not configured' }, 500)
  }
  const settings: PolicySettings = settingsRow

  // Resolve enroll numbers → members in one query.
  const zkIds = [...new Set(
    incoming
      .map((p: Record<string, unknown>) => (typeof p.zk_user_id === 'string' ? p.zk_user_id : String(p.zk_user_id ?? '')))
      .filter((v: string) => /^[0-9]+$/.test(v)),
  )]

  const { data: linked } = await db
    .from('profiles')
    .select('id, name, zk_user_id')
    .in('zk_user_id', zkIds)

  const byZkId = new Map<string, { id: string; name: string }>()
  for (const p of linked ?? []) {
    if (p.zk_user_id) byZkId.set(p.zk_user_id, { id: p.id, name: p.name })
  }

  const toInsert: Record<string, unknown>[] = []
  const affected = new Map<string, { profileId: string; date: string }>()
  const unmatched = new Map<string, string>() // zk_user_id → local_date
  const malformed: string[] = []

  for (const raw of incoming) {
    const punch = raw as Record<string, unknown>
    const punchUid = typeof punch.punch_uid === 'string' ? punch.punch_uid : null
    const zkUserId = typeof punch.zk_user_id === 'string' ? punch.zk_user_id : String(punch.zk_user_id ?? '')
    const punchedAt = typeof punch.punched_at === 'string' ? punch.punched_at : null
    if (!punchUid || !zkUserId || !punchedAt) continue

    const at = new Date(punchedAt)
    if (Number.isNaN(at.getTime())) continue
    if (!isPlausiblePunch(zkUserId, at)) {
      if (malformed.length < 20) malformed.push(`${zkUserId} @ ${punchedAt}`)
      continue
    }

    // The local date is resolved here, never taken from the Pi, so the whole
    // system agrees on which day a punch belongs to.
    const { today: localDate } = localParts(at, settings.timezone)
    const member = byZkId.get(zkUserId)

    toInsert.push({
      punch_uid: punchUid,
      terminal_id: terminal.id,
      zk_user_id: zkUserId,
      profile_id: member?.id ?? null,
      punched_at: at.toISOString(),
      local_date: localDate,
      resolution: member ? 'pending' : 'unmatched_user',
      raw: punch,
    })

    if (member) {
      affected.set(`${member.id}|${localDate}`, { profileId: member.id, date: localDate })
    } else {
      unmatched.set(zkUserId, localDate)
    }
  }

  // Say so loudly: a relay producing garbage keeps producing it, and the only
  // person who can power-cycle the terminal is reading the audit log.
  if (malformed.length > 0) {
    await auditOnce(db, {
      action: 'attendance.terminal_malformed_punches',
      severity: 'warning',
      summary: `Terminal ${terminalName} sent ${malformed.length} unreadable punch${malformed.length === 1 ? '' : 'es'}, which were discarded.`,
      flagReason: 'The terminal relay is mis-reading the device log. Restart the relay; if it repeats, the terminal needs re-syncing.',
      subjectId: null,
      subjectName: null,
      date: localParts(new Date(nowIso), settings.timezone).today,
      terminalName,
      context: { samples: malformed },
    })
  }

  if (toInsert.length === 0) return json({ ok: true, accepted: 0, reconciled: 0, discarded: malformed.length }, 200)

  // punch_uid is UNIQUE; ignoreDuplicates makes a Pi retry a no-op.
  const { error: insertError } = await db
    .from('biometric_punches')
    .upsert(toInsert, { onConflict: 'punch_uid', ignoreDuplicates: true })

  if (insertError) return json({ error: insertError.message }, 500)

  for (const [zkUserId, date] of unmatched) {
    await auditOnce(db, {
      action: 'attendance.terminal_punch_unmatched_user',
      severity: 'warning',
      summary: `Terminal ${terminalName} reported a punch for enroll number ${zkUserId}, which is not linked to any member.`,
      flagReason: 'Unlinked enroll number — no attendance was recorded. Link it on the Attendance page.',
      subjectId: null,
      subjectName: null,
      date,
      terminalName,
      context: { zk_user_id: zkUserId },
    })
  }

  for (const { profileId, date } of affected.values()) {
    await reconcileDay(db, settings, profileId, date, terminal.name)
  }

  await db
    .from('biometric_terminals')
    .update({ last_poll_at: nowIso, last_heartbeat_at: nowIso, updated_at: nowIso })
    .eq('id', terminal.id)

  return json({
    ok: true,
    accepted: toInsert.length,
    reconciled: affected.size,
    discarded: malformed.length,
    unmatched: [...unmatched.keys()],
  }, 200)
})
