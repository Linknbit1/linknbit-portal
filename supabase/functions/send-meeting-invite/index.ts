import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Emails a calendar invitation for a BD meeting to the colleagues invited to it.
//
// Why an email at all, when the portal already notifies: a notification tells you
// a meeting exists, a calendar invitation puts it in the place you actually look
// on the morning of. The .ics attachment is the whole point — Outlook, Gmail and
// Apple Mail all offer "Add to calendar" off it, so nobody has to retype a time.
//
// Auth: called by a signed-in BD user right after they save a meeting. The caller
// is verified and then checked for can_view_bd, so this cannot be used as an open
// relay to email staff.
//
// Best-effort by design. The meeting and the in-portal notification are already
// committed by the time this runs; a Resend outage must not make saving a meeting
// fail, so every failure path returns 200 with `emailed: 0` and the client stays
// quiet about it.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//                   (all auto), RESEND_API_KEY, RESEND_FROM (optional),
//                   PUBLIC_SITE_URL (optional).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_SITE_URL = 'https://portal.linknbit.com'

const PLATFORM_LABEL: Record<string, string> = {
  zoom: 'Zoom',
  meet: 'Google Meet',
  phone: 'Phone',
  in_person: 'In person',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

/** iCalendar wants UTC basic format: 20260817T143000Z. */
function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Escape a value for an iCalendar text field. Backslash first, or it would
 * double-escape the sequences the later replacements introduce.
 */
function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * RFC 5545 caps a content line at 75 octets; longer lines must be folded with a
 * CRLF and a leading space. Outlook is the strict one — an unfolded long
 * DESCRIPTION is where "this invite won't open" usually comes from.
 */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74))
  return parts.join('\r\n')
}

interface IcsArgs {
  uid: string
  startIso: string
  durationMinutes: number
  summary: string
  description: string
  location: string
  organiserName: string
  organiserEmail: string
  attendees: { name: string; email: string }[]
  /** Bumped on every re-send so a calendar treats it as an update, not a duplicate. */
  sequence: number
}

