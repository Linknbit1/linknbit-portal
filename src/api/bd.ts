import { supabase } from '../lib/supabase'
import { randomUUID } from '../lib/uuid'
import type { Tables, TablesUpdate, Json } from '../types/database'
import type {
  Lead, LeadSocial, LeadDocument, LeadStage, LeadTemperature, IcpFit, BdChannel,
  BdActivity, BdActivityType, BdActivityOutcome,
  BdMeeting, MeetingType, MeetingPlatform,
  BdTask, BdTaskRecurrence, BdProject, BdDailyUpdate, BdTarget, BdHandoff, HandoffServicePlan, HandoffOutcome,
  BdUpdateSlot, BdUpdateHistoryDay, BdUpdateParticipant, BdUpdateParticipationMode,
  TaskStatus, ProjectStatus, Priority,
} from '../types'

/**
 * Business Development data access.
 *
 * Every function here is pure async — no React, no query client. The row → domain
 * mapping lives here too, because the shape the screens want (`ownerName` beside
 * `ownerId`, a checklist array on the task) is a read concern, not a component
 * concern, and doing it in one place keeps the nine BD screens agreeing on it.
 *
 * ── Ids are minted by the caller ─────────────────────────────────────────────
 * Create functions take the id rather than letting Postgres default it. That is
 * what makes the optimistic writes in src/hooks/useBd.ts honest: the row painted
 * into the cache carries the *same* id the server will store, so the reconciling
 * refetch is a no-op instead of a swap, and a card cannot be clicked between the
 * two and come back "not found".
 *
 * ── What is not stored ───────────────────────────────────────────────────────
 * Anything derivable is derived at read time, never written:
 *   lead.activityCount     ← count of that lead's activities
 *   project.progress/count ← its tasks
 *   target actuals         ← closed-won leads, activities, meetings
 * See the composition in src/context/BdContext.tsx. A stored aggregate is a
 * number that silently goes stale the first time someone edits the pipeline.
 */

/* ── People ──────────────────────────────────────────────────────────────── */

export interface BdPerson {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

/** Everyone holding BD access — the department, for every picker in the module. */
export async function fetchBdPeople(): Promise<BdPerson[]> {
  const { data, error } = await supabase.rpc('bd_people')
  if (error) throw error
  return data ?? []
}

/* ── Row types ───────────────────────────────────────────────────────────── */

type LeadRow = Tables<'bd_leads'>
type ActivityRow = Tables<'bd_activities'>
type MeetingRow = Tables<'bd_meetings'>
type TaskRow = Tables<'bd_tasks'>
type ProjectRow = Tables<'bd_projects'>
type UpdateRow = Tables<'bd_daily_updates'>
type TargetRow = Tables<'bd_targets'>
type HandoffRow = Tables<'bd_handoffs'>

/** The `id, name` shape every one of these queries joins a profile down to. */
interface PersonRef { id: string; name: string }

const personName = (p: PersonRef | null, fallback = 'Unassigned') => p?.name ?? fallback

/*
 * The CHECK constraints on these columns and the unions in src/types/index.ts are
 * the same list, but Postgres hands them back as plain `text`. These narrow one
 * to the other on the way in. A value outside the union can only mean the column
 * gained an option the app has not been taught yet, so each falls back to the
 * neutral member rather than throwing a screen away.
 */
const STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'meeting', 'proposal_sent', 'negotiation', 'won', 'lost', 'unqualified']
const CHANNELS: BdChannel[] = ['upwork', 'fiverr', 'linkedin', 'email', 'cold_call', 'inbound', 'referral']
const TEMPERATURES: LeadTemperature[] = ['hot', 'warm', 'cold']
const ICP_FITS: IcpFit[] = ['strong', 'partial', 'none']
const ACTIVITY_TYPES: BdActivityType[] = ['call', 'email', 'linkedin', 'meeting', 'proposal', 'note', 'stage_change']
const ACTIVITY_OUTCOMES: BdActivityOutcome[] = ['connected', 'no_response', 'follow_up', 'meeting_booked', 'not_interested']
const MEETING_TYPES: MeetingType[] = ['discovery', 'proposal', 'negotiation', 'kickoff', 'other']
const MEETING_PLATFORMS: MeetingPlatform[] = ['zoom', 'meet', 'phone', 'in_person']
const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PROJECT_STATUSES: ProjectStatus[] = ['in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const RECURRENCES: BdTaskRecurrence[] = ['once', 'daily', 'weekly', 'monthly']

function narrow<T extends string>(allowed: T[], value: string | null, fallback: T): T {
  return allowed.find((a) => a === value) ?? fallback
}

/**
 * Narrow a text[] column, dropping anything the app does not recognise instead
 * of substituting a fallback — an unknown channel in a list is noise, whereas an
 * unknown single value still has to render as *something*.
 */
function narrowAll<T extends string>(allowed: T[], values: string[]): T[] {
  return values.flatMap((v) => {
    const hit = allowed.find((a) => a === v)
    return hit ? [hit] : []
  })
}

/* ── Leads ───────────────────────────────────────────────────────────────── */

/**
 * Read a repeater column back out of jsonb.
 *
 * The column is a `Json` as far as the generated types are concerned, so every
 * row is checked rather than asserted: a hand-edited record, or one written by
 * an older client, must not take the pipeline down with it. Rows that do not
 * carry the fields this repeater needs are dropped, not rendered blank.
 */
function readRepeater<T>(value: Json, build: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return []
    const built = build(row as Record<string, unknown>)
    return built ? [built] : []
  })
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function readSocials(value: Json): LeadSocial[] {
  return readRepeater(value, (row) => {
    const url = str(row.url).trim()
    return url ? { id: str(row.id) || randomUUID(), url } : null
  })
}

