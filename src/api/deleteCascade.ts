import { supabase } from '../lib/supabase'

const BUCKET = 'attachments'

export interface TaskDeleteImpact {
  comments: number
  attachments: number
  subtasks: number
  assignees: number
  /**
   * Hours logged against the task. Counted because deleting it now erases them
   * — they leave the timesheet with the task, and of everything in these
   * dialogs it is the number worth looking at twice.
   */
  timeEntries: number
}

export interface ProjectDeleteImpact extends TaskDeleteImpact {
  tasks: number
  stages: number
  projectAttachments: number
}

type CountQuery = PromiseLike<{ count: number | null; error: { message: string } | null }>

async function readCount(query: CountQuery): Promise<number> {
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/**
 * Every task in the project, deleted ones included — the project cascade takes
 * those too, so counting only the live ones understated what was about to go.
 */
async function taskIdsForProject(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
  if (error) throw error
  return data.map((row) => row.id)
}

/**
 * Removes the files the cascade orphaned.
 *
 * Nulls are filtered rather than trusted away: an attachment can be a link (a
 * Google Doc) with no file behind it, and one null in the list makes the whole
 * batch fail — which surfaced as a red "Failed" toast after a deletion that had
 * already committed and could not be undone.
 */
async function deleteStorageObjects(paths: (string | null)[]): Promise<void> {
  const real = paths.filter((path): path is string => !!path)
  if (!real.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(real)
  if (error) throw error
}

export async function fetchTaskDeleteImpact(taskId: string): Promise<TaskDeleteImpact> {
  const [comments, attachments, subtasks, assignees, timeEntries] = await Promise.all([
    readCount(supabase.from('comments').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('subtasks').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('task_assignees').select('task_id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('task_time_entries').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
  ])

  return { comments, attachments, subtasks, assignees, timeEntries }
}

export async function deleteTaskCascade(taskId: string): Promise<void> {
  const { data: paths, error } = await supabase.rpc('delete_task_cascade', { p_task_id: taskId })
  if (error) throw error
  await deleteStorageObjects(paths ?? [])
}

export async function fetchProjectDeleteImpact(projectId: string): Promise<ProjectDeleteImpact> {
  const taskIds = await taskIdsForProject(projectId)
  const [stages, allAttachments, projectAttachments, comments, subtasks, assignees, timeEntries] = await Promise.all([
    readCount(supabase.from('stages').select('id', { count: 'exact', head: true }).eq('project_id', projectId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('project_id', projectId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).is('task_id', null)),
    taskIds.length ? readCount(supabase.from('comments').select('id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
    taskIds.length ? readCount(supabase.from('subtasks').select('id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
    taskIds.length ? readCount(supabase.from('task_assignees').select('task_id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
    taskIds.length ? readCount(supabase.from('task_time_entries').select('id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
  ])

  return {
    tasks: taskIds.length,
    stages,
    comments,
    attachments: allAttachments,
    projectAttachments,
    subtasks,
    assignees,
    timeEntries,
  }
}

/**
 * Deletes a project outright — the row, its tasks, and everything hanging off
 * them. There is no restore: the RPC returns the storage paths precisely
 * because the rows that named them are already gone by then.
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  const { data: paths, error } = await supabase.rpc('delete_project_cascade', { p_project_id: projectId })
  if (error) throw error
  await deleteStorageObjects(paths ?? [])
}
