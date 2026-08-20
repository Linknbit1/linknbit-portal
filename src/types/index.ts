/* =========================================================
   Linknbit Unified Operations Portal — Core Types
   ========================================================= */

import type { Json } from './database'

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'project_manager'
  | 'team_lead'
  | 'employee'
  | 'hr'
  | 'finance'
  | 'client_owner'
  | 'client_member'

export type ServiceType = 'design' | 'development' | 'marketing'

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'completed'
  | 'blocked'

/**
 * Statuses that declare a task finished. Setting one is a sign-off: the database
 * (fn_guard_task_approval) refuses it without can_approve_tasks, so every picker
 * filters against this list rather than offering a move that will bounce.
 */
export const SIGN_OFF_STATUSES: TaskStatus[] = ['approved', 'completed']

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export type ProjectStatus =
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'awaiting_client'
  | 'completed'
  | 'on_hold'
  | 'ongoing'

export type ApprovalStatus = 'pending' | 'approved' | 'revision_requested' | 'rejected'

export type ClickUpSyncStatus = 'synced' | 'pending' | 'error'

// ── Audit log ─────────────────────────────────────────────────────────────────
export type AuditModule = 'attendance' | 'standup' | 'gamification' | 'projects' | 'chat' | 'access'
export type AuditSeverity = 'info' | 'warning' | 'danger'

export interface AuditLogFilters {
  module?: AuditModule | 'all'
  severity?: AuditSeverity | 'all'
  flaggedOnly?: boolean
  actorId?: string
  /** Inclusive date bounds, YYYY-MM-DD. */
  from?: string
  to?: string
}

export type WorkloadLevel = 'light' | 'medium' | 'heavy'

/* ---- Users ---- */
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: ServiceType
  level?: number
  xp?: number
  xpToNext?: number
  coins?: number
  online?: boolean
}

/* ---- Stages ---- */
export interface Stage {
  id: string
  name: string
  order: number
  serviceType: ServiceType
  clientVisible: boolean
  requiresApproval: boolean
  status?: 'completed' | 'current' | 'upcoming' | 'blocked'
  approvalStatus?: ApprovalStatus
}

/* ---- Projects ---- */
export interface Project {
  id: string
  name: string
  clientId: string
  clientName: string
  serviceType: ServiceType
  status: ProjectStatus
  currentStage: string
  progress: number
  startDate?: string
  deadline: string
  budget?: number
  pmId: string
  pm: Pick<User, 'id' | 'name' | 'role'>
  teamIds: string[]
  clickUpSync: ClickUpSyncStatus
  clickUpFolder?: string
  lastSynced?: string
  internalNote?: string
  stages: Stage[]
}

/* ---- Tasks ---- */
export interface Task {
  id: string
  title: string
  description?: string
  projectId: string
  projectName: string
  stageId: string
  stageName: string
  serviceType: ServiceType
  assigneeId: string
  assignee: Pick<User, 'id' | 'name' | 'role'>
  status: TaskStatus
  priority: Priority
  dueDate: string
  xpReward: number
  clientVisible: boolean
  clickUpId?: string
  clickUpSync: ClickUpSyncStatus
  subtasks?: Subtask[]
  files?: TaskFile[]
  comments?: Comment[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
  assigneeId?: string
  assigneeName?: string
}

export interface TaskFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'figma' | 'text' | 'other'
  size?: string
  uploadedBy: string
  uploadedAt: string
  clientVisible: boolean
  url?: string
}

export interface Comment {
  id: string
  authorId: string
  authorName: string
  content: string
  timestamp: string
  isInternal: boolean
  isRead?: boolean
}

/* ---- Notifications ---- */
export interface Notification {
  id: string
  type:
    | 'task_completed'
    | 'stage_approved'
    | 'revision_requested'
    | 'xp_earned'
    | 'badge_earned'
    | 'file_uploaded'
    | 'clickup_error'
    | 'client_approved'
  actorName: string
  actorId: string
  message: string
  projectName?: string
  timestamp: string
  read: boolean
}

/* ---- Gamification ---- */
export interface Badge {
  id: string
  name: string
  description: string
  category: 'milestone' | 'consistency' | 'team' | 'service' | 'special'
  icon: string
  earnedAt?: string
  locked: boolean
}

export interface Quest {
  id: string
  title: string
  description: string
  progress: number
  total: number
  xpReward: number
  coinReward?: number
  deadline?: string
  status: 'not_started' | 'in_progress' | 'completed'
  badgeReward?: string
}

export interface Reward {
  id: string
  name: string
  description: string
  coinCost: number
  category: 'time_off' | 'work_perk' | 'career' | 'recognition' | 'other'
  icon: string
  available: boolean
  canAfford?: boolean
  redemptionLimit?: number
  status: 'active' | 'inactive'
}