function readDocuments(value: Json): LeadDocument[] {
  return readRepeater(value, (row) => {
    const url = str(row.url).trim()
    const title = str(row.title).trim()
    // Either half is enough. A title-less row is still a link worth opening, and
    // a link-less one still records that the document exists — which is exactly
    // the shape the department's proposal sheet is in, where the Drive column
    // names the file without giving its URL.
    return url || title ? { id: str(row.id) || randomUUID(), title, url } : null
  })
}

type LeadJoined = LeadRow & { owner: PersonRef | null }

const LEAD_SELECT = '*, owner:profiles!bd_leads_owner_id_fkey(id,name)'

export function mapLead(row: LeadJoined): Lead {
  return {
    id: row.id,
    company: row.company,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    email: row.email,
    phone: row.phone,
    channel: narrow(CHANNELS, row.channel, 'inbound'),
    services: row.services,
    industry: row.industry,
    icpFit: narrow(ICP_FITS, row.icp_fit, 'partial'),
    value: Number(row.value),
    valueCurrency: row.value_currency || 'PKR',
    // Rows predating the currency column were entered in PKR by definition.
    valueEntered: row.value_entered === null ? Number(row.value) : Number(row.value_entered),
    valueFxRate: row.value_fx_rate === null ? 1 : Number(row.value_fx_rate),
    stage: narrow(STAGES, row.stage, 'new'),
    position: Number(row.position ?? 0),
    temperature: narrow(TEMPERATURES, row.temperature, 'warm'),
    ownerId: row.owner_id ?? '',
    ownerName: personName(row.owner),
    addedOn: row.added_on,
    lastContacted: row.last_contacted,
    nextFollowUp: row.next_follow_up,
    closedAt: row.closed_at,
    lostReason: row.lost_reason ?? undefined,
    doc: row.doc,
    description: row.description ?? undefined,
    website: row.website ?? '',
    country: row.country ?? '',
    city: row.city ?? '',
    source: row.source ?? '',
    socials: readSocials(row.socials),
    documents: readDocuments(row.documents),
    // Filled in by the composition layer from the activity list — see the file header.
    activityCount: 0,
  }
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('bd_leads')
    .select(LEAD_SELECT)
    // Board order first, so "Manual order" needs no client-side sort; created_at
    // still decides between two cards that share a position (imported batches).
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapLead)
}

/** Domain patch → column patch. Only the keys present are written. */
export function leadPatchToRow(patch: Partial<Lead>): TablesUpdate<'bd_leads'> {
  const row: TablesUpdate<'bd_leads'> = {}
  if (patch.company !== undefined) row.company = patch.company
  if (patch.contactName !== undefined) row.contact_name = patch.contactName
  if (patch.contactTitle !== undefined) row.contact_title = patch.contactTitle
  if (patch.email !== undefined) row.email = patch.email
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.channel !== undefined) row.channel = patch.channel
  if (patch.services !== undefined) row.services = patch.services
  if (patch.industry !== undefined) row.industry = patch.industry
  if (patch.icpFit !== undefined) row.icp_fit = patch.icpFit
  // The four value columns move together: `value` is the PKR figure reports sum,
  // and the rest are the receipt for how it was arrived at. Writing one without
  // the others is what would let a card claim $1,550 while the funnel counted
  // 1,550. The conversion itself happens where the live rates are — see
  // useCurrencyRates — so this layer only records the answer.
  if (patch.valueEntered !== undefined || patch.value !== undefined) {
    const rate = patch.valueFxRate ?? 1
    const entered = patch.valueEntered ?? patch.value ?? 0
    row.value_currency = patch.valueCurrency ?? 'PKR'
    row.value_entered = entered
    row.value_fx_rate = rate
    row.value = patch.value ?? Math.round(entered * rate)
  }
  if (patch.stage !== undefined) row.stage = patch.stage
  if (patch.position !== undefined) row.position = patch.position
  if (patch.temperature !== undefined) row.temperature = patch.temperature
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId || null
  if (patch.addedOn !== undefined) row.added_on = patch.addedOn
  if (patch.lastContacted !== undefined) row.last_contacted = patch.lastContacted || null
  if (patch.nextFollowUp !== undefined) row.next_follow_up = patch.nextFollowUp
  if (patch.lostReason !== undefined) row.lost_reason = patch.lostReason ?? null
  if (patch.doc !== undefined) row.doc = patch.doc
  if (patch.description !== undefined) row.description = patch.description ?? null
  if (patch.website !== undefined) row.website = patch.website
  if (patch.country !== undefined) row.country = patch.country
  if (patch.city !== undefined) row.city = patch.city
  if (patch.source !== undefined) row.source = patch.source
  // Both repeaters are written whole. Empty rows are dropped on the way out, so
  // a half-filled row left behind in the form never reaches the database.
  if (patch.socials !== undefined) {
    row.socials = patch.socials
      .filter((s) => s.url.trim())
      .map((s) => ({ id: s.id, url: s.url.trim() }))
  }
  if (patch.documents !== undefined) {
    row.documents = patch.documents
      .filter((d) => d.url.trim() || d.title.trim())
      .map((d) => ({ id: d.id, title: d.title.trim(), url: d.url.trim() }))
  }
  return row
}

