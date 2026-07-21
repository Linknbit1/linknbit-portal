import { supabase } from '../lib/supabase'

const BUCKET = 'attachments'

export interface TaskDeleteImpact {
  comments: number
  attachments: number
  subtasks: number
  assignees: number
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

async function taskIdsForProject(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)
  if (error) throw error
  return data.map((row) => row.id)
}

async function deleteStorageObjects(paths: string[]): Promise<void> {
  if (!paths.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}

export async function fetchTaskDeleteImpact(taskId: string): Promise<TaskDeleteImpact> {
  const [comments, attachments, subtasks, assignees] = await Promise.all([
    readCount(supabase.from('comments').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('subtasks').select('id', { count: 'exact', head: true }).eq('task_id', taskId)),
    readCount(supabase.from('task_assignees').select('task_id', { count: 'exact', head: true }).eq('task_id', taskId)),
  ])

  return { comments, attachments, subtasks, assignees }
}

export async function deleteTaskCascade(taskId: string): Promise<void> {
  const { data: paths, error } = await supabase.rpc('delete_task_cascade', { p_task_id: taskId })
  if (error) throw error
  await deleteStorageObjects(paths ?? [])
}

export async function fetchProjectDeleteImpact(projectId: string): Promise<ProjectDeleteImpact> {
  const taskIds = await taskIdsForProject(projectId)
  const [stages, allAttachments, projectAttachments, comments, subtasks, assignees] = await Promise.all([
    readCount(supabase.from('stages').select('id', { count: 'exact', head: true }).eq('project_id', projectId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('project_id', projectId)),
    readCount(supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).is('task_id', null)),
    taskIds.length ? readCount(supabase.from('comments').select('id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
    taskIds.length ? readCount(supabase.from('subtasks').select('id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
    taskIds.length ? readCount(supabase.from('task_assignees').select('task_id', { count: 'exact', head: true }).in('task_id', taskIds)) : 0,
  ])

  return {
    tasks: taskIds.length,
    stages,
    comments,
    attachments: allAttachments,
    projectAttachments,
    subtasks,
    assignees,
  }
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  const { data: paths, error } = await supabase.rpc('delete_project_cascade', { p_project_id: projectId })
  if (error) throw error
  await deleteStorageObjects(paths ?? [])
}
