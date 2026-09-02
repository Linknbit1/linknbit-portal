import type { ServiceType, TaskStatus, Priority, ProjectStatus, UserRole } from '../types'

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  // Future timestamps (e.g. clock skew) or "just now" both read as "just now".
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateStr)
}

export function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(dateStr: string): boolean {
  return getDaysUntil(dateStr) < 0
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Local calendar date (`YYYY-MM-DD`) of a timestamptz, or '' when unset.
 *
 * Reads the instant in the viewer's timezone rather than slicing the ISO string,
 * which would answer in UTC and land on the wrong day for most local times
 * (PKT is +5, so anything before 05:00 local is still "yesterday" in UTC).
 */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Local wall-clock time (`HH:MM`, 24h) of a timestamptz, or '' when unset. */
export function toTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export type Meridiem = 'AM' | 'PM'

/** 12-hour parts of a 24-hour hour. */
export function to12(hour24: number): { hour12: number; meridiem: Meridiem } {
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  }
}

/** Back to the 24-hour hour the database and `<input>` values speak. */
export function to24(hour12: number, meridiem: Meridiem): number {
  const base = hour12 % 12
  return meridiem === 'PM' ? base + 12 : base
}

/** "09:00 AM" — the one place the 12-hour clock label is spelled out. */
export function formatClockLabel(hour24: number, minute: number): string {
  const { hour12, meridiem } = to12(hour24)
  return `${pad2(hour12)}:${pad2(minute)} ${meridiem}`
}

/**
 * The current time as [hour, minute] in 24h, snapped to the nearest `step`.
 *
 * Nearest rather than next: a picker set to "now" at 11:07 on a 15-minute step
 * should read 11:00, not a quarter past an hour that has not happened. Rounding
 * up to 60 rolls the hour — 11:58 on a 5-minute step is 12:00, not 11:00.
 */
export function nowSnappedTo(step: number): [number, number] {
  const now = new Date()
  const size = Math.max(step, 1)
  const hour = now.getHours()
  const minute = Math.round(now.getMinutes() / size) * size
  return minute >= 60 ? [(hour + 1) % 24, 0] : [hour, minute]
}

/**
 * "04 Aug, 09:00 AM" — one scheduled point, in the form DateTimeRangePicker
 * labels its own value with, so a picker and the text beside it agree.
 */
export function formatStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return `${day}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`
}

/** Just the clock half of {@link formatStamp} — "09:00 AM". */
export function formatStampTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * Recombines a date + time picker pair into a timestamptz. A time on its own has
 * nothing to anchor to, so a missing date clears the column entirely; a missing
 * time falls back to midnight local.
 */
export function fromDateTimeInput(date: string, time: string): string | null {
  if (!date) return null
  const [y, mo, d] = date.split('-').map(Number)
  if (!y || !mo || !d) return null
  const [h, mi] = time ? time.split(':').map(Number) : [0, 0]
  return new Date(y, mo - 1, d, h || 0, mi || 0, 0, 0).toISOString()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  design: 'Design',
  development: 'Development',
  marketing: 'Marketing',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  approved: 'Approved',
  completed: 'Completed',
  blocked: 'Blocked',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  awaiting_client: 'Awaiting Client',
  completed: 'Completed',
  on_hold: 'On Hold',
  ongoing: 'Ongoing',
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  on_site: 'On-site', hybrid: 'Hybrid', remote: 'Remote',
}

export const JOB_TYPE_OPTIONS: { value: string; label: string }[] =
  Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  hr: 'HR',
  finance: 'Finance',
  client_owner: 'Client Owner',
  client_member: 'Client Member',
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`
  return xp.toString()
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return `${currency} ${amount.toLocaleString('en-PK')}`
}

/**
 * Compact money for dense UI — `PKR 1.2M`, `PKR 450K`. Deal values run into the
 * millions, and the full formatCurrency() form is too wide for a pipeline card
 * or a table cell.
 */
export function formatCompactCurrency(amount: number, currency = 'PKR'): string {
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`
  if (amount >= 1_000) return `${currency} ${Math.round(amount / 1_000)}K`
  return `${currency} ${amount}`
}