export async function createLead(lead: Lead, createdBy: string | null): Promise<void> {
  const { error } = await supabase
    .from('bd_leads')
    .insert({ id: lead.id, ...leadPatchToRow(lead), company: lead.company, created_by: createdBy })
  if (error) throw error
}

/**
 * Insert a batch of leads in one round trip.
 *
 * One statement, not a loop: a CSV import is all-or-nothing on purpose, so a
 * connection dropped halfway cannot leave half a spreadsheet in the pipeline
 * with no way to tell which half. Rows are validated before they get here.
 */
export async function importLeads(leads: Lead[], createdBy: string | null): Promise<void> {
  if (leads.length === 0) return
  const { error } = await supabase
    .from('bd_leads')
    .insert(leads.map((lead) => ({ id: lead.id, ...leadPatchToRow(lead), company: lead.company, created_by: createdBy })))
  if (error) throw error
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  const { error } = await supabase.from('bd_leads').update(leadPatchToRow(patch)).eq('id', id)
  if (error) throw error
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('bd_leads').delete().eq('id', id)
  if (error) throw error
}

/* ── Activities ──────────────────────────────────────────────────────────── */

type ActivityJoined = ActivityRow & { by: PersonRef | null }

const ACTIVITY_SELECT = '*, by:profiles!bd_activities_by_id_fkey(id,name)'

export function mapActivity(row: ActivityJoined): BdActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    channel: narrow(CHANNELS, row.channel, 'inbound'),
    type: narrow(ACTIVITY_TYPES, row.type, 'note'),
    at: row.occurred_at,
    outcome: row.outcome ? narrow(ACTIVITY_OUTCOMES, row.outcome, 'connected') : undefined,
    note: row.note,
    volume: row.volume,
    responses: row.responses,
    meetingsBooked: row.meetings_booked,
    leadsCreated: row.leads_created,
    byId: row.by_id ?? '',
    byName: personName(row.by, 'Someone'),
  }
}

export async function fetchActivities(): Promise<BdActivity[]> {
  const { data, error } = await supabase
    .from('bd_activities')
    .select(ACTIVITY_SELECT)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return data.map(mapActivity)
}

export async function createActivity(activity: BdActivity): Promise<void> {
  const { error } = await supabase.from('bd_activities').insert({
    id: activity.id,
    lead_id: activity.leadId,
    channel: activity.channel,
    type: activity.type,
    occurred_at: activity.at,
    outcome: activity.outcome ?? null,
    note: activity.note,
    volume: activity.volume,
    responses: activity.responses,
    meetings_booked: activity.meetingsBooked,
    leads_created: activity.leadsCreated,
    by_id: activity.byId || null,
  })
  if (error) throw error
}

/* ── Meetings ────────────────────────────────────────────────────────────── */

type MeetingJoined = MeetingRow & {
  host: PersonRef | null
  lead: { id: string; company: string } | null
  attendees: { profile: PersonRef | null }[]
}

const MEETING_SELECT =
  '*, host:profiles!bd_meetings_host_id_fkey(id,name), lead:bd_leads!bd_meetings_lead_id_fkey(id,company), attendees:bd_meeting_attendees(profile:profiles(id,name))'

export function mapMeeting(row: MeetingJoined): BdMeeting {
  return {
    id: row.id,
    leadId: row.lead_id ?? '',
    company: row.lead?.company ?? '',
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    type: narrow(MEETING_TYPES, row.type, 'discovery'),
    hostId: row.host_id ?? '',
    hostName: personName(row.host),
    internalAttendees: row.attendees.flatMap((a) => (a.profile ? [{ id: a.profile.id, name: a.profile.name }] : [])),
    clientAttendees: row.client_attendees,
    platform: narrow(MEETING_PLATFORMS, row.platform, 'meet'),
    joinUrl: row.join_url ?? undefined,
    outcome: row.outcome ?? undefined,
    nextStep: row.next_step ?? undefined,
  }
}

export async function fetchMeetings(): Promise<BdMeeting[]> {
  const { data, error } = await supabase
    .from('bd_meetings')
    .select(MEETING_SELECT)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data.map(mapMeeting)
}

/**
 * Insert-or-update in one call, plus the attendee rows.
 *
 * Returns the ids of people **newly** added, so the caller can email exactly
 * them and nobody else.
 *
 * ── Why the guest list is diffed rather than replaced ────────────────────────
 * It used to be a delete-then-insert of the whole list, which was fine while
 * nothing watched the table. It is not fine now: an AFTER INSERT trigger on
 * bd_meeting_attendees notifies the invitee, so replacing the list would ping
 * every attendee again every time somebody fixed a typo in the meeting's notes.
 * Diffing means only a genuinely new row is written, and only a genuinely new
 * guest hears about it.
 */
