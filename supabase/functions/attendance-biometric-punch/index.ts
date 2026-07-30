// Ingest for ZKTeco terminal punches relayed by the Raspberry Pi bridge.
//
// Contract with the Pi (see script/README.md):
//   Header: x-terminal-secret          (kept out of the body so it can't leak
//                                       into request-body logging)
//   Body:   { terminal, action: 'punches' | 'heartbeat' | 'roster', ... }
//
// The Pi is an at-least-once relay: it re-sends anything it hasn't seen acked,
// and the device keeps its own copy until we confirm. Everything here is
// therefore idempotent — punches dedupe on punch_uid, and a day's attendance is
// always *recomputed* from the full punch set rather than incrementally patched.
// That recompute is what prevents double-counting excluded_minutes against
// attendance-ooo, which increments the same column.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DEFAULT_POLICY,
  EXC_GRACE_MIN,
  checkDayGates,
  computeStatus,
  localParts,
  minutesOf,
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
 * Derivation:
 *   first punch            → check_in
 *   last punch             → check_out
 *   middle punches, paired → out/in gaps; gaps >= min_excluded_gap_min are
 *                            deducted as time out of office
 *
 * Ownership: the terminal fully owns a row that is absent or machine-written
 * ('system'/'biometric'). When a human record already exists ('self' portal
 * check-in during a relay outage, or an 'admin' correction) the terminal only
 * contributes check_out and excluded_minutes — it never rewrites check_in or
 * status, so a later punch can't turn someone's on-time arrival into a late one.
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
    await setResolution(allIds, 'ignored_unpaired')
    return
  }

  // ── Calendar gates. A punch on a non-working day is recorded and flagged,
  //    never turned into attendance: the person was physically here, but the
  //    day is not a working day and must not silently become one.
  const { dayOfWeek } = localParts(new Date(rows[0].punched_at), tz)
  const gate = await checkDayGates(db, date, dayOfWeek, settings)
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

  // ── Approved leave / WFH already own the day. Record and flag; never
  //    overwrite, since that would silently cancel an approved absence.
  const { data: existing } = await db
    .from('attendance')
    .select('id, source, status, check_in, check_out')
    .eq('profile_id', profileId)
    .eq('date', date)
    .maybeSingle()

  if (existing?.source === 'system' && (existing.status === 'leave' || existing.status === 'wfh')) {
    const onLeave = existing.status === 'leave'
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

  // ── Interpret the punch sequence.
  // If a human (portal/admin) check-in already exists, every terminal punch is a
  // post-check-in event: the latest is the check-out, and any earlier ones pair
  // up as out-of-office gaps. If the terminal owns the day, the first punch is
  // the check-in instead. This is what makes "check in on the portal, check out
  // on the finger" work — a lone terminal punch after a portal check-in is a
  // check-out, not a second check-in.
  const terminalOwnsRow = !existing || existing.source === 'system' || existing.source === 'biometric'
  const checkInCovered = !terminalOwnsRow && !!existing?.check_in

  const checkInPunch = checkInCovered ? null : rows[0]
  const checkOutPunch = checkInCovered || rows.length > 1 ? rows[rows.length - 1] : null
  const middle = checkInCovered
    ? rows.slice(0, rows.length - 1)
    : rows.slice(1, Math.max(1, rows.length - 1))

  const outIds: string[] = []
  const inIds: string[] = []
  const belowIds: string[] = []
  const unpairedIds: string[] = []
  const pairs: { outAt: string; inAt: string; minutes: number }[] = []

  for (let i = 0; i + 1 < middle.length; i += 2) {
    const a = middle[i]
    const b = middle[i + 1]
    const gap = Math.round(
      (new Date(b.punched_at).getTime() - new Date(a.punched_at).getTime()) / 60000,
    )
    if (gap >= settings.min_excluded_gap_min) {
      outIds.push(a.id)
      inIds.push(b.id)
      pairs.push({ outAt: a.punched_at, inAt: b.punched_at, minutes: gap })
    } else {
      // Double-taps and walk-pasts are noise, not an out-and-back.
      belowIds.push(a.id, b.id)
    }
  }

  // An odd number of middle punches means one exit never got a matching return
  // (or vice versa). Don't guess which — deduct only what pairs cleanly and
  // raise it for a human to correct.
  if (middle.length % 2 === 1) unpairedIds.push(middle[middle.length - 1].id)

  // ── Fill approved out-of-office exceptions from matching punch pairs, so the
  //    portal's OOO record and the physical record agree.
  const { data: exceptions } = await db
    .from('attendance_exceptions')
    .select('id, requested_time, actual_departure, actual_return')
    .eq('profile_id', profileId)
    .eq('date', date)
    .eq('exception_type', 'out_of_office')
    .eq('status', 'approved')

  const excs = exceptions ?? []
  const matchedPairs = new Set<number>()

  for (let pi = 0; pi < pairs.length; pi++) {
    const depMinutes = localParts(new Date(pairs[pi].outAt), tz).localMinutes
    const match = excs.find(
      (e) => !e.actual_departure &&
        Math.abs(minutesOf(e.requested_time) - depMinutes) <= EXC_GRACE_MIN,
    )
    if (!match) continue

    await db
      .from('attendance_exceptions')
      .update({ actual_departure: pairs[pi].outAt, actual_return: pairs[pi].inAt })
      .eq('id', match.id)

    // Mutate the local copy so a second pair can't claim the same exception,
    // and so the sum below counts it as exception-derived.
    match.actual_departure = pairs[pi].outAt
    match.actual_return = pairs[pi].inAt
    matchedPairs.add(pi)
  }

  // Excluded time is the union of two sources, counted once each:
  //   • completed OOO exceptions (portal-recorded, or just filled above) —
  //     keeps gaps that the terminal never saw, e.g. someone who left without
  //     punching out
  //   • punch pairs with no matching exception — unapproved absences
  const excludedFromExceptions = excs
    .filter((e) => e.actual_departure && e.actual_return)
    .reduce((sum, e) => sum + Math.round(
      (new Date(e.actual_return!).getTime() - new Date(e.actual_departure!).getTime()) / 60000,
    ), 0)

  const excludedFromPairs = pairs
    .filter((_, pi) => !matchedPairs.has(pi))
    .reduce((sum, p) => sum + p.minutes, 0)

  const excludedMinutes = excludedFromExceptions + excludedFromPairs

  // ── Status from the arrival time.
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
  const arrivalMinutes = localParts(new Date((checkInPunch ?? rows[0]).punched_at), tz).localMinutes
  const status = computeStatus(arrivalMinutes, lateCutoff, policy.enforce_schedule_window)

  // ── Write attendance.
  if (!existing) {
    await db.from('attendance').insert({
      profile_id: profileId,
      date,
      check_in: rows[0].punched_at,
      check_out: checkOutPunch?.punched_at ?? null,
      source: 'biometric',
      status,
      device_name: terminalName,
      // Standing at the terminal is stronger proof of presence than being on the
      // office WiFi, so the network gate is satisfied by definition.
      wifi_validated: true,
      device_flagged: false,
      excluded_minutes: excludedMinutes,
    })
  } else if (terminalOwnsRow) {
    await db
      .from('attendance')
      .update({
        check_in: rows[0].punched_at,
        check_out: checkOutPunch?.punched_at ?? existing.check_out,
        source: 'biometric',
        status,
        device_name: terminalName,
        wifi_validated: true,
        excluded_minutes: excludedMinutes,
      })
      .eq('id', existing.id)
  } else {
    // A human already recorded the check-in (portal, or an admin correction). The
    // terminal supplies the check-out — its latest punch, when that is after the
    // recorded check-in — plus any time out of office. A single terminal punch
    // counts: "check in on the portal, check out on the finger" is the common case.
    const checkOut =
      checkOutPunch &&
      (!existing.check_in ||
        new Date(checkOutPunch.punched_at) > new Date(existing.check_in))
        ? checkOutPunch.punched_at
        : existing.check_out
    await db
      .from('attendance')
      .update({
        check_out: checkOut,
        excluded_minutes: excludedMinutes,
      })
      .eq('id', existing.id)

    await auditOnce(db, {
      action: 'attendance.terminal_punch_alongside_manual_record',
      severity: 'info',
      summary: `Terminal supplied the check-out for ${subjectName ?? 'a member'} on ${date}; the existing ${existing.source} check-in was kept.`,
      flagReason: null,
      subjectId: profileId,
      subjectName,
      date,
      terminalName,
      context: { existing_source: existing.source },
    })
  }

  // ── Record how each punch was interpreted.
  if (checkInPunch) await setResolution([checkInPunch.id], 'check_in')
  if (checkOutPunch) await setResolution([checkOutPunch.id], 'check_out')
  await setResolution(outIds, 'ooo_out')
  await setResolution(inIds, 'ooo_in')
  await setResolution(belowIds, 'ignored_below_threshold')
  await setResolution(unpairedIds, 'ignored_unpaired')

  if (unpairedIds.length > 0) {
    await auditOnce(db, {
      action: 'attendance.terminal_unpaired_punch',
      severity: 'warning',
      summary: `${subjectName ?? 'A member'} has an unpaired mid-day punch on ${date} at ${terminalName}.`,
      flagReason: 'An exit or return punch is missing, so that gap was not deducted from worked hours. Verify the day manually.',
      subjectId: profileId,
      subjectName,
      date,
      terminalName,
      context: { punch_count: rows.length },
    })
  }
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
  if (action === 'heartbeat') {
    await db
      .from('biometric_terminals')
      .update({
        last_heartbeat_at: nowIso,
        last_poll_at: typeof body.last_poll_at === 'string' ? body.last_poll_at : nowIso,
        firmware: typeof body.firmware === 'string' ? body.firmware : null,
        serial_number: typeof body.serial_number === 'string' ? body.serial_number : null,
        device_ip: typeof body.device_ip === 'string' ? body.device_ip : null,
        device_log_count: typeof body.device_log_count === 'number' ? body.device_log_count : null,
        clock_skew_sec: typeof body.clock_skew_sec === 'number' ? body.clock_skew_sec : null,
        updated_at: nowIso,
      })
      .eq('id', terminal.id)

    return json({ ok: true }, 200)
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
      .filter((v: string) => v.length > 0),
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

  for (const raw of incoming) {
    const punch = raw as Record<string, unknown>
    const punchUid = typeof punch.punch_uid === 'string' ? punch.punch_uid : null
    const zkUserId = typeof punch.zk_user_id === 'string' ? punch.zk_user_id : String(punch.zk_user_id ?? '')
    const punchedAt = typeof punch.punched_at === 'string' ? punch.punched_at : null
    if (!punchUid || !zkUserId || !punchedAt) continue

    const at = new Date(punchedAt)
    if (Number.isNaN(at.getTime())) continue

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

  if (toInsert.length === 0) return json({ ok: true, accepted: 0, reconciled: 0 }, 200)

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
    unmatched: [...unmatched.keys()],
  }, 200)
})
