/* =========================================================
   Linknbit Unified Operations Portal — Core Types
   ========================================================= */

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
/** How much of the day day_type covers. Only leave is ever partial. */
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