export async function saveMeeting(
  meeting: BdMeeting,
  actorId: string | null,
): Promise<{ addedAttendeeIds: string[] }> {
  const { error } = await supabase.from('bd_meetings').upsert({
    id: meeting.id,
    lead_id: meeting.leadId || null,
    scheduled_at: meeting.scheduledAt,
    duration_minutes: meeting.durationMinutes,
    type: meeting.type,
    host_id: meeting.hostId || null,
    client_attendees: meeting.clientAttendees,
    platform: meeting.platform,
    join_url: meeting.joinUrl?.trim() || null,
    outcome: meeting.outcome ?? null,
    next_step: meeting.nextStep ?? null,
    created_by: actorId,
  })
  if (error) throw error

  const { data: existingRows, error: exErr } = await supabase
    .from('bd_meeting_attendees')
    .select('profile_id')
    .eq('meeting_id', meeting.id)
  if (exErr) throw exErr

  const before = new Set((existingRows ?? []).map((r) => r.profile_id))
  const after = new Set(meeting.internalAttendees.map((a) => a.id))

  const removed = [...before].filter((id) => !after.has(id))
  const added = [...after].filter((id) => !before.has(id))

  if (removed.length > 0) {
    const { error: delErr } = await supabase
      .from('bd_meeting_attendees')
      .delete()
      .eq('meeting_id', meeting.id)
      .in('profile_id', removed)
    if (delErr) throw delErr
  }

  if (added.length > 0) {
    const { error: insErr } = await supabase
      .from('bd_meeting_attendees')
      .insert(added.map((id) => ({ meeting_id: meeting.id, profile_id: id })))
    if (insErr) throw insErr
  }

  return { addedAttendeeIds: added }
}

/**
 * Email a calendar invitation to the people just added to a meeting.
 *
 * Best-effort and deliberately un-awaited by the caller's success path: the
 * meeting is already saved and the in-portal notification already sent by the
 * time this runs, so a mail outage must not surface as "could not save".
 */
export async function sendMeetingInvites(meetingId: string, recipientIds: string[]): Promise<void> {
  if (recipientIds.length === 0) return
  await supabase.functions.invoke('send-meeting-invite', {
    body: { meeting_id: meetingId, recipient_ids: recipientIds },
  })
}

/**
 * The signed-in person's own client meetings, hosting or invited.
 *
 * Goes through an RPC rather than the table because /meetings is open to every
 * internal member and BD's tables are not — see the migration for why widening
 * the policies instead would have leaked the pipeline. Returns the same
 * `BdMeeting` shape so the card renders identically either way.
 */
export async function fetchMyMeetings(): Promise<BdMeeting[]> {
  const { data, error } = await supabase.rpc('my_bd_meetings')
  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    // The RPC deliberately does not return lead_id: an invitee has no business
    // opening the lead, so there is nothing to link to.
    leadId: '',
    company: row.company,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    type: narrow(MEETING_TYPES, row.type, 'discovery'),
    hostId: row.host_id ?? '',
    hostName: row.host_name,
    internalAttendees: parseAttendees(row.attendees),
    clientAttendees: row.client_attendees,
    platform: narrow(MEETING_PLATFORMS, row.platform, 'meet'),
    joinUrl: row.join_url ?? undefined,
    outcome: row.outcome ?? undefined,
    nextStep: row.next_step ?? undefined,
  }))
}

/** The RPC aggregates attendees into jsonb, so it arrives as untyped JSON. */
function parseAttendees(value: Json): { id: string; name: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      && typeof entry.id === 'string' && typeof entry.name === 'string'
      ? [{ id: entry.id, name: entry.name }]
      : [],
  )
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('bd_meetings').delete().eq('id', id)
  if (error) throw error
}

/* ── Projects ────────────────────────────────────────────────────────────── */

type ProjectJoined = ProjectRow & {
  owner: PersonRef | null
  members: { profile: PersonRef | null }[]
}

const PROJECT_SELECT =
  '*, owner:profiles!bd_projects_owner_id_fkey(id,name), members:bd_project_members(profile:profiles(id,name))'

export function mapProject(row: ProjectJoined): BdProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    doc: row.doc,
    ownerId: row.owner_id ?? '',
    ownerName: personName(row.owner),
    status: narrow(PROJECT_STATUSES, row.status, 'in_progress'),
    deadline: row.deadline,
    channels: narrowAll(CHANNELS, row.channels),
    members: row.members.flatMap((m) => (m.profile ? [{ id: m.profile.id, name: m.profile.name }] : [])),
    // Both derived from the campaign's tasks by the composition layer.
    progress: 0,
    taskCount: 0,
  }
}

export async function fetchBdProjects(): Promise<BdProject[]> {
  const { data, error } = await supabase
    .from('bd_projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapProject)
}

export function projectPatchToRow(patch: Partial<BdProject>): TablesUpdate<'bd_projects'> {
  const row: TablesUpdate<'bd_projects'> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description ?? null
  if (patch.doc !== undefined) row.doc = patch.doc
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId || null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.deadline !== undefined) row.deadline = patch.deadline
  if (patch.channels !== undefined) row.channels = patch.channels
  return row
}

/**
 * Who must be on the roster whatever the form said.
 *
 * A campaign is only visible to its team now, so dropping the owner off it would
 * hide their own campaign from them — and dropping the creator would do the same
 * to whoever made it. The database seeds both on insert; this keeps them there
 * through the delete-and-replace that every member edit performs.
 *
 * `created_by` is not sent on update at all: the column means "who created
 * this", and a BEFORE UPDATE trigger pins it regardless of what a caller sends.
 */
function withPinnedMembers(project: BdProject, actorId: string | null): string[] {
  const ids = new Set(project.members.map((m) => m.id))
  if (project.ownerId) ids.add(project.ownerId)
  if (actorId) ids.add(actorId)
  return [...ids]
}