export interface LeaderboardEntry {
  rank: number
  user: Pick<User, 'id' | 'name' | 'role' | 'level'>
  department?: ServiceType
  xpThisPeriod: number
  totalXp: number
  badgeCount: number
  rankChange: number
  isCurrentUser?: boolean
}

/* ---- Activity ---- */
export interface ActivityItem {
  id: string
  type: string
  actorName: string
  actorId: string
  message: string
  projectName?: string
  timestamp: string
  isError?: boolean
}

/* ---- Approval ---- */
export interface Approval {
  id: string
  type: 'stage' | 'task' | 'file'
  projectId: string
  projectName: string
  stageName?: string
  taskName?: string
  fileName?: string
  submittedBy: string
  submittedAt: string
  status: ApprovalStatus
  message?: string
  attachments?: TaskFile[]
  clientMessage?: string
  recipientName?: string
}

/* ---- KPI Cards ---- */
export interface KPICard {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  variant?: 'default' | 'warning' | 'error' | 'success'
  icon?: string
}

/* ---- Clients ---- */
export interface Client {
  id: string
  name: string
  email: string
  company: string
  accountManagerId: string
  accountManagerName: string
  status: 'active' | 'inactive' | 'on_hold'
  projectCount: number
  joinedAt: string
  avatar?: string
  internalNote?: string
  industry?: string
}

/* ---- Attendance ---- */
/** Attendance fact only. Day kinds (leave/WFH/holiday) live on day_type. */
export type AttendanceStatus = 'present' | 'late' | 'absent'
/** What kind of day it was, independent of whether the person turned up. */
export type AttendanceDayType = 'work' | 'leave' | 'wfh' | 'holiday'
/** How much of the day day_type covers. Only leave and WFH are ever partial. */
export type AttendanceDayPart = 'full' | 'first_half' | 'second_half'

export interface AttendanceRecord {
  id: string
  userId: string
  userName: string
  date: string
  checkIn?: string
  checkOut?: string
  status: AttendanceStatus
  method: 'office' | 'remote' | 'admin'
  note?: string
}

/* ---- Work From Home ---- */
export type WFHStatus = 'pending' | 'approved' | 'rejected'

export interface WFHRequest {
  id: string
  userId: string
  userName: string
  date: string
  requestedAt: string
  reason: string
  status: WFHStatus
  reviewedBy?: string
  reviewedAt?: string
  note?: string
  grantedDirectly?: boolean
}

/* ---- Team ---- */
export interface Team {
  id: string
  name: string
  department: ServiceType
  leadId: string
  leadName: string
  memberIds: string[]
  activeProjects: number
  avgWorkload: WorkloadLevel
}

/* =========================================================
   In-portal handbook (/docs) and changelog (/docs/changelog)
   ========================================================= */

/**
 * Visibility gate, mirroring `NavItem`'s: a role allow-list, a capability key
 * (or ANY of several), or both. Omitting both means "everyone internal".
 * Documentation must never describe a screen the reader cannot open.
 */
export interface DocGate {
  roles?: readonly string[]
  feature?: string | readonly string[]
}

/** One numbered how-to inside a topic. */
export interface DocProcedure {
  title: string
  /** Ordered steps. Written as instructions, not descriptions. */
  steps: string[]
}

export interface DocTopic extends DocGate {
  /** Anchor slug — also the deep-link target (`/docs#check-in`). */
  id: string
  title: string
  /** One or two sentences on what this is for. */
  summary: string
  /** Where to find it, as a nav trail, e.g. "Workspace → Standup". */
  where?: string
  procedures?: DocProcedure[]
  /** Things that are true but surprising — the stuff support gets asked twice. */
  notes?: string[]
}

export interface DocChapter extends DocGate {
  id: string
  title: string
  blurb: string
  topics: DocTopic[]
}

export type ChangelogKind = 'added' | 'improved' | 'fixed'

export interface ChangelogEntry {
  kind: ChangelogKind
  text: string
}

export interface ChangelogRelease {
  /** Curated milestone tag, e.g. "v1.4". */
  version: string
  /** ISO date of the release's last shipped change. */
  date: string
  title: string
  /** Headline shown on the docs "What's new" callout — newest release only. */
  highlight?: string
  entries: ChangelogEntry[]
}

/* =========================================================
   BUSINESS DEVELOPMENT
   ========================================================= */

/** Pipeline stages, in order. `won` and `lost` are the two terminal stages. */
export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  /** A booked conversation — the step between qualifying and quoting. */
  | 'meeting'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  /** Screened out rather than lost: never a fit, so it never really competed. */
  | 'unqualified'

