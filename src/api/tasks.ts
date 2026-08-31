import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'
import type { PersonMini } from './projects'

export type TaskRow = Tables<'tasks'>
export type TaskStatus = TaskRow['status']
export type TaskPriority = TaskRow['priority']

export interface TaskListItem extends TaskRow {
  project: { id: string; name: string } | null
  /** The project service this task belongs to — the layer above its stage. */
  project_service: { id: string; service: { id: string; name: string; slug: string; color: string } | null } | null
  /** Primary assignee (tasks.assignee_id) — kept for filters/back-compat. */
  assignee: PersonMini | null
  /** Everyone assigned (task_assignees join table). */
  assignees: PersonMini[]
  /** Everyone expected to check it before it is signed off. */
  reviewers: PersonMini[]
  stage: { id: string; name: string } | null
  subtask_count: number
  /** How many of those subtasks are ticked — drives the board card's progress bar. */
  subtask_done: number
  comment_count: number
  attachment_count: number
}

export interface TaskFilters {
  projectId?: string
  /** Narrow to one service block of a project (the 4-layer view). */
  projectServiceId?: string
  status?: TaskStatus
  priority?: TaskPriority
  /** Service slug — matches tasks in any project's block of that service. */
  service?: string
  assigneeId?: string
  search?: string
}

const TASK_SELECT =
  // is_active on the assignees: someone deactivated mid-task must still show up,
  // flagged, so their work is visibly waiting to be reassigned rather than
  // silently reading as unassigned.
  '*, project:projects(id,name), project_service:project_services(id, service:services(id,name,slug,color)), assignee:profiles!tasks_assignee_id_fkey(id,name,avatar_url,is_active), assignees:task_assignees(profile:profiles(id,name,avatar_url,is_active)), reviewers:task_reviewers(profile:profiles(id,name,avatar_url,is_active)), stage:stages(id,name), subtasks(completed), comment_count:comments(count), attachment_count:attachments(count)'

export async function fetchTasks(filters: TaskFilters = {}): Promise<TaskListItem[]> {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .is('parent_task_id', null)
    .order('board_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.projectServiceId) query = query.eq('project_service_id', filters.projectServiceId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  const shaped = data.map(({ subtasks, comment_count, attachment_count, assignees, reviewers, ...rest }) => ({
    ...rest,
    assignees: assignees.flatMap((a) => (a.profile ? [a.profile] : [])),
    reviewers: reviewers.flatMap((r) => (r.profile ? [r.profile] : [])),
    subtask_count: subtasks.length,
    subtask_done: subtasks.filter((s) => s.completed).length,
    comment_count: comment_count[0]?.count ?? 0,
    attachment_count: attachment_count[0]?.count ?? 0,
  }))
  // Service lives two joins away, so it is matched here rather than with an
  // embedded filter (which would drop the embed instead of the row).
  return filters.service
    ? shaped.filter((t) => t.project_service?.service?.slug === filters.service)
    : shaped
}

export function fetchTasksByProject(projectId: string): Promise<TaskListItem[]> {
  return fetchTasks({ projectId })
}

export async function fetchTask(id: string): Promise<TaskListItem | null> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { subtasks, comment_count, attachment_count, assignees, reviewers, ...rest } = data
  return {
    ...rest,
    assignees: assignees.flatMap((a) => (a.profile ? [a.profile] : [])),
    reviewers: reviewers.flatMap((r) => (r.profile ? [r.profile] : [])),
    subtask_count: subtasks.length,
    subtask_done: subtasks.filter((s) => s.completed).length,
    comment_count: comment_count[0]?.count ?? 0,
    attachment_count: attachment_count[0]?.count ?? 0,
  }
}

export async function createTask(payload: TablesInsert<'tasks'>): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, updates: TablesUpdate<'tasks'>): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Update status (and optionally board position) — used by Kanban drag-and-drop. */
export async function updateTaskStatus(id: string, status: TaskStatus, boardOrder?: number): Promise<TaskRow> {
  const updates: TablesUpdate<'tasks'> = { status }
  if (boardOrder !== undefined) updates.board_order = boardOrder
  return updateTask(id, updates)
}

/** Soft delete (archive). */
export interface MoveTaskArgs {
  taskId: string
  /** Destination service block; the project is derived from it server-side. */
  projectServiceId: string
  /** Stage in the destination service, if one was picked. */
  stageId?: string | null
}

/**
 * Moves a task to another project. Goes through fn_move_task rather than a
 * plain update: the task's attachments carry their own project_id and its stage
 * belongs to the old service, so all three have to change together.
 */
export async function moveTask({ taskId, projectServiceId, stageId }: MoveTaskArgs): Promise<void> {
  const { error } = await supabase.rpc('fn_move_task', {
    p_task_id: taskId,
    p_project_service_id: projectServiceId,
    p_stage_id: stageId ?? undefined,
  })
  if (error) throw error
}