/** Upsert the campaign and replace its member list — same reasoning as meetings. */
export async function saveBdProject(project: BdProject, actorId: string | null): Promise<void> {
  const { error } = await supabase
    .from('bd_projects')
    .upsert({ id: project.id, ...projectPatchToRow(project), name: project.name, created_by: actorId })
  if (error) throw error

  const { error: delErr } = await supabase.from('bd_project_members').delete().eq('project_id', project.id)
  if (delErr) throw delErr

  const memberIds = withPinnedMembers(project, actorId)
  if (memberIds.length > 0) {
    const { error: insErr } = await supabase
      .from('bd_project_members')
      .insert(memberIds.map((id) => ({ project_id: project.id, profile_id: id })))
    if (insErr) throw insErr
  }
}

export async function updateBdProject(id: string, patch: Partial<BdProject>): Promise<void> {
  const row = projectPatchToRow(patch)
  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from('bd_projects').update(row).eq('id', id)
    if (error) throw error
  }
  if (patch.members !== undefined) {
    // Read the two people who cannot be taken off the roster before replacing it.
    // Costs one small select on an infrequent action, and is what stops the Team
    // tab from hiding a campaign from its own owner — see withPinnedMembers.
    const { data: pins, error: pinErr } = await supabase
      .from('bd_projects').select('owner_id,created_by').eq('id', id).single()
    if (pinErr) throw pinErr

    const { error: delErr } = await supabase.from('bd_project_members').delete().eq('project_id', id)
    if (delErr) throw delErr

    const ids = new Set(patch.members.map((m) => m.id))
    if (pins.owner_id) ids.add(pins.owner_id)
    if (pins.created_by) ids.add(pins.created_by)
    if (ids.size > 0) {
      const { error: insErr } = await supabase
        .from('bd_project_members')
        .insert([...ids].map((profileId) => ({ project_id: id, profile_id: profileId })))
      if (insErr) throw insErr
    }
  }
}

export async function deleteBdProject(id: string): Promise<void> {
  const { error } = await supabase.from('bd_projects').delete().eq('id', id)
  if (error) throw error
}

/* ── Tasks ───────────────────────────────────────────────────────────────── */

type TaskJoined = TaskRow & {
  assignee: PersonRef | null
  creator: PersonRef | null
  project: { id: string; name: string } | null
  lead: { id: string; company: string } | null
  checklist: { id: string; label: string; done: boolean; position: number }[]
}

const TASK_SELECT =
  '*, assignee:profiles!bd_tasks_assignee_id_fkey(id,name), creator:profiles!bd_tasks_created_by_fkey(id,name), project:bd_projects!bd_tasks_project_id_fkey(id,name), lead:bd_leads!bd_tasks_lead_id_fkey(id,company), checklist:bd_task_checklist(id,label,done,position)'

export function mapTask(row: TaskJoined): BdTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    doc: row.doc,
    assigneeId: row.assignee_id ?? '',
    assigneeName: personName(row.assignee),
    status: narrow(TASK_STATUSES, row.status, 'todo'),
    priority: narrow(PRIORITIES, row.priority, 'medium'),
    dueDate: row.due_date,
    projectId: row.project_id,
    projectName: row.project?.name ?? '',
    leadId: row.lead_id ?? undefined,
    leadCompany: row.lead?.company,
    channel: row.channel ? narrow(CHANNELS, row.channel, 'inbound') : undefined,
    recurrence: narrow(RECURRENCES, row.recurrence, 'once'),
    position: row.position,
    createdBy: personName(row.creator, 'Someone'),
    createdById: row.creator?.id,
    checklist: [...row.checklist]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, label: c.label, done: c.done })),
  }
}

export async function fetchBdTasks(): Promise<BdTask[]> {
  const { data, error } = await supabase
    .from('bd_tasks')
    .select(TASK_SELECT)
    .order('position', { ascending: true })
  if (error) throw error
  return data.map(mapTask)
}

export function taskPatchToRow(patch: Partial<BdTask>): TablesUpdate<'bd_tasks'> {
  const row: TablesUpdate<'bd_tasks'> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description ?? null
  if (patch.doc !== undefined) row.doc = patch.doc
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId || null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate
  if (patch.projectId !== undefined) row.project_id = patch.projectId
  if (patch.leadId !== undefined) row.lead_id = patch.leadId ?? null
  if (patch.channel !== undefined) row.channel = patch.channel ?? null
  if (patch.recurrence !== undefined) row.recurrence = patch.recurrence
  if (patch.position !== undefined) row.position = patch.position
  return row
}

export async function createBdTask(task: BdTask, createdBy: string | null): Promise<void> {
  const { error } = await supabase
    .from('bd_tasks')
    .insert({ id: task.id, ...taskPatchToRow(task), title: task.title, project_id: task.projectId, created_by: createdBy })
  if (error) throw error
  await replaceChecklist(task.id, task.checklist)
}

export async function updateBdTask(id: string, patch: Partial<BdTask>): Promise<void> {
  const row = taskPatchToRow(patch)
  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from('bd_tasks').update(row).eq('id', id)
    if (error) throw error
  }
  if (patch.checklist !== undefined) await replaceChecklist(id, patch.checklist)
}

export async function deleteBdTask(id: string): Promise<void> {
  const { error } = await supabase.from('bd_tasks').delete().eq('id', id)
  if (error) throw error
}

/**
 * Checklists are written as a set, not item by item.
 *
 * The drawer hands over the whole list on every change (add, rename, remove),
 * and an upsert keyed on the item id keeps ticks stable while the delete clears
 * anything the user removed. Two statements instead of a diff of three.
 */
