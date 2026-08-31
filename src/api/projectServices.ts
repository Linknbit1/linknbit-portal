import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { PersonMini } from './projects'

export type ProjectServiceRow = Tables<'project_services'>

/** A service a project is running, with its catalog identity resolved. */
export interface ProjectService extends ProjectServiceRow {
  service: { id: string; name: string; slug: string; color: string } | null
}

export interface ServiceMember extends PersonMini {
  role: string
  role_in_service: string | null
  project_service_id: string
}

const SERVICE_SELECT = '*, service:services(id,name,slug,color)'

export async function fetchProjectServices(projectId: string): Promise<ProjectService[]> {
  const { data, error } = await supabase
    .from('project_services')
    .select(SERVICE_SELECT)
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

/** Services for several projects at once — powers the chips on list/board views. */
export async function fetchProjectServicesFor(projectIds: string[]): Promise<ProjectService[]> {
  if (projectIds.length === 0) return []
  const { data, error } = await supabase
    .from('project_services')
    .select(SERVICE_SELECT)
    .in('project_id', projectIds)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function addProjectService(projectId: string, serviceId: string): Promise<ProjectService> {
  const { data: auth } = await supabase.auth.getUser()
  const { count } = await supabase
    .from('project_services')
    .select('project_id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { data, error } = await supabase
    .from('project_services')
    .insert({
      project_id: projectId,
      service_id: serviceId,
      order_index: count ?? 0,
      created_by: auth.user?.id ?? null,
    })
    .select(SERVICE_SELECT)
    .single()
  if (error) throw error
  return data
}

/**
 * Removes a service from a project. Goes through the RPC because a plain DELETE
 * would cascade its stages and tasks away — the RPC refuses while any remain.
 */
export async function removeProjectService(projectServiceId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_project_service', { p_project_service_id: projectServiceId })
  if (error) throw error
}

/* ── Members ────────────────────────────────────────────────────────────────── */

/**
 * Everyone staffed on any service of a project, tagged with which service.
 *
 * People who have left are dropped from the roster — this answers "who is working
 * on this project", and a departed employee is not. Their `service_members` row is
 * deliberately left in place rather than deleted, so reactivating someone restores
 * their staffing instead of silently losing it.
 */
export async function fetchProjectServiceMembers(projectId: string): Promise<ServiceMember[]> {
  const { data, error } = await supabase
    .from('service_members')
    .select('project_service_id, role_in_service, project_service:project_services!inner(project_id), profile:profiles!inner(id,name,avatar_url,role,is_active)')
    .eq('project_service.project_id', projectId)
    .eq('profile.is_active', true)
  if (error) throw error
  return data.flatMap((m) =>
    m.profile
      ? [{
          id: m.profile.id,
          name: m.profile.name,
          avatar_url: m.profile.avatar_url,
          role: m.profile.role,
          role_in_service: m.role_in_service,
          project_service_id: m.project_service_id,
        }]
      : [],
  )
}

/**
 * Every service-staffing row in the portal, as bare ids.
 *
 * Read whole rather than per project because the question it answers spans all
 * of them at once: "is this task sitting in a service block my team works in?"
 * RLS on service_members is is_internal(), and the table is one row per person
 * per service block, so this stays small.
 */
export async function fetchServiceStaffing(): Promise<{ project_service_id: string; profile_id: string }[]> {
  const { data, error } = await supabase
    .from('service_members')
    .select('project_service_id, profile_id')
  if (error) throw error
  return data
}

export async function addServiceMembers(projectServiceId: string, profileIds: string[]): Promise<void> {
  if (profileIds.length === 0) return
  const { error } = await supabase
    .from('service_members')
    .upsert(
      profileIds.map((profile_id) => ({ project_service_id: projectServiceId, profile_id })),
      { onConflict: 'project_service_id,profile_id' },
    )
  if (error) throw error
}

/** What a person is still holding in a service block, live tasks only. */
export interface ServiceMemberTaskLoad {
  assigned: number
  reviewing: number
  tasks: number
}

export async function fetchServiceMemberTaskLoad(
  projectServiceId: string,
  profileId: string,
): Promise<ServiceMemberTaskLoad> {
  const { data, error } = await supabase.rpc('service_member_task_load', {
    p_project_service_id: projectServiceId,
    p_profile_id: profileId,
  })
  if (error) throw error
  return data?.[0] ?? { assigned: 0, reviewing: 0, tasks: 0 }
}

/**
 * Takes somebody off a service block and off its tasks in one statement.
 *
 * Assigning a person to a task staffs them onto its service, so unstaffing them
 * without undoing that left them off the roster and still holding the work.
 * Their comments stay: what they said about a task is a record of the
 * conversation, not a claim on it.
 */
export async function unstaffServiceMember(
  projectServiceId: string,
  profileId: string,
): Promise<{ unassigned: number; unreviewed: number }> {
  const { data, error } = await supabase.rpc('unstaff_service_member', {
    p_project_service_id: projectServiceId,
    p_profile_id: profileId,
  })
  if (error) throw error
  return data?.[0] ?? { unassigned: 0, unreviewed: 0 }
}

