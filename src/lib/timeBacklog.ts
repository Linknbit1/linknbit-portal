import { secondsBetween } from './duration'
import type { TimeEntryDetail } from '../api/timeEntries'

/**
 * The backlog turns raw start→stop rows into a readable history.
 *
 * A task worked in three sittings has three segments; there is no separate
 * "pause" record because a pause *is* the gap between one segment ending and the
 * next beginning. That gap is what `idleBefore` reports.
 */
export interface BacklogSegment {
  entry: TimeEntryDetail
  seconds: number
  running: boolean
  /** Seconds between the previous segment ending and this one starting, if any. */
  idleBefore: number | null
}

export interface TaskBacklog {
  taskId: string
  title: string
  status: string
  projectId: string | null
  projectName: string | null
  /** Oldest start and newest end across every segment. */
  firstStart: string
  lastEnd: string | null
  totalSeconds: number
  billableSeconds: number
  running: boolean
  people: { id: string; name: string; avatarUrl: string | null; seconds: number }[]
  /** Chronological, so the history reads top-to-bottom as it happened. */
  segments: BacklogSegment[]
}

export interface ProjectBacklog {
  projectId: string | null
  projectName: string
  totalSeconds: number
  billableSeconds: number
  running: boolean
  taskCount: number
  people: { id: string; name: string; avatarUrl: string | null; seconds: number }[]
  tasks: TaskBacklog[]
}

function entrySeconds(entry: TimeEntryDetail, nowMs: number): number {
  return secondsBetween(entry.started_at, entry.ended_at, nowMs)
}

/**
 * Groups segments per task. `nowMs` lets a running timer contribute its elapsed
 * time without this function reaching for the clock itself (keeps it pure and
 * testable, and lets the caller tick it).
 */
export function buildTaskBacklog(entries: TimeEntryDetail[], nowMs = Date.now()): TaskBacklog[] {
  const byTask = new Map<string, TaskBacklog>()

  for (const entry of entries) {
    if (!entry.task) continue
    const existing = byTask.get(entry.task.id)
    const group: TaskBacklog = existing ?? {
      taskId: entry.task.id,
      title: entry.task.title,
      status: entry.task.status,
      projectId: entry.task.project?.id ?? null,
      projectName: entry.task.project?.name ?? null,
      firstStart: entry.started_at,
      lastEnd: entry.ended_at,
      totalSeconds: 0,
      billableSeconds: 0,
      running: false,
      people: [],
      segments: [],
    }
    if (!existing) byTask.set(entry.task.id, group)

    const seconds = entrySeconds(entry, nowMs)
    const running = entry.ended_at === null

    group.totalSeconds += seconds
    if (entry.billable) group.billableSeconds += seconds
    if (running) group.running = true
    if (entry.started_at < group.firstStart) group.firstStart = entry.started_at
    // A running segment has no end, so the task's "last end" stays open.
    if (running) group.lastEnd = null
    else if (group.lastEnd !== null && entry.ended_at && entry.ended_at > group.lastEnd) group.lastEnd = entry.ended_at

    group.segments.push({ entry, seconds, running, idleBefore: null })

    if (entry.profile) {
      const person = group.people.find((p) => p.id === entry.profile!.id)
      if (person) person.seconds += seconds
      else group.people.push({
        id: entry.profile.id,
        name: entry.profile.name,
        avatarUrl: entry.profile.avatar_url ?? null,
        seconds,
      })
    }
  }

  const groups = [...byTask.values()]

  for (const group of groups) {
    // Oldest first so the history reads as it happened, then fill the gaps
    // between consecutive segments — those gaps are the pauses.
    group.segments.sort((a, b) => a.entry.started_at.localeCompare(b.entry.started_at))
    for (let i = 1; i < group.segments.length; i += 1) {
      const prevEnd = group.segments[i - 1].entry.ended_at
      if (!prevEnd) continue
      const gap = secondsBetween(prevEnd, group.segments[i].entry.started_at)
      group.segments[i].idleBefore = gap > 0 ? gap : null
    }
    group.people.sort((a, b) => b.seconds - a.seconds)
  }

  // Most recently worked task first.
  return groups.sort((a, b) => (b.lastEnd ?? '9999').localeCompare(a.lastEnd ?? '9999'))
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export interface BacklogFilters {
  /** Free text matched against project, task, person and the work description. */
  query?: string
  /** Narrow to one person's time. */
  personId?: string
}

/** Everyone who logged time, for the person picker. Derived from the data itself
 *  so the list only offers people who actually have time to show. */
export interface BacklogPerson {
  id: string
  name: string
  avatarUrl: string | null
}

export function collectBacklogPeople(entries: TimeEntryDetail[]): BacklogPerson[] {
  const byId = new Map<string, BacklogPerson>()
  for (const e of entries) {
    if (e.profile && !byId.has(e.profile.id)) {
      byId.set(e.profile.id, { id: e.profile.id, name: e.profile.name, avatarUrl: e.profile.avatar_url ?? null })
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const matches = (needle: string, ...haystacks: (string | null | undefined)[]) =>
  haystacks.some((h) => !!h && h.toLowerCase().includes(needle))

export function filterTimeEntries(entries: TimeEntryDetail[], filters: BacklogFilters): TimeEntryDetail[] {
  const q = filters.query?.trim().toLowerCase() ?? ''
  if (!q && !filters.personId) return entries

  return entries.filter((e) => {
    if (filters.personId && e.profile?.id !== filters.personId) return false
    if (!q) return true
    return matches(q, e.task?.title, e.task?.project?.name, e.profile?.name, e.note)
  })
}

/** Rolls the task groups up per project — "what did this whole project cost". */
export function buildProjectBacklog(entries: TimeEntryDetail[], nowMs = Date.now()): ProjectBacklog[] {
  const tasks = buildTaskBacklog(entries, nowMs)
  const byProject = new Map<string, ProjectBacklog>()

  for (const task of tasks) {
    const key = task.projectId ?? '__none__'
    const existing = byProject.get(key)
    const group: ProjectBacklog = existing ?? {
      projectId: task.projectId,
      projectName: task.projectName ?? 'No project',
      totalSeconds: 0,
      billableSeconds: 0,
      running: false,
      taskCount: 0,
      people: [],
      tasks: [],
    }
    if (!existing) byProject.set(key, group)

    group.totalSeconds += task.totalSeconds
    group.billableSeconds += task.billableSeconds
    group.taskCount += 1
    if (task.running) group.running = true
    group.tasks.push(task)

    for (const person of task.people) {
      const found = group.people.find((p) => p.id === person.id)
      if (found) found.seconds += person.seconds
      else group.people.push({ ...person })
    }
  }

  const groups = [...byProject.values()]
  for (const group of groups) group.people.sort((a, b) => b.seconds - a.seconds)
  return groups.sort((a, b) => b.totalSeconds - a.totalSeconds)
}
