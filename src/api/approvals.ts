import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

export type ApprovalRow = Tables<'approvals'>
export type ApprovalType = ApprovalRow['type']
export type ApprovalStatus = ApprovalRow['status']

export interface ApprovalWithNames extends ApprovalRow {
  project: { id: string; name: string } | null
  submitted_by_profile: { id: string; name: string } | null
  reviewed_by_profile: { id: string; name: string } | null
}

export interface ApprovalFilters {
  projectId?: string
  status?: ApprovalStatus
  type?: ApprovalType
}

export async function fetchApprovals(filters: ApprovalFilters = {}): Promise<ApprovalWithNames[]> {
  let query = supabase
    .from('approvals')
    .select(
      '*, project:projects(id,name), submitted_by_profile:profiles!approvals_submitted_by_fkey(id,name), reviewed_by_profile:profiles!approvals_reviewed_by_fkey(id,name)',
    )
    .order('created_at', { ascending: false })

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function requestApproval(payload: TablesInsert<'approvals'>): Promise<ApprovalRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('approvals')
    .insert({ ...payload, submitted_by: payload.submitted_by ?? auth.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reviewApproval(
  id: string,
  status: ApprovalStatus,
  message?: string,
): Promise<ApprovalRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('approvals')
    .update({
      status,
      message: message ?? null,
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
