import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'
import type { PersonMini } from './projects'

export type TaskRow = Tables<'tasks'>
export type TaskStatus = TaskRow['status']
export type TaskPriority = TaskRow['priority']

export interface TaskListItem extends TaskRow {
  project: { id: string; name: string; service_type: string } | null
  /** Primary assignee (tasks.assignee_id) — kept for filters/back-compat. */
  assignee: PersonMini | null
  /** Everyone assigned (task_assignees join table). */
  assignees: PersonMini[]
  stage: { id: string; name: string } | null
  subtask_count: number
  comment_count: number
  attachment_count: number
}

export interface TaskFilters {
  projectId?: string
  status?: TaskStatus
  priority?: TaskPriority
  service?: string
  assigneeId?: string
  search?: string
}

const TASK_SELECT =
  '*, project:projects(id,name,service_type), assignee:profiles!tasks_assignee_id_fkey(id,name,avatar_url), assignees:task_assignees(profile:profiles(id,name,avatar_url)), stage:stages(id,name), subtask_count:subtasks(count), comment_count:comments(count), attachment_count:attachments(count)'

export async function fetchTasks(filters: TaskFilters = {}): Promise<TaskListItem[]> {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .is('deleted_at', null)
    .is('parent_task_id', null)
    .order('board_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.service) query = query.eq('service_type', filters.service)
  if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data.map(({ subtask_count, comment_count, attachment_count, assignees, ...rest }) => ({
    ...rest,
    assignees: assignees.flatMap((a) => (a.profile ? [a.profile] : [])),
    subtask_count: subtask_count[0]?.count ?? 0,
    comment_count: comment_count[0]?.count ?? 0,
    attachment_count: attachment_count[0]?.count ?? 0,
  }))
}

export function fetchTasksByProject(projectId: string): Promise<TaskListItem[]> {
  return fetchTasks({ projectId })
}

export async function fetchTask(id: string): Promise<TaskListItem | null> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { subtask_count, comment_count, attachment_count, assignees, ...rest } = data
  return {
    ...rest,
    assignees: assignees.flatMap((a) => (a.profile ? [a.profile] : [])),
    subtask_count: subtask_count[0]?.count ?? 0,
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
export async function deleteTask(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), deleted_by: auth.user?.id ?? null })
    .eq('id', id)
  if (error) throw error
}