/** Where a lead came from. Drives the per-channel reporting in Outreach. */
export type BdChannel =
  | 'upwork'
  | 'fiverr'
  | 'linkedin'
  | 'email'
  | 'cold_call'
  | 'inbound'
  | 'referral'

/** How warm the lead is — the BD equivalent of task priority. */
export type LeadTemperature = 'hot' | 'warm' | 'cold'

/** Whether the prospect fits the ideal customer profile. */
export type IcpFit = 'strong' | 'partial' | 'none'

export interface Lead {
  id: string
  company: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  channel: BdChannel
  /** Service slugs the prospect is interested in — finer-grained than delivery's three. */
  services: string[]
  industry: string
  icpFit: IcpFit
  /**
   * Estimated deal value in PKR — the only figure any total, funnel or target
   * actual is allowed to sum, because a sum across currencies means nothing.
   */
  value: number
  /** The currency it was quoted in (ISO 4217). PKR when it was never anything else. */
  valueCurrency: string
  /** The amount as typed, in `valueCurrency`. Equal to `value` for a PKR deal. */
  valueEntered: number
  /**
   * PKR per 1 unit at the moment the value was entered. Frozen: refreshing the
   * rate table never restates a deal that was already priced.
   */
  valueFxRate: number
  stage: LeadStage
  /**
   * Where the card sits in its pipeline column under "Manual order". Sparse
   * doubles, so an insert between two neighbours writes one midpoint instead of
   * renumbering the column — same mechanism as BdTask.position.
   */
  position: number
  temperature: LeadTemperature
  ownerId: string
  ownerName: string
  addedOn: string
  /**
   * The date of the most recent logged activity, and nothing else. Null until
   * somebody actually makes contact — it deliberately does not fall back to
   * `addedOn`, because "added today" is not "spoken to today", and the stalled
   * counter and the Recently-contacted sort both read this.
   */
  lastContacted: string | null
  nextFollowUp: string | null
  /**
   * When the lead reached a terminal stage, stamped by the database. Null while
   * it is still open. This — not `addedOn` — is what revenue-by-month plots
   * against, so a deal that took three months books to the month it closed.
   */
  closedAt: string | null
  /** Only set once the lead reaches `lost`. */
  lostReason?: string
  /** Set once a won lead has been handed to delivery — SRS §3.6. */
  handoffId?: string
  /**
   * Rich notes on the prospect — the same ProseMirror document the delivery
   * project description uses, so @mentions and links work identically.
   */
  doc?: Json | null
  /** Plain-text mirror of `doc`, for card excerpts and anything that can't read ProseMirror JSON. */
  description?: string
  /** The prospect's own site. Stored as typed; a missing scheme is assumed https when linked. */
  website: string
  country: string
  city: string
  /**
   * Where the lead came from before it was a record here — the Drive folder, the
   * Fiverr archive. Provenance, not a taxonomy: `channel` is the field reports read.
   */
  source: string
  /** Repeater. The platform behind each link is derived from the URL, never stored. */
  socials: LeadSocial[]
  /** Repeater — proposals, decks and anything else that lives in Drive. */
  documents: LeadDocument[]
  /** Derived from the lead's activities at read time, never stored. */
  activityCount: number
}

/** One row of the lead form's social-links repeater. */
export interface LeadSocial {
  /** Client-minted, so a row survives reordering and re-render without remounting. */
  id: string
  url: string
}

/** One row of the lead form's documents repeater. */
export interface LeadDocument {
  id: string
  title: string
  url: string
}

export type MeetingType = 'discovery' | 'proposal' | 'negotiation' | 'kickoff' | 'other'
export type MeetingPlatform = 'zoom' | 'meet' | 'phone' | 'in_person'

export interface BdMeeting {
  id: string
  leadId: string
  company: string
  /** ISO datetime. */
  scheduledAt: string
  durationMinutes: number
  type: MeetingType
  hostId: string
  hostName: string
  /**
   * Portal staff invited to the meeting — real profile ids, so an invitee can be
   * shown their own schedule outside the BD module (they cannot open /bd/*).
   */
  internalAttendees: { id: string; name: string }[]
  clientAttendees: string
  platform: MeetingPlatform
  /**
   * The joining link — a Zoom/Meet URL, or a dial-in string. Free text: meeting
   * links are wildly inconsistent, and rejecting a real one is worse than
   * accepting an odd one.
   */
  joinUrl?: string
  /** Absent until the meeting has happened. */
  outcome?: string
  nextStep?: string
}

/** Aggregate outreach for one channel over the selected period. */
export interface ChannelStats {
  channel: BdChannel
  /** Proposals, messages, emails or calls — whichever the channel counts. */
  sent: number
  responses: number
  meetings: number
  leads: number
  won: number
  /** Revenue attributed to the channel, in PKR. */
  revenue: number
  /** Percentage change in `sent` against the previous period. */
  trend: number
}

