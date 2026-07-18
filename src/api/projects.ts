import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type ProjectRow = Tables<'projects'>
export type ProjectStatus = ProjectRow['status']

export interface PersonMini {
  id: string
  name: string
  avatar_url: string | null
}

export interface ProjectListItem extends ProjectRow {
  client: { id: string; name: string } | null
  manager: PersonMini | null
  members: PersonMini[]
  task_count: number
}

export interface ProjectFilters {
  service?: string
  status?: ProjectStatus
  managerId?: string
  search?: string
}

export async function fetchProjects(filters: ProjectFilters = {}): Promise<ProjectListItem[]> {
  let query = supabase
    .from('projects')
    .select(
      '*, client:clients(id,name), manager:profiles!projects_manager_id_fkey(id,name,avatar_url), members:project_members(profile:profiles(id,name,avatar_url)), task_count:tasks(count)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters.service) query = query.eq('service_type', filters.service)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.managerId) query = query.eq('manager_id', filters.managerId)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data.map(({ members, task_count, ...rest }) => ({
    ...rest,
    members: members.flatMap((m) => (m.profile ? [m.profile] : [])),
    task_count: task_count[0]?.count ?? 0,
  }))
}

export async function fetchProject(id: string): Promise<ProjectListItem | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      '*, client:clients(id,name), manager:profiles!projects_manager_id_fkey(id,name,avatar_url), members:project_members(profile:profiles(id,name,avatar_url)), task_count:tasks(count)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { members, task_count, ...rest } = data
  return {
    ...rest,
    members: members.flatMap((m) => (m.profile ? [m.profile] : [])),
    task_count: task_count[0]?.count ?? 0,
  }
}

export async function createProject(payload: TablesInsert<'projects'>): Promise<ProjectRow> {
  const { data, error } = await supabase.from('projects').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: TablesUpdate<'projects'>): Promise<ProjectRow> {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<ProjectRow> {
  return updateProject(id, { status })
}

/** Soft delete — moves the project to the admin-only trash view. */
export async function deleteProject(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString(), deleted_by: auth.user?.id ?? null })
    .eq('id', id)
  if (error) throw error
}
