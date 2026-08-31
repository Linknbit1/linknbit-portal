import { supabase } from '../lib/supabase'
import { applyTemplateToService } from './templates'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type ProjectRow = Tables<'projects'>
export type ProjectStatus = ProjectRow['status']

export interface PersonMini {
  id: string
  name: string
  avatar_url: string | null
  /**
   * Present only where a departed person still has to be shown — a task they were
   * assigned, or a project they still manage, from before they left. Optional
   * because most selects have no reason to ask for it: the rosters and pickers
   * exclude leavers outright.
   */
  is_active?: boolean
}

/** The services a project runs, flattened for chips and filters. */
export interface ProjectServiceMini {
  id: string
  service_id: string
  name: string
  slug: string
  color: string
}

export interface ProjectListItem extends ProjectRow {
  client: { id: string; name: string } | null
  /**
   * Primary manager, from the legacy `manager_id` column. Kept in step with
   * `managers` by a trigger; read `managers` for the real answer.
   */
  manager: PersonMini | null
  /** Everyone who manages this project. A project may have several. */
  managers: PersonMini[]
  /** Everyone staffed on any of the project's services, de-duplicated. */
  members: PersonMini[]
  services: ProjectServiceMini[]
  task_count: number
}

export interface ProjectFilters {
  /** Service slug — matches a project running that service. */
  service?: string
  status?: ProjectStatus
  managerId?: string
  search?: string
}

// One nested select covers all four layers' summary needs: the services a
// project runs and, inside each, who works on it. Kept as a single literal:
// supabase-js infers the response type from it, and a concatenation would widen
// it to `string` and lose that inference.
const PROJECT_SELECT =
  '*,client:clients(id,name),manager:profiles!projects_manager_id_fkey(id,name,avatar_url,is_active),managers:project_managers(profile:profiles!project_managers_profile_id_fkey(id,name,avatar_url,is_active)),services:project_services(id,service_id,order_index,service:services(id,name,slug,color),members:service_members(profile:profiles(id,name,avatar_url))),task_count:tasks(count)'

/** What PROJECT_SELECT returns, before flattening. */
interface RawProjectRow extends ProjectRow {
  client: { id: string; name: string } | null
  manager: PersonMini | null
  managers: { profile: PersonMini | null }[]
  services: {
    id: string
    service_id: string
    order_index: number
    service: { id: string; name: string; slug: string; color: string } | null
    members: { profile: PersonMini | null }[]
  }[]
  task_count: { count: number }[]
}

/** Flattens the nested services/members shape the list and detail views expect. */
function shapeProject(row: RawProjectRow): ProjectListItem {
  const { services, task_count, managers, ...rest } = row
  const ordered = [...services].sort((a, b) => a.order_index - b.order_index)
  const seen = new Set<string>()
  const members: PersonMini[] = []
  for (const s of ordered) {
    for (const m of s.members) {
      if (m.profile && !seen.has(m.profile.id)) {
        seen.add(m.profile.id)
        members.push(m.profile)
      }
    }
  }
  return {
    ...rest,
    // Longest-standing first, matching the primary the trigger keeps in the
    // legacy column, so the two never contradict each other on screen.
    managers: managers.flatMap((m) => (m.profile ? [m.profile] : [])),
    members,
    services: ordered.flatMap((s) =>
      s.service
        ? [{ id: s.id, service_id: s.service_id, name: s.service.name, slug: s.service.slug, color: s.service.color }]
        : [],
    ),
    task_count: task_count[0]?.count ?? 0,
  }
}

