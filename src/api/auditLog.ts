import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { AuditLogFilters } from '../types'

export type AuditLogRow = Tables<'audit_log'>

/** How far back the danger badge counts. */
const DANGER_WINDOW_DAYS = 7
const PAGE_SIZE = 200

export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
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

/** Count of danger-severity events in the recent window — drives the nav badge. */
export async function fetchAuditDangerCount(): Promise<number> {
  const since = new Date(Date.now() - DANGER_WINDOW_DAYS * 86_400_000).toISOString()
  const { count, error } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('severity', 'danger')
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}
