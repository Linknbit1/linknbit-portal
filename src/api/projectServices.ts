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

/** Everyone staffed on any service of a project, tagged with which service. */
export async function fetchProjectServiceMembers(projectId: string): Promise<ServiceMember[]> {
  const { data, error } = await supabase
    .from('service_members')
    .select('project_service_id, role_in_service, project_service:project_services!inner(project_id), profile:profiles(id,name,avatar_url,role)')
    .eq('project_service.project_id', projectId)
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

export async function removeServiceMember(projectServiceId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('service_members')
    .delete()
    .eq('project_service_id', projectServiceId)
    .eq('profile_id', profileId)
  if (error) throw error
}
