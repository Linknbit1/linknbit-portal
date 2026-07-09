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
  in_progress: 'In Progress',
  blocked: 'Blocked',
  awaiting_client: 'Awaiting Client',
  completed: 'Completed',
  on_hold: 'On Hold',
}

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