async function replaceChecklist(taskId: string, items: { id: string; label: string; done: boolean }[]): Promise<void> {
  const keep = items.map((i) => i.id)
  const del = supabase.from('bd_task_checklist').delete().eq('task_id', taskId)
  const { error: delErr } = keep.length > 0 ? await del.not('id', 'in', `(${keep.join(',')})`) : await del
  if (delErr) throw delErr

  if (items.length === 0) return
  const { error } = await supabase
    .from('bd_task_checklist')
    .upsert(items.map((i, idx) => ({ id: i.id, task_id: taskId, label: i.label, done: i.done, position: idx })))
  if (error) throw error
}

/** Tick one item without rewriting the list — the highest-frequency BD write. */
export async function setChecklistItemDone(itemId: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('bd_task_checklist').update({ done }).eq('id', itemId)
  if (error) throw error
}

/* ── Daily updates ───────────────────────────────────────────────────────── */

type UpdateJoined = UpdateRow & { rep: PersonRef | null }

const UPDATE_SELECT = '*, rep:profiles!bd_daily_updates_rep_id_fkey(id,name)'

export function mapUpdate(row: UpdateJoined): BdDailyUpdate {
  return {
    id: row.id,
    repId: row.rep_id,
    repName: personName(row.rep),
    date: row.update_date,
    submittedAt: row.submitted_at,
    platforms: narrowAll(CHANNELS, row.platforms),
    summary: row.summary,
    proposalsSent: row.proposals_sent,
    callsMade: row.calls_made,
    meetingsHeld: row.meetings_held,
    leadsAdded: row.leads_added,
  }
}

export async function fetchDailyUpdates(): Promise<BdDailyUpdate[]> {
  const { data, error } = await supabase
    .from('bd_daily_updates')
    .select(UPDATE_SELECT)
    .order('update_date', { ascending: false })
  if (error) throw error
  return data.map(mapUpdate)
}

/**
 * Am I expected to file one? Settings-driven, like the standup equivalent, so
 * the page asks the database instead of restating the rule as a role list.
 */
export async function fetchAmIBdUpdateParticipant(): Promise<boolean> {
  const { data, error } = await supabase.rpc('am_i_bd_update_participant')
  if (error) throw error
  return data ?? false
}

/**
 * Everyone who owes an update on `date`, filed or not.
 *
 * Deliberately not derived from the BD people list: that is everyone who can
 * *see* the module, which includes admins through the administrator wildcard,
 * and chasing them for a check-in they were never expected to write was the
 * original complaint.
 */
export async function fetchBdUpdateRoster(date: string): Promise<BdUpdateSlot[]> {
  const { data, error } = await supabase.rpc('bd_update_roster', { p_date: date })
  if (error) throw error
  return (data ?? []).map((row) => ({
    repId: row.profile_id,
    repName: row.profile_name,
    avatarUrl: row.avatar_url,
    isWorkingDay: row.is_working_day,
    update: row.update_id
      ? {
          id: row.update_id,
          repId: row.profile_id,
          repName: row.profile_name,
          date,
          submittedAt: row.submitted_at,
          platforms: narrowAll(CHANNELS, row.platforms ?? []),
          summary: row.summary ?? '',
          proposalsSent: row.proposals_sent ?? 0,
          callsMade: row.calls_made ?? 0,
          meetingsHeld: row.meetings_held ?? 0,
          leadsAdded: row.leads_added ?? 0,
        }
      : null,
  }))
}

/** One person's day-by-day history across a date range, gaps included. */
export async function fetchBdUpdateHistory(
  profileId: string,
  from: string,
  to: string,
): Promise<BdUpdateHistoryDay[]> {
  const { data, error } = await supabase.rpc('bd_update_history', {
    p_profile: profileId, p_from: from, p_to: to,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    repId: profileId,
    repName: '',
    avatarUrl: null,
    date: row.update_date,
    isWorkingDay: row.is_working_day,
    isRequired: row.is_required,
    canEdit: row.can_edit,
    update: row.update_id
      ? {
          id: row.update_id,
          repId: profileId,
          repName: '',
          date: row.update_date,
          submittedAt: row.submitted_at,
          platforms: narrowAll(CHANNELS, row.platforms ?? []),
          summary: row.summary ?? '',
          proposalsSent: row.proposals_sent ?? 0,
          callsMade: row.calls_made ?? 0,
          meetingsHeld: row.meetings_held ?? 0,
          leadsAdded: row.leads_added ?? 0,
        }
      : null,
  }))
}

export async function fetchBdUpdateParticipants(): Promise<BdUpdateParticipant[]> {
  const { data, error } = await supabase.rpc('bd_update_participants_list')
  if (error) throw error
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    name: row.profile_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    hasGrant: row.has_grant,
    override: toParticipationMode(row.override),
    isRequired: row.is_required,
    note: row.note,
  }))
}

function toParticipationMode(value: string | null): BdUpdateParticipationMode {
  return value === 'required' || value === 'excluded' ? value : 'inherit'
}

export async function setBdUpdateParticipant(
  profileId: string,
  mode: BdUpdateParticipationMode,
  note?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_bd_update_participant', {
    p_profile: profileId, p_mode: mode, p_note: note ?? undefined,
  })
  if (error) throw error
}

/**
 * One check-in per rep per day, so this conflict-targets that pair rather than
 * the id: re-submitting today's update amends it instead of stacking a second
 * row that the whole page would then have to reconcile.
 */
