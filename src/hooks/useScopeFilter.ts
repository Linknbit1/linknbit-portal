import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMentionedTaskIds } from '../api/mentions'
import { fetchServiceStaffing } from '../api/projectServices'
import { fetchManagedProjectIds } from '../api/projects'
import { useAuthContext } from '../context/AuthContext'
import { useScope } from '../context/ScopeContext'
import { useTeamMembers } from './useTeamMembers'
import type { TaskListItem } from '../api/tasks'

export const MENTION_KEYS = {
  myTasks: (profileId: string) => ['mentions', 'my-tasks', profileId] as const,
}

/** Both only fetched while the "My team" lens is on, hence their own keys. */
export const SCOPE_KEYS = {
  serviceStaffing: ['service_members', 'staffing'] as const,
  managedProjects: (profileId: string) => ['project_managers', 'mine', profileId] as const,
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
 * The service blocks the viewer's team works in — theirs and their teammates'.
 *
 * Staffing rather than assignment, which is the whole point: a lead's own
 * service block is theirs on the day it holds nothing assigned to anybody, and
 * that is exactly the task that used to vanish.
 */
export function useTeamServiceIds(teammates: ReadonlySet<string>, active: boolean): ReadonlySet<string> {
  const { data = [] } = useQuery({
    queryKey: SCOPE_KEYS.serviceStaffing,
    queryFn: fetchServiceStaffing,
    enabled: active,
    staleTime: 60_000,
  })

  return useMemo(() => {
    const ids = new Set<string>()
    if (!active) return ids
    for (const row of data) {
      if (teammates.has(row.profile_id)) ids.add(row.project_service_id)
    }
    return ids
  }, [active, data, teammates])
}

/** Projects the viewer manages. Managing one means seeing all of it, every service. */
export function useManagedProjectIds(active: boolean): ReadonlySet<string> {
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const { data = [] } = useQuery({
    queryKey: SCOPE_KEYS.managedProjects(myId),
    queryFn: () => fetchManagedProjectIds(myId),
    enabled: active && !!myId,
    staleTime: 60_000,
  })

  return useMemo(() => new Set(data), [data])
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
  T extends { manager_id: string | null; managers: { id: string }[]; members: { id: string }[] },
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
      // Every manager counts, not just the primary one in the legacy column:
      // a project you co-manage is as much yours as one you manage alone.
      (p) => p.managers.some((m) => owns(m.id)) || owns(p.manager_id) || p.members.some((m) => owns(m.id)),
    )
  }, [projects, scope, myId, teammates])
}

/**
 * Narrows a task list to the current scope.
 *
 * "Mine" is work that is yours to do or yours to answer for: assigned to you,
 * tagging you, or raised by you. A mention counts because it is how work reaches
 * you before it is formally assigned; authorship counts because a task you have
 * just written and not yet handed to anybody is still yours, and without it the
 * task somebody creates disappears the moment they save it.
 *
 * "My team" is the same question one level up, and it is deliberately not just
 * "assigned to a teammate": a task sitting in a service block your team is
 * staffed on belongs to your team whether or not anyone is on it yet, and a
 * project you manage is yours in every one of its services. Mentions do not
 * widen here — a mention is personal, and folding everyone's into a team view
 * would make it mean something else.
 *
 * The three sets mirror `task_visible()` in the database, so the lens never
 * hides a row RLS would have returned, nor promises one it would not.
 *
 * Returns the list untouched on "everyone", so callers can apply it unconditionally.
 */
export function useScopedTasks(tasks: TaskListItem[]): TaskListItem[] {
  const { scope } = useScope()
  const { profile } = useAuthContext()
  const myId = profile?.id ?? ''
  const mentioned = useMentionedTaskIds(scope === 'mine')
  const teammates = useTeammateIds(scope === 'team')
  const teamServices = useTeamServiceIds(teammates, scope === 'team')
  const managedProjects = useManagedProjectIds(scope === 'team')

  return useMemo(() => {
    if (scope === 'everyone' || !myId) return tasks
    if (scope === 'mine') {
      return tasks.filter(
        (t) =>
          t.assignees.some((a) => a.id === myId) ||
          t.assignee?.id === myId ||
          t.created_by === myId ||
          mentioned.has(t.id),
      )
    }
    return tasks.filter(
      (t) =>
        t.assignees.some((a) => teammates.has(a.id)) ||
        (t.assignee ? teammates.has(t.assignee.id) : false) ||
        (t.created_by ? teammates.has(t.created_by) : false) ||
        (t.project_service_id ? teamServices.has(t.project_service_id) : false) ||
        managedProjects.has(t.project_id),
    )
  }, [tasks, scope, myId, mentioned, teammates, teamServices, managedProjects])
}
