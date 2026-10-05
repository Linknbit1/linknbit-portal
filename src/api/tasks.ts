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

/** Tasks fetched in one go before the caller must narrow. */
export const DEFAULT_TASK_LIMIT = 500

/**
 * The one status that has to explain itself. Matched by key rather than by a
 * flag because fn_track_blocked_state matches it by key: a move into it without
 * a blocked_reason in the same write is refused with `blocked_reason_required`.
 */
export const BLOCKED_STATUS = 'blocked'

/** What a task is stuck on, written in the same update that moves it to Blocked. */
export interface BlockDetails {
  reason: string
  /** Who can unblock it, when that is a person. */
  blockedOnId: string | null
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
  /** Override the default ceiling. Raise it knowingly, never by habit. */
  limit?: number
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
  // Through the join table, never tasks.assignee_id. 114 of 447 assignments are
  // to somebody who is not the primary, so filtering on the single column would
  // silently drop a quarter of them — which is exactly what "filter the task list
  // by employee" is for.
  if (filters.assigneeId) {
    const { data: rows, error: assigneeError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('profile_id', filters.assigneeId)
    if (assigneeError) throw assigneeError
    const ids = (rows ?? []).map((r) => r.task_id)
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  // A ceiling, not paging. Every caller renders a board or a table that a person
  // reads, and nobody reads two thousand cards — but without a limit this select
  // pulls every task RLS allows, with eight embedded relations, on every fetch.
  // At 350 tasks that is invisible; the cliff arrives quietly.
  query = query.limit(filters.limit ?? DEFAULT_TASK_LIMIT)

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
  // Service still lives two joins away: an embedded filter drops the EMBED rather
  // than the row, so PostgREST cannot express it. Matching here is correct, but it
  // means the limit above is applied before the narrowing — so a service filter is
  // narrowing a page, not the whole table. Callers that need a service in full
  // should pass projectServiceId, which the query does filter on.
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

/**
 * Writes a lane's new card positions after a drag.
 *
 * Two things this is careful about, both of them triggers on `tasks`:
 *
 * - `status` is sent ONLY for the card that actually changed column.
 *   `trg_tasks_notify_reviewers` fires on `UPDATE OF status`, which means the
 *   column appearing in the SET clause at all — not its value changing. Sending
 *   it on every row would notify reviewers for every card the drag shifted.
 * - The caller sends only the rows whose index moved, so dropping a card near
 *   the end of a long lane writes two rows rather than thirty.
 * - A move into Blocked carries its reason in the same row update, because the
 *   trigger checks the reason on the write that changes the status.
 */
export async function reorderBoardTasks(
  positions: { id: string; boardOrder: number }[],
  moved?: { id: string; status: TaskStatus; block?: BlockDetails },
): Promise<void> {
  const results = await Promise.all(
    positions.map(({ id, boardOrder }) => {
      const updates: TablesUpdate<'tasks'> = { board_order: boardOrder }
      if (moved?.id === id) {
        updates.status = moved.status
        if (moved.block) {
          updates.blocked_reason = moved.block.reason
          updates.blocked_on_id = moved.block.blockedOnId
        }
      }
      return supabase.from('tasks').update(updates).eq('id', id)
    }),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
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

/** What is stuck and is this person's to unstick. Drives the Delivery nav badges. */
export interface DeliveryAttention {
  overdue: number
  blocked: number
  reviewNoOwner: number
}

export async function fetchDeliveryAttention(): Promise<DeliveryAttention> {
  const { data, error } = await supabase.rpc('delivery_attention_counts')
  if (error) throw error
  const row = data?.[0]
  return {
    overdue: row?.overdue ?? 0,
    blocked: row?.blocked ?? 0,
    reviewNoOwner: row?.review_no_owner ?? 0,
  }
}