function buildIcs(a: IcsArgs): string {
  const end = new Date(new Date(a.startIso).getTime() + a.durationMinutes * 60_000).toISOString()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Linknbit//Operations Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${a.uid}`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(a.startIso)}`,
    `DTEND:${icsStamp(end)}`,
    `SEQUENCE:${a.sequence}`,
    `SUMMARY:${icsText(a.summary)}`,
    `DESCRIPTION:${icsText(a.description)}`,
    `LOCATION:${icsText(a.location)}`,
    `ORGANIZER;CN=${icsText(a.organiserName)}:mailto:${a.organiserEmail}`,
    ...a.attendees.map(
      (p) =>
        `ATTENDEE;CN=${icsText(p.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${p.email}`,
    ),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  // CRLF throughout — Outlook rejects bare LF.
  return lines.map(fold).join('\r\n')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  let meetingId: string
  let recipientIds: string[]
  try {
    const body = await req.json()
    meetingId = String(body.meeting_id ?? '')
    recipientIds = Array.isArray(body.recipient_ids) ? body.recipient_ids.map(String) : []
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!meetingId) return json({ error: 'meeting_id is required' }, 400)
  if (recipientIds.length === 0) return json({ ok: true, emailed: 0 }, 200)

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const asCaller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    },
  )

  const { data: { user: caller }, error: authError } = await asCaller.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

  // Only someone who can open the BD module may send its invitations. Checked
  // through the caller's own client so RLS and the capability agree.
  const { data: canView } = await asCaller.rpc('bd_can_view')
  if (!canView) return json({ error: 'You do not have permission to send meeting invitations' }, 403)

  const { data: meeting } = await service
    .from('bd_meetings')
    .select('id, scheduled_at, duration_minutes, type, platform, join_url, client_attendees, host_id, updated_at, lead:bd_leads(company)')
    .eq('id', meetingId)
    .maybeSingle()
  if (!meeting) return json({ error: 'Meeting not found' }, 404)

  const { data: recipients } = await service
    .from('profiles')
    .select('id, name, email')
    .in('id', recipientIds)
    .eq('is_active', true)
  if (!recipients || recipients.length === 0) return json({ ok: true, emailed: 0 }, 200)

  const { data: host } = await service
    .from('profiles').select('name, email').eq('id', meeting.host_id ?? '').maybeSingle()

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    // Not an error: the portal notification has already gone out, and the whole
    // feature degrades to "in-portal only" until the secret is configured.
    return json({ ok: true, emailed: 0, reason: 'RESEND_API_KEY not configured' }, 200)
  }

  const from = Deno.env.get('RESEND_FROM') ?? 'Linknbit <onboarding@resend.dev>'
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? DEFAULT_SITE_URL
  // PostgREST returns an embedded to-one as an object, but has shipped it as a
  // single-element array in the past. Accept both rather than depend on it.
  const leadRel = meeting.lead
  const company = (Array.isArray(leadRel) ? leadRel[0]?.company : leadRel?.company) ?? 'a client'
  const platform = PLATFORM_LABEL[meeting.platform] ?? meeting.platform
  const organiserName = host?.name ?? 'Linknbit'
  const organiserEmail = host?.email ?? 'no-reply@linknbit.com'
  const location = meeting.join_url || platform
  const summary = `${company} — ${meeting.type} call`

  const when = new Date(meeting.scheduled_at).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi',
  })

  const descriptionLines = [
    `Client meeting with ${company}.`,
    `Platform: ${platform}`,
    meeting.join_url ? `Join: ${meeting.join_url}` : '',
    meeting.client_attendees ? `From the client: ${meeting.client_attendees}` : '',
    `Details: ${siteUrl}/my-meetings`,
  ].filter(Boolean)

  const ics = buildIcs({
    // Stable per meeting, so a re-send updates the existing calendar entry
    // instead of creating a second one.
    uid: `bd-meeting-${meeting.id}@linknbit.com`,
    startIso: meeting.scheduled_at,
    durationMinutes: meeting.duration_minutes,
    summary,
    description: descriptionLines.join('\n'),
    location,
    organiserName,
    organiserEmail,
    attendees: recipients.map((r) => ({ name: r.name, email: r.email })),
    // updated_at moves on every edit, so this rises monotonically per meeting —
    // which is exactly the contract SEQUENCE has.
    sequence: Math.floor(new Date(meeting.updated_at ?? meeting.scheduled_at).getTime() / 1000),
  })
  const icsBase64 = btoa(ics)

  const joinButton = meeting.join_url
    ? `<p><a href="${meeting.join_url}" style="display:inline-block;background:#EE2737;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Join the meeting</a></p>`
    : ''

  let emailed = 0
  // One send per recipient rather than a single bcc: each person's calendar
  // client matches the ATTENDEE line to their own address, and a shared envelope
  // makes RSVP tracking meaningless.
  for (const r of recipients) {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="margin-bottom:4px">${summary}</h2>
        <p style="color:#555;margin-top:0">${when} (PKT) · ${meeting.duration_minutes} minutes</p>
        <p>Hi ${r.name}, ${organiserName} has added you to a client meeting.</p>
        <table style="font-size:14px;color:#333">
          <tr><td style="padding:2px 12px 2px 0;color:#888">Client</td><td>${company}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#888">Platform</td><td>${platform}</td></tr>
          ${meeting.client_attendees ? `<tr><td style="padding:2px 12px 2px 0;color:#888">Attending</td><td>${meeting.client_attendees}</td></tr>` : ''}
        </table>
        ${joinButton}
        <p style="color:#888;font-size:12px">
          The attached invitation adds this to your calendar. You can also see it in the portal under
          Workspace → My Meetings: <a href="${siteUrl}/my-meetings">${siteUrl}/my-meetings</a>
        </p>
      </div>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: r.email,
          subject: `Invitation: ${summary} — ${when}`,
          html,
          attachments: [{ filename: 'invite.ics', content: icsBase64 }],
        }),
      })
      if (res.ok) emailed += 1
    } catch {
      // Swallowed on purpose — see the best-effort note at the top.
    }
  }

  return json({ ok: true, emailed }, 200)
})