export async function saveDailyUpdate(update: BdDailyUpdate): Promise<void> {
  // `id` is deliberately absent: on conflict this becomes an UPDATE, and sending
  // one would rewrite the existing row's primary key with a fresh client-minted
  // uuid every time somebody amends their check-in.
  const { error } = await supabase.from('bd_daily_updates').upsert({
    rep_id: update.repId,
    update_date: update.date,
    submitted_at: update.submittedAt,
    platforms: update.platforms,
    summary: update.summary,
    proposals_sent: update.proposalsSent,
    calls_made: update.callsMade,
    meetings_held: update.meetingsHeld,
    leads_added: update.leadsAdded,
  }, { onConflict: 'rep_id,update_date' })
  if (error) throw error
}

/* ── Targets ─────────────────────────────────────────────────────────────── */

type TargetJoined = TargetRow & { rep: PersonRef | null }

const TARGET_SELECT = '*, rep:profiles!bd_targets_rep_id_fkey(id,name)'

/** First day of the month a quota covers — the table's period key. */
export function currentPeriodMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function mapTarget(row: TargetJoined): BdTarget {
  return {
    repId: row.rep_id,
    repName: personName(row.rep),
    revenueTarget: Number(row.revenue_target),
    outreachTarget: row.outreach_target,
    meetingsTarget: row.meetings_target,
    // Attainment is computed against live pipeline data — never stored.
    revenueActual: 0,
    outreachActual: 0,
    meetingsActual: 0,
    wins: 0,
    losses: 0,
  }
}

export async function fetchTargets(periodMonth: string): Promise<BdTarget[]> {
  const { data, error } = await supabase
    .from('bd_targets')
    .select(TARGET_SELECT)
    .eq('period_month', periodMonth)
  if (error) throw error
  return data.map(mapTarget)
}

/** The department's revenue quota for one month, summed across its reps. */
export interface BdMonthlyQuota {
  /** First day of the month, matching bd_targets.period_month. */
  periodMonth: string
  revenueTarget: number
}

/**
 * Department quota per month from `fromMonth` onwards — the target line on the
 * revenue trend chart.
 *
 * Summed here rather than in Postgres because the row count is (reps × months),
 * which is dozens, and a GROUP BY would need either a view or an RPC to stay
 * typed. Revisit if BD ever grows past a few dozen people.
 */
export async function fetchTargetTotals(fromMonth: string): Promise<BdMonthlyQuota[]> {
  const { data, error } = await supabase
    .from('bd_targets')
    .select('period_month, revenue_target')
    .gte('period_month', fromMonth)
  if (error) throw error

  const byMonth = new Map<string, number>()
  for (const row of data) {
    byMonth.set(row.period_month, (byMonth.get(row.period_month) ?? 0) + Number(row.revenue_target))
  }
  return [...byMonth.entries()].map(([periodMonth, revenueTarget]) => ({ periodMonth, revenueTarget }))
}

export async function saveTargets(targets: BdTarget[], periodMonth: string, actorId: string | null): Promise<void> {
  if (targets.length === 0) return
  const { error } = await supabase.from('bd_targets').upsert(
    targets.map((t) => ({
      rep_id: t.repId,
      period_month: periodMonth,
      revenue_target: t.revenueTarget,
      outreach_target: t.outreachTarget,
      meetings_target: t.meetingsTarget,
      updated_by: actorId,
    })),
    { onConflict: 'rep_id,period_month' },
  )
  if (error) throw error
}

/* ── Handoffs ────────────────────────────────────────────────────────────── */

type HandoffJoined = HandoffRow & {
  lead: { id: string; company: string } | null
  manager: PersonRef | null
  by: PersonRef | null
}

const HANDOFF_SELECT =
  '*, lead:bd_leads!bd_handoffs_lead_id_fkey(id,company), manager:profiles!bd_handoffs_manager_id_fkey(id,name), by:profiles!bd_handoffs_by_id_fkey(id,name)'

export function mapHandoff(row: HandoffJoined): BdHandoff {
  return {
    id: row.id,
    leadId: row.lead_id,
    company: row.lead?.company ?? '',
    serviceSlug: row.service_slug,
    projectName: row.project_name,
    budget: Number(row.budget),
    managerId: row.manager_id ?? '',
    managerName: personName(row.manager),
    notes: row.notes ?? undefined,
    at: row.handed_at,
    byName: personName(row.by, 'Someone'),
    projectId: row.project_id ?? undefined,
  }
}

export async function fetchHandoffs(): Promise<BdHandoff[]> {
  const { data, error } = await supabase
    .from('bd_handoffs')
    .select(HANDOFF_SELECT)
    .order('handed_at', { ascending: false })
  if (error) throw error
  return data.map(mapHandoff)
}

export interface HandoffInput {
  leadId: string
  projectName: string
  managerId: string
  budget: number
  services: HandoffServicePlan[]
  /** An existing client to attach the project to. Wins over `clientName`. */
  clientId?: string
  /**
   * Name for a new client, when none was picked. Matched against existing
   * clients first, so naming one that already exists attaches to it rather than
   * creating a twin. Never defaults to the lead's company here — the lead
   * routinely carries a deal name ("Starr luxury jets - Project"), and letting
   * that become a client name is the mistake this parameter exists to prevent.
   */
  clientName?: string
  notes?: string
  startDate?: string
  deadline?: string
}

