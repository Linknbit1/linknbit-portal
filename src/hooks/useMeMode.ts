import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMentionedTaskIds } from '../api/mentions'
import { useAuthContext } from '../context/AuthContext'
import { useMeMode } from '../context/MeModeContext'
import type { TaskListItem } from '../api/tasks'

export const MENTION_KEYS = {
  myTasks: (profileId: string) => ['mentions', 'my-tasks', profileId] as const,
}

/** Tasks the signed-in user has been tagged in — only fetched while Me Mode is on. */
export function useMentionedTaskIds(active: boolean) {
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { data = [] } = useQuery({
    queryKey: MENTION_KEYS.myTasks(profileId),
    queryFn: () => fetchMentionedTaskIds(profileId),
    enabled: active && !!profileId,
  })

  return useMemo(() => new Set(data), [data])
}

/**
 * Narrows a project list to the ones the signed-in user is actually on: staffed on
 * a service block, or managing it.
 *
 * Membership rather than task assignment, because a project you are staffed on is
 * still yours on the day you happen to have no open task in it. Both fields already
 * ride along on ProjectListItem, so this costs no extra query.
 */
export function useMyProjectsFilter<T extends { manager_id: string | null; members: { id: string }[] }>(
  projects: T[],
): T[] {
  const { enabled } = useMeMode()
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''

  return useMemo(() => {
    if (!enabled || !myId) return projects
    return projects.filter((p) => p.manager_id === myId || p.members.some((m) => m.id === myId))
  }, [projects, enabled, myId])
}

/**
 * Narrows a task list to the signed-in user's own work when Me Mode is on:
 * assigned to them, or tagged on the task or in one of its comments.
 *
 * Returns the list untouched when the mode is off, so callers can apply it
 * unconditionally.
 */
export function useMyTasksFilter(tasks: TaskListItem[]): TaskListItem[] {
  const { enabled } = useMeMode()
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const mentioned = useMentionedTaskIds(enabled)

  return useMemo(() => {
    if (!enabled || !myId) return tasks
    return tasks.filter((t) =>
      t.assignees.some((a) => a.id === myId)
      || t.assignee?.id === myId
      || mentioned.has(t.id))
  }, [tasks, enabled, myId, mentioned])
}
