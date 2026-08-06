import { supabase } from '../lib/supabase'
import type { Tables, Json } from '../types/database'
import type { AuditLogFilters } from '../types'

export type AuditLogRow = Tables<'audit_log'>

const PAGE_SIZE = 200

/**
 * The whole `projects` module is hidden from the audit log — task edits, project
 * edits, service and member churn, delete records. It is ordinary delivery work,
 * and at several hundred rows a week it buried attendance and gamification, which
 * is what this page exists to watch.
 *
 * One exception survives: `time.logged_manually`. Timed work is measured, but time
 * typed in by hand is self-reported, so it stays visible as a warning.
 *
 * Expressed per module rather than per table on purpose — a new project-side table
 * is then covered without anyone remembering to add it here.
 *
 * Nothing stops being *written*. fn_task_activity() reads these same rows to build
 * each task's Activity feed, so this is strictly a read-side filter for this page.
 * The action value is quoted because it contains a dot, which PostgREST would
 * otherwise read as part of its own filter grammar.
 */
const PROJECTS_EXCEPT_MANUAL_TIME = 'module.neq.projects,action.eq."time.logged_manually"'

export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .or(PROJECTS_EXCEPT_MANUAL_TIME)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (filters.module && filters.module !== 'all') query = query.eq('module', filters.module)
  if (filters.severity && filters.severity !== 'all') query = query.eq('severity', filters.severity)
  if (filters.flaggedOnly) query = query.eq('flagged', true)
  if (filters.actorId) query = query.eq('actor_id', filters.actorId)
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw error
  return data
}

// The nav badge is an unread indicator: how many entries landed since the admin
// last opened the Audit Log. "Last seen" is a per-browser timestamp — a real
// read-state (which browser saw what) never needs to survive to the server.
const LAST_SEEN_KEY = 'audit_log_last_seen'
/** Cap so a first-ever open (no stored timestamp) doesn't count the entire table. */
const NEW_COUNT_MAX = 99

export function getAuditLastSeen(): string {
  try {
    return localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

/** Called when the admin opens the log — everything up to now is "seen". */
export function markAuditSeen(): void {
  try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()) } catch { /* private mode */ }
}

/** Count of entries created since `since` — drives the nav "new logs" badge. */
export async function fetchAuditNewCount(since: string): Promise<number> {
  const { count, error } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    // Same exclusion as the list, or the badge counts rows you cannot open.
    .or(PROJECTS_EXCEPT_MANUAL_TIME)
    .gt('created_at', since)
    .limit(NEW_COUNT_MAX + 1)
  if (error) throw error
  return Math.min(count ?? 0, NEW_COUNT_MAX + 1)
}

export interface TaskActivityRow {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string | null
  action: string
  changed_fields: string[]
  old_values: Json | null
  new_values: Json | null
}

/**
 * Activity for one task. Goes through fn_task_activity rather than reading
 * audit_log directly: that table is admin-only, while this feed should be
 * visible to anyone who can open the task.
 */
export async function fetchTaskActivity(taskId: string): Promise<TaskActivityRow[]> {
  const { data, error } = await supabase.rpc('fn_task_activity', { p_task_id: taskId })
  if (error) throw error
  return data ?? []
}