/**
 * Hand a won lead to delivery — client, project, service blocks, staffing and
 * the handoff record, in one transaction.
 *
 * Everything happens inside `bd_handoff_to_project` rather than here because
 * creating a project needs `can_manage_projects`, which BD roles deliberately do
 * not hold; the function is SECURITY DEFINER and checks `bd_can_manage()`
 * instead. Doing it in one call is also what stops a failure halfway through
 * leaving an unstaffed project nobody knows is incomplete.
 */
export async function handoffToProject(input: HandoffInput): Promise<HandoffOutcome> {
  const { data, error } = await supabase.rpc('bd_handoff_to_project', {
    p_lead_id: input.leadId,
    p_project_name: input.projectName,
    p_manager_id: input.managerId,
    p_budget: input.budget,
    p_services: input.services.map((s) => ({
      service_id: s.serviceId,
      template_id: s.templateId ?? null,
      member_ids: s.memberIds,
    })),
    p_client_id: input.clientId || undefined,
    p_client_name: input.clientName?.trim() || undefined,
    p_notes: input.notes ?? undefined,
    p_start_date: input.startDate || undefined,
    p_deadline: input.deadline || undefined,
  })
  if (error) throw error

  const row = data?.[0]
  if (!row) throw new Error('The handoff did not come back. Nothing was created.')
  return {
    projectId: row.project_id,
    clientId: row.client_id,
    handoffId: row.handoff_id,
    stagesCreated: row.stages_created,
    tasksCreated: row.tasks_created,
  }
}

/* ── Comments ────────────────────────────────────────────────────────────── */

/** What a BD comment thread hangs off. One of these, never two. */
export type BdCommentParent = 'task' | 'lead' | 'project'

export interface BdComment {
  id: string
  parentType: BdCommentParent
  parentId: string
  content: string
  doc: Json | null
  authorId: string | null
  authorName: string
  authorAvatar: string | null
  createdAt: string
  updatedAt: string
  /**
   * True while the comment exists only in this tab's cache and the insert is
   * still in flight. The bubble renders dimmed rather than absent, so posting
   * never blocks on the network.
   */
  pending?: boolean
}

type CommentJoined = Tables<'bd_comments'> & {
  author: { id: string; name: string; avatar_url: string | null } | null
}

const COMMENT_SELECT = '*, author:profiles!bd_comments_author_id_fkey(id,name,avatar_url)'

/** The column a parent kind lives in — the three are mutually exclusive by CHECK. */
const PARENT_COLUMN: Record<BdCommentParent, 'task_id' | 'lead_id' | 'project_id'> = {
  task: 'task_id',
  lead: 'lead_id',
  project: 'project_id',
}

export function mapComment(row: CommentJoined): BdComment {
  const parentType: BdCommentParent = row.task_id ? 'task' : row.lead_id ? 'lead' : 'project'
  return {
    id: row.id,
    parentType,
    parentId: row.task_id ?? row.lead_id ?? row.project_id ?? '',
    content: row.content,
    doc: row.doc,
    authorId: row.author_id,
    authorName: row.author?.name ?? 'Unknown',
    authorAvatar: row.author?.avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchBdComments(parentType: BdCommentParent, parentId: string): Promise<BdComment[]> {
  const { data, error } = await supabase
    .from('bd_comments')
    .select(COMMENT_SELECT)
    .eq(PARENT_COLUMN[parentType], parentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(mapComment)
}

export interface CreateBdCommentArgs {
  id: string
  parentType: BdCommentParent
  parentId: string
  content: string
  doc: Json | null
  authorId: string
}

export async function createBdComment(args: CreateBdCommentArgs): Promise<void> {
  // Spelled out rather than keyed by PARENT_COLUMN: a computed key widens the
  // object to an index signature, and the insert loses every column type with it.
  const { error } = await supabase.from('bd_comments').insert({
    id: args.id,
    task_id: args.parentType === 'task' ? args.parentId : null,
    lead_id: args.parentType === 'lead' ? args.parentId : null,
    project_id: args.parentType === 'project' ? args.parentId : null,
    content: args.content,
    doc: args.doc,
    author_id: args.authorId,
  })
  if (error) throw error
}

export async function updateBdComment(id: string, content: string, doc: Json | null): Promise<void> {
  const { error } = await supabase.from('bd_comments').update({ content, doc }).eq('id', id)
  if (error) throw error
}

export async function deleteBdComment(id: string): Promise<void> {
  const { error } = await supabase.from('bd_comments').delete().eq('id', id)
  if (error) throw error
}

/* ── Mentions ────────────────────────────────────────────────────────────── */

export type BdMentionSource = 'bd_comment' | 'bd_task' | 'bd_lead' | 'bd_project'

/**
 * Record @mentions on a BD record. The unique key on
 * (source_type, source_id, profile_id) makes this idempotent, so the autosaving
 * description editor can call it on every flush and only a genuinely new tag
 * inserts — which is the only thing that notifies.
 *
 * `ignoreDuplicates` rather than a read-then-filter: one round trip, and no
 * window in which two tabs both decide a mention is new.
 */
export async function syncBdMentions(
  sourceType: BdMentionSource,
  sourceId: string,
  profileIds: string[],
  authorId: string,
): Promise<void> {
  const targets = [...new Set(profileIds)].filter((id) => id && id !== authorId)
  if (targets.length === 0) return

  const { error } = await supabase
    .from('bd_mentions')
    .upsert(
      targets.map((id) => ({ source_type: sourceType, source_id: sourceId, profile_id: id, created_by: authorId })),
      { onConflict: 'source_type,source_id,profile_id', ignoreDuplicates: true },
    )
  if (error) throw error
}