export async function fetchProjects(filters: ProjectFilters = {}): Promise<ProjectListItem[]> {
  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.managerId) {
    // Resolved to ids first rather than filtered on the embedded managers:
    // filtering an embed narrows the embed, not the parent rows, and switching
    // to an inner join would change PROJECT_SELECT for every other caller.
    const { data: mine, error: mErr } = await supabase
      .from('project_managers')
      .select('project_id')
      .eq('profile_id', filters.managerId)
    if (mErr) throw mErr
    query = query.in('id', mine.map((r) => r.project_id))
  }
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  const shaped = data.map(shapeProject)
  // Filtered client-side: a project matches if ANY of its services does, which
  // an embedded filter can't express without dropping the other services.
  return filters.service ? shaped.filter((p) => p.services.some((s) => s.slug === filters.service)) : shaped
}

// Soft-deleted projects read as missing, matching fetchProjects. Without this a
// deleted project stayed reachable by direct URL or a stale link and rendered as
// a perfectly normal project — every action on it then failed down in the RPC
// with `project_not_found`, which reads as a broken portal rather than a deleted
// project. There is no restore UI, so nothing needs to load one.
export async function fetchProject(id: string): Promise<ProjectListItem | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return shapeProject(data)
}

/** A service to start the project with, optionally pre-filled from a template. */
export interface NewProjectService {
  serviceId: string
  templateId?: string
}

/**
 * Creates a project together with the services it runs. A project without at
 * least one service has nowhere to hang stages, tasks or people, so the caller
 * must supply one. Any service given a template gets that pipeline copied in.
 */
export async function createProject(
  payload: TablesInsert<'projects'>, services: NewProjectService[],
): Promise<ProjectRow> {
  if (services.length === 0) throw new Error('Pick at least one service for this project')

  const { data, error } = await supabase.from('projects').insert(payload).select().single()
  if (error) throw error

  const { data: auth } = await supabase.auth.getUser()
  const { data: created, error: serviceError } = await supabase
    .from('project_services')
    .insert(services.map(({ serviceId }, order_index) => ({
      project_id: data.id, service_id: serviceId, order_index, created_by: auth.user?.id ?? null,
    })))
    .select('id,service_id')
  // Leaving a service-less project behind would be worse than failing outright.
  if (serviceError) {
    await supabase.from('projects').delete().eq('id', data.id)
    throw serviceError
  }

  // Templates are applied after the fact: a failure here leaves a usable project
  // with empty pipelines rather than discarding everything the user just typed.
  for (const { serviceId, templateId } of services) {
    if (!templateId) continue
    const block = created?.find((row) => row.service_id === serviceId)
    if (block) await applyTemplateToService(block.id, templateId)
  }
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

/**
 * Projects this person manages. The task lens uses it to widen a manager's view
 * to the whole project, which is what managing one means.
 */
export async function fetchManagedProjectIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('project_managers')
    .select('project_id')
    .eq('profile_id', profileId)
  if (error) throw error
  return data.map((r) => r.project_id)
}

/**
 * Replaces the whole set of managers for a project.
 *
 * A diff rather than delete-then-insert: wiping the table first would, for a
 * moment, leave the project with no manager, and the sync trigger would push
 * that null straight into `projects.manager_id`. Anyone reading the legacy
 * column in that instant sees an unmanaged project.
 */
export async function setProjectManagers(projectId: string, profileIds: string[]): Promise<void> {
  const wanted = [...new Set(profileIds.filter(Boolean))]

  const { data: current, error: readError } = await supabase
    .from('project_managers')
    .select('profile_id')
    .eq('project_id', projectId)
  if (readError) throw readError

  const have = new Set((current ?? []).map((r) => r.profile_id))
  const toAdd = wanted.filter((id) => !have.has(id))
  const toRemove = [...have].filter((id) => !wanted.includes(id))

  if (toAdd.length > 0) {
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('project_managers').insert(
      toAdd.map((profile_id) => ({
        project_id: projectId,
        profile_id,
        created_by: auth.user?.id ?? null,
      })),
    )
    if (error) throw error
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('project_managers')
      .delete()
      .eq('project_id', projectId)
      .in('profile_id', toRemove)
    if (error) throw error
  }
}