/** One rep's written check-in for a day. */
export interface BdDailyUpdate {
  id: string
  repId: string
  repName: string
  date: string
  submittedAt: string | null
  platforms: BdChannel[]
  summary: string
  proposalsSent: number
  callsMade: number
  meetingsHeld: number
  leadsAdded: number
}

/** A rep's revenue and activity quota for a period. */
export interface BdTarget {
  repId: string
  repName: string
  /** Revenue target and actual, in PKR. */
  revenueTarget: number
  revenueActual: number
  outreachTarget: number
  outreachActual: number
  meetingsTarget: number
  meetingsActual: number
  wins: number
  losses: number
}

/** A single logged touchpoint on a lead. Typed, so it can be counted and reported on. */
export type BdActivityType = 'call' | 'email' | 'linkedin' | 'meeting' | 'proposal' | 'note' | 'stage_change'

export type BdActivityOutcome =
  | 'connected'
  | 'no_response'
  | 'follow_up'
  | 'meeting_booked'
  | 'not_interested'

/**
 * One unit of BD effort — the single activity model the SRS asks for (§3.2:
 * every channel "feeds the same underlying Activity data … channel is just one
 * dimension to filter and report by").
 *
 * A touchpoint on a named prospect and a batch of cold outreach are the same
 * record with different shapes:
 *   - a call on Nordic Freight  → leadId set,  volume 1
 *   - 20 Upwork proposals       → leadId null, volume 20
 *
 * That is why Outreach and the lead's own log can never disagree: they are two
 * filters over this one list.
 */
export interface BdActivity {
  id: string
  /** Null when the effort is not (yet) about a named prospect. */
  leadId: string | null
  /** Always set — it is the reporting dimension, not an optional tag. */
  channel: BdChannel
  type: BdActivityType
  /** ISO datetime. */
  at: string
  outcome?: BdActivityOutcome
  note: string
  /** 1 for a single touchpoint; more for a logged batch. */
  volume: number
  responses: number
  meetingsBooked: number
  leadsCreated: number
  byId: string
  byName: string
}

/**
 * BD task statuses are the delivery board's, minus `backlog`.
 *
 * The BD module reuses TaskStatus outright — same StatusChip, same board
 * columns, same labels — so the two boards read identically. Backlog is dropped
 * because BD work is either queued or it isn't; there is no parking lot.
 */
export const BD_TASK_STATUSES: TaskStatus[] = [
  'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked',
]

export type BdTaskRecurrence = 'once' | 'daily' | 'weekly' | 'monthly'

export interface BdTask {
  id: string
  title: string
  /** Plain-text mirror of `doc` — board card excerpts and search read this. */
  description?: string
  /** The rich description document, edited with the same editor as a delivery task. */
  doc?: Json | null
  assigneeId: string
  assigneeName: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  /** The BD project this sits under — the equivalent of a delivery project. */
  projectId: string
  projectName: string
  /** Optional link back to the lead this work is for. */
  leadId?: string
  leadCompany?: string
  channel?: BdChannel
  recurrence: BdTaskRecurrence
  /**
   * Sort key within a board lane. Fractional: a card dropped between two others
   * takes the midpoint of its neighbours, so a reorder writes one row.
   */
  position: number
  createdBy: string
  checklist: { id: string; label: string; done: boolean }[]
}

/**
 * A BD project — an outreach campaign or initiative that tasks hang off.
 *
 * Deliberately shaped like ProjectListItem so BdProjectsPage can mirror the
 * delivery Projects page component for component. `channels` takes the slot
 * `services` occupies there: an outreach campaign targets Upwork or LinkedIn,
 * not design or development.
 */
export interface BdProject {
  id: string
  name: string
  /** Plain-text mirror of `doc`. */
  description?: string
  /** The campaign brief, as a rich document. */
  doc?: Json | null
  ownerId: string
  ownerName: string
  status: ProjectStatus
  /** Derived from the campaign's tasks at read time, never stored. */
  progress: number
  deadline: string | null
  channels: BdChannel[]
  members: { id: string; name: string }[]
  taskCount: number
}



/**
 * A won lead handed over to delivery.
 *
 * Recorded on the BD side so the lead stays visible in BD history (read-only)
 * and linked to what it became — SRS §3.6. In the prototype this captures the
 * handoff intent; creating the real client + project is an API-layer job.
 */
export interface BdHandoff {
  id: string
  leadId: string
  company: string
  /** Delivery service the BD services were mapped down to. */
  serviceSlug: string
  projectName: string
  budget: number
  /** Profile id of the PM the work was assigned to. */
  managerId: string
  managerName: string
  notes?: string
  at: string
  byName: string
}
