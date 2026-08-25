import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMentionedTaskIds } from '../api/mentions'
import { useAuthContext } from '../context/AuthContext'
import { useScope } from '../context/ScopeContext'
import { useTeamMembers } from './useTeamMembers'
import type { TaskListItem } from '../api/tasks'

export const MENTION_KEYS = {
  myTasks: (profileId: string) => ['mentions', 'my-tasks', profileId] as const,
}

/** Tasks the signed-in user has been tagged in — only fetched while the lens needs them. */
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
 * Everyone who shares at least one team with the signed-in user, including
 * themselves.
 *
 * Derived from the full team_members list rather than a dedicated query: the
 * table is small, several screens already hold it, and this way the set updates
 * the moment somebody is added to a team.
 */
export function useTeammateIds(active: boolean): ReadonlySet<string> {
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const { data: memberships = [] } = useTeamMembers()

  return useMemo(() => {
    if (!active || !myId) return new Set<string>()
    const myTeams = new Set(
      memberships.filter((m) => m.profile_id === myId).map((m) => m.team_id),
    )
    const ids = new Set<string>([myId])
    for (const m of memberships) {
      if (myTeams.has(m.team_id)) ids.add(m.profile_id)
    }
    return ids
  }, [active, myId, memberships])
}

/**
 * Narrows a project list to the current scope: projects you are staffed on or
 * manage, projects anyone on your teams is staffed on or manages, or all of them.
 *
 * Membership rather than task assignment, because a project you are staffed on is
 * still yours on the day you happen to have no open task in it. Both fields already
 * ride along on ProjectListItem, so this costs no extra query.
 */
export function useScopedProjects<
  T extends { manager_id: string | null; members: { id: string }[] },
>(projects: T[]): T[] {
  const { scope } = useScope()
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const teammates = useTeammateIds(scope === 'team')

  return useMemo(() => {
    if (scope === 'everyone' || !myId) return projects
    const owns = (id: string | null) =>
      scope === 'mine' ? id === myId : id !== null && teammates.has(id)
    return projects.filter(
      (p) => owns(p.manager_id) || p.members.some((m) => owns(m.id)),
    )
  }, [projects, scope, myId, teammates])
}

/**
 * Narrows a task list to the current scope.
 *
 * "Mine" also keeps tasks that merely tag you — being mentioned in a comment is
 * how work reaches you before it is formally assigned. "My team" does not: a
 * mention is personal, and folding everyone's mentions into a team view would
 * make it mean something else.
 *
 * Returns the list untouched on "everyone", so callers can apply it unconditionally.
 */
export function useScopedTasks(tasks: TaskListItem[]): TaskListItem[] {
  const { scope } = useScope()
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const mentioned = useMentionedTaskIds(scope === 'mine')
  const teammates = useTeammateIds(scope === 'team')

  return useMemo(() => {
    if (scope === 'everyone' || !myId) return tasks
    if (scope === 'mine') {
      return tasks.filter(
        (t) =>
          t.assignees.some((a) => a.id === myId) ||
          t.assignee?.id === myId ||
          mentioned.has(t.id),
      )
    }
    return tasks.filter(
      (t) =>
        t.assignees.some((a) => teammates.has(a.id)) ||
        (t.assignee ? teammates.has(t.assignee.id) : false),
    )
  }, [tasks, scope, myId, mentioned, teammates])
}
