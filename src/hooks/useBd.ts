import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '../components/ui/toast-context'
import { useAuthContext } from '../context/AuthContext'
import * as bd from '../api/bd'
import type { BdComment, BdCommentParent, BdPerson } from '../api/bd'
import type {
  Lead, BdActivity, BdMeeting, BdTask, BdProject, BdDailyUpdate, BdTarget, BdHandoff, TaskStatus,
} from '../types'

/**
 * Business Development server state.
 *
 * ── Everything is optimistic ─────────────────────────────────────────────────
 *
 * BD is a drag-a-card, tick-a-box, type-a-comment module. Waiting on a round trip
 * for any of that reads as lag, so no mutation here shows a spinner: `onMutate`
 * paints the change into the cache, the request goes out behind it, and
 * `onError` puts the previous cache back and says so in a toast. The screens
 * never see a pending state, which is why none of them have one.
 *
 * That contract only holds because ids are minted client-side (see src/api/bd.ts):
 * the optimistic row and the stored row are the same row, so the reconciling
 * refetch in `onSettled` changes nothing visible.
 *
 * The one exception is {@link useImportLeads}. A CSV import is not an
 * interaction to keep responsive — it is a batch the operator waits on and
 * wants a count back from — so it is a plain mutation with a pending state.
 *
 * ── Query keys ───────────────────────────────────────────────────────────────
 * The module's records are read together on almost every screen (the pipeline
 * needs activities, the board needs projects, targets need all three), so each
 * collection is one cache entry rather than a per-filter key. Filtering is a
 * render concern; refetching per filter would just make the same data arrive
 * three times.
 */

export const BD_KEYS = {
  all: ['bd'] as const,
  people: ['bd', 'people'] as const,
  leads: ['bd', 'leads'] as const,
  activities: ['bd', 'activities'] as const,
  meetings: ['bd', 'meetings'] as const,
  /** The viewer's own schedule — a different question, and a different policy path. */
  myMeetings: ['bd', 'myMeetings'] as const,
  tasks: ['bd', 'tasks'] as const,
  projects: ['bd', 'projects'] as const,
  updates: ['bd', 'updates'] as const,
  targets: (periodMonth: string) => ['bd', 'targets', periodMonth] as const,
  handoffs: ['bd', 'handoffs'] as const,
  comments: (parentType: BdCommentParent, parentId: string) =>
    ['bd', 'comments', parentType, parentId] as const,
}

/**
 * Long enough that moving between BD screens never refetches, short enough that
 * a tab left open overnight is not showing yesterday's pipeline. Realtime covers
 * the gap in between.
 */
const STALE = 60_000

/* ── Queries ─────────────────────────────────────────────────────────────── */

export function useBdPeople() {
  return useQuery({ queryKey: BD_KEYS.people, queryFn: bd.fetchBdPeople, staleTime: 5 * 60_000 })
}

export function useBdLeads() {
  return useQuery({ queryKey: BD_KEYS.leads, queryFn: bd.fetchLeads, staleTime: STALE })
}

export function useBdActivities() {
  return useQuery({ queryKey: BD_KEYS.activities, queryFn: bd.fetchActivities, staleTime: STALE })
}

export function useBdMeetings() {
  return useQuery({ queryKey: BD_KEYS.meetings, queryFn: bd.fetchMeetings, staleTime: STALE })
}

/**
 * The signed-in person's own client meetings.
 *
 * Standalone rather than a filter over `useBdMeetings`, because the people who
 * need it — an invited team lead, a PM on a kickoff — cannot read bd_meetings at
 * all. Its own key, so a BD user opening both screens does not have one answer
 * overwrite the other.
 */
export function useMyMeetings() {
  return useQuery({ queryKey: BD_KEYS.myMeetings, queryFn: bd.fetchMyMeetings, staleTime: STALE })
}

/**
 * How many of the viewer's meetings are still ahead of them — the sidebar badge.
 *
 * Reads the same cache entry as `useMyMeetings`, narrowed with `select`, so the
 * always-mounted sidebar costs no extra request. `staleTime` alone would let the
 * count sit stale all afternoon, so this also refetches on an interval: a badge
 * that still says 1 after the meeting has passed is worse than no badge.
 */
export function useMyUpcomingMeetingCount(enabled: boolean) {
  return useQuery({
    queryKey: BD_KEYS.myMeetings,
    queryFn: bd.fetchMyMeetings,
    enabled,
    staleTime: STALE,
    refetchInterval: 5 * 60_000,
    select: (meetings) => {
      const now = Date.now()
      return meetings.filter((m) => new Date(m.scheduledAt).getTime() >= now).length
    },
  })
}

export function useBdTasks() {
  return useQuery({ queryKey: BD_KEYS.tasks, queryFn: bd.fetchBdTasks, staleTime: STALE })
}

export function useBdProjects() {
  return useQuery({ queryKey: BD_KEYS.projects, queryFn: bd.fetchBdProjects, staleTime: STALE })
}

export function useBdUpdates() {
  return useQuery({ queryKey: BD_KEYS.updates, queryFn: bd.fetchDailyUpdates, staleTime: STALE })
}

export function useBdTargets(periodMonth: string) {
  return useQuery({
    queryKey: BD_KEYS.targets(periodMonth),
    queryFn: () => bd.fetchTargets(periodMonth),
    staleTime: STALE,
  })
}

export function useBdHandoffs() {
  return useQuery({ queryKey: BD_KEYS.handoffs, queryFn: bd.fetchHandoffs, staleTime: STALE })
}

/** Department revenue quota per month — the target series on the trend chart. */
export function useBdTargetTotals(fromMonth: string) {
  return useQuery({
    queryKey: ['bd', 'targetTotals', fromMonth] as const,
    queryFn: () => bd.fetchTargetTotals(fromMonth),
    staleTime: STALE,
  })
}

/* ── The optimistic write helper ─────────────────────────────────────────── */

/** A cache entry to snapshot before an optimistic write, and restore if it fails. */
interface Touched {
  key: QueryKey
  previous: unknown
}

/**
 * Cancel any in-flight fetch of these keys and snapshot what they hold.
 *
 * Cancelling first is what stops a refetch that started before the click from
 * landing *after* the optimistic write and undoing it — the one failure mode of
 * optimistic updates that looks like a bug in the UI rather than in the network.
 */
async function snapshot(qc: QueryClient, keys: QueryKey[]): Promise<Touched[]> {
  const touched: Touched[] = []
  for (const key of keys) {
    await qc.cancelQueries({ queryKey: key })
    touched.push({ key, previous: qc.getQueryData(key) })
  }
  return touched
}

function rollback(qc: QueryClient, touched: Touched[] | undefined) {
  for (const t of touched ?? []) qc.setQueryData(t.key, t.previous)
}

/**
 * Wire one optimistic mutation.
 *
 * `optimistic` runs before the request and must be pure — it may be called with
 * an empty cache, and it must not read anything it did not receive.
 */
function useOptimisticMutation<TArgs>(options: {
  /**
   * The cache entries this write touches. Either a fixed list, or a function of
   * the arguments for writes whose target depends on them (a comment thread's
   * key is its parent record).
   */
  keys: QueryKey[] | ((args: TArgs) => QueryKey[])
  optimistic: (qc: QueryClient, args: TArgs) => void
  run: (args: TArgs) => Promise<void>
  /** Shown when the write fails and the UI snaps back. Say what was lost. */
  errorMessage: string
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const { keys, optimistic, run, errorMessage } = options
  const keysFor = (args: TArgs) => (typeof keys === 'function' ? keys(args) : keys)

  return useMutation<void, Error, TArgs, Touched[]>({
    mutationFn: run,
    onMutate: async (args) => {
      const touched = await snapshot(qc, keysFor(args))
      optimistic(qc, args)
      return touched
    },
    onError: (_error, _args, context) => {
      rollback(qc, context)
      toast(errorMessage, 'error')
    },
    // Reconcile with the server. The cache already holds the right answer, so
    // this is silent — TanStack keeps serving the current data while it refetches.
    onSettled: (_data, _error, args) => {
      for (const key of keysFor(args)) qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** Replace one item in a cached list, leaving order untouched. */
function patchIn<T extends { id: string }>(qc: QueryClient, key: QueryKey, id: string, patch: Partial<T>) {
  qc.setQueryData<T[]>(key, (cur) => cur?.map((i) => (i.id === id ? { ...i, ...patch } : i)))
}

/** Insert at the front, or replace if an item with that id is already there. */
function upsertIn<T extends { id: string }>(qc: QueryClient, key: QueryKey, item: T) {
  qc.setQueryData<T[]>(key, (cur = []) =>
    cur.some((i) => i.id === item.id) ? cur.map((i) => (i.id === item.id ? item : i)) : [item, ...cur],
  )
}

function removeFrom<T extends { id: string }>(qc: QueryClient, key: QueryKey, id: string) {
  qc.setQueryData<T[]>(key, (cur) => cur?.filter((i) => i.id !== id))
}

/** The signed-in person, as the id every write stamps itself with. */
function useActorId(): string | null {
  const { profile } = useAuthContext()
  return profile?.id ?? null
}

/* ── Leads ───────────────────────────────────────────────────────────────── */

export function useSaveLead() {
  const actorId = useActorId()
  return useOptimisticMutation<{ lead: Lead; isNew: boolean }>({
    keys: [BD_KEYS.leads],
    optimistic: (qc, { lead }) => upsertIn(qc, BD_KEYS.leads, lead),
    run: ({ lead, isNew }) => (isNew ? bd.createLead(lead, actorId) : bd.updateLead(lead.id, lead)),
    errorMessage: 'Could not save the lead — your change has been undone.',
  })
}

/**
 * Bulk insert from the CSV importer.
 *
 * Deliberately not optimistic, unlike every other write in this file: the
 * modal stays open until the server has taken the rows, because "42 leads
 * imported" is a claim worth only making once it is true. Failure surfaces in
 * the modal rather than as a toast over a screen the user already left.
 */
export function useImportLeads() {
  const qc = useQueryClient()
  const actorId = useActorId()
  return useMutation<void, Error, { leads: Lead[] }>({
    mutationFn: ({ leads }) => bd.importLeads(leads, actorId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: BD_KEYS.leads }) },
  })
}

export function usePatchLead() {
  return useOptimisticMutation<{ id: string; patch: Partial<Lead> }>({
    keys: [BD_KEYS.leads],
    optimistic: (qc, { id, patch }) => patchIn<Lead>(qc, BD_KEYS.leads, id, patch),
    run: ({ id, patch }) => bd.updateLead(id, patch),
    errorMessage: 'Could not update the lead — your change has been undone.',
  })
}

export function useDeleteLead() {
  return useOptimisticMutation<{ id: string }>({
    // Activities cascade with the lead in the database, so the cache has to as
    // well or the Outreach totals stay high until the next refetch.
    keys: [BD_KEYS.leads, BD_KEYS.activities],
    optimistic: (qc, { id }) => {
      removeFrom<Lead>(qc, BD_KEYS.leads, id)
      qc.setQueryData<BdActivity[]>(BD_KEYS.activities, (cur) => cur?.filter((a) => a.leadId !== id))
    },
    run: ({ id }) => bd.deleteLead(id),
    errorMessage: 'Could not delete the lead — it has been restored.',
  })
}

/* ── Activities ──────────────────────────────────────────────────────────── */

/**
 * Logging effort is two writes that must agree: the activity itself, and the
 * lead's `last_contacted`. Both land in the cache together and roll back
 * together, so a failed log can never leave a lead claiming it was contacted.
 */
export function useLogActivity() {
  return useOptimisticMutation<{ activity: BdActivity }>({
    keys: [BD_KEYS.activities, BD_KEYS.leads],
    optimistic: (qc, { activity }) => {
      qc.setQueryData<BdActivity[]>(BD_KEYS.activities, (cur = []) => [activity, ...cur])
      if (activity.leadId) {
        patchIn<Lead>(qc, BD_KEYS.leads, activity.leadId, { lastContacted: activity.at.slice(0, 10) })
      }
    },
    run: async ({ activity }) => {
      await bd.createActivity(activity)
      if (activity.leadId) {
        await bd.updateLead(activity.leadId, { lastContacted: activity.at.slice(0, 10) })
      }
    },
    errorMessage: 'Could not log that activity — it has been removed.',
  })
}

/* ── Meetings ────────────────────────────────────────────────────────────── */

export function useSaveMeeting() {
  const actorId = useActorId()
  return useOptimisticMutation<{ meeting: BdMeeting }>({
    // The viewer's own schedule can change too — they may have put themselves on
    // it, or taken themselves off — and that is a separate cache entry.
    keys: [BD_KEYS.meetings, BD_KEYS.myMeetings],
    optimistic: (qc, { meeting }) => {
      qc.setQueryData<BdMeeting[]>(BD_KEYS.meetings, (cur = []) => {
        const next = cur.some((m) => m.id === meeting.id)
          ? cur.map((m) => (m.id === meeting.id ? meeting : m))
          : [...cur, meeting]
        // The schedule reads chronologically, so a rescheduled meeting has to
        // move rather than sit where it was until the refetch.
        return next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      })
    },
    run: async ({ meeting }) => {
      const { addedAttendeeIds } = await bd.saveMeeting(meeting, actorId)
      // Not awaited into the failure path on purpose: the meeting is saved and
      // the in-portal notification has fired by now, so a mail problem must not
      // roll the UI back. The invitee still has the notification either way.
      void bd.sendMeetingInvites(meeting.id, addedAttendeeIds).catch(() => {})
    },
    errorMessage: 'Could not save the meeting — your change has been undone.',
  })
}

export function useDeleteMeeting() {
  return useOptimisticMutation<{ id: string }>({
    keys: [BD_KEYS.meetings, BD_KEYS.myMeetings],
    optimistic: (qc, { id }) => {
      removeFrom<BdMeeting>(qc, BD_KEYS.meetings, id)
      removeFrom<BdMeeting>(qc, BD_KEYS.myMeetings, id)
    },
    run: ({ id }) => bd.deleteMeeting(id),
    errorMessage: 'Could not delete the meeting — it has been restored.',
  })
}

/* ── Tasks ───────────────────────────────────────────────────────────────── */

export function useSaveBdTask() {
  const actorId = useActorId()
  return useOptimisticMutation<{ task: BdTask; isNew: boolean }>({
    keys: [BD_KEYS.tasks],
    optimistic: (qc, { task }) => upsertIn(qc, BD_KEYS.tasks, task),
    run: ({ task, isNew }) => (isNew ? bd.createBdTask(task, actorId) : bd.updateBdTask(task.id, task)),
    errorMessage: 'Could not save the task — your change has been undone.',
  })
}

export function usePatchBdTask() {
  return useOptimisticMutation<{ id: string; patch: Partial<BdTask> }>({
    keys: [BD_KEYS.tasks],
    optimistic: (qc, { id, patch }) => patchIn<BdTask>(qc, BD_KEYS.tasks, id, patch),
    run: ({ id, patch }) => bd.updateBdTask(id, patch),
    errorMessage: 'Could not update the task — your change has been undone.',
  })
}

export function useDeleteBdTask() {
  return useOptimisticMutation<{ id: string }>({
    keys: [BD_KEYS.tasks],
    optimistic: (qc, { id }) => removeFrom<BdTask>(qc, BD_KEYS.tasks, id),
    run: ({ id }) => bd.deleteBdTask(id),
    errorMessage: 'Could not delete the task — it has been restored.',
  })
}

/**
 * Ticking a checklist item.
 *
 * Its own mutation rather than a `patchTask({ checklist })` because it is the
 * one BD write people do in bursts, and rewriting the whole list per tick would
 * send five statements where one belongs.
 */
export function useToggleBdChecklistItem() {
  return useOptimisticMutation<{ taskId: string; itemId: string; done: boolean }>({
    keys: [BD_KEYS.tasks],
    optimistic: (qc, { taskId, itemId, done }) => {
      qc.setQueryData<BdTask[]>(BD_KEYS.tasks, (cur) =>
        cur?.map((t) =>
          t.id === taskId
            ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }
            : t,
        ),
      )
    },
    run: ({ itemId, done }) => bd.setChecklistItemDone(itemId, done),
    errorMessage: 'Could not save that tick — it has been undone.',
  })
}

/**
 * Distance between two adjacent cards when a lane is first laid out. Large so a
 * long run of "drop between these two" halvings stays well clear of float
 * precision; a lane would need ~50 consecutive midpoint inserts at the same spot
 * before it mattered.
 */
const POSITION_GAP = 1024

/**
 * Where a card dropped into `status` before `beforeId` should sort.
 *
 * Exported because the board computes it to paint the move before the mutation
 * is even called — the drop has to land under the cursor, not after a round trip.
 */
export function positionFor(tasks: BdTask[], status: TaskStatus, beforeId: string | null, movingId: string): number {
  const lane = tasks
    .filter((t) => t.status === status && t.id !== movingId)
    .sort((a, b) => a.position - b.position)

  if (lane.length === 0) return POSITION_GAP

  const idx = beforeId ? lane.findIndex((t) => t.id === beforeId) : -1
  // No anchor, or an anchor that has since moved: append.
  if (idx === -1) return lane[lane.length - 1].position + POSITION_GAP
  // Dropped at the head.
  if (idx === 0) return lane[0].position - POSITION_GAP
  return (lane[idx - 1].position + lane[idx].position) / 2
}

/**
 * Where a newly created card should sort: the head of its lane.
 *
 * Appending would drop a brand-new task below thirty finished ones, and the
 * drawer that opens on it would be scrolled off-screen behind the board.
 */
export function nextPosition(tasks: BdTask[], status: TaskStatus): number {
  const lane = tasks.filter((t) => t.status === status)
  if (lane.length === 0) return POSITION_GAP
  return Math.min(...lane.map((t) => t.position)) - POSITION_GAP
}

/**
 * Drag-to-position on the board.
 *
 * Its own mutation rather than `patchTask({ status, position })` because the
 * cached list has to be *re-sorted*, not just patched: the board renders each
 * lane in array order, so patching the position in place would leave the card
 * sitting exactly where it was picked up until the refetch landed — it would
 * look like the drop had failed.
 */
export function useMoveBdTaskMutation() {
  return useOptimisticMutation<{ id: string; status: TaskStatus; position: number }>({
    keys: [BD_KEYS.tasks],
    optimistic: (qc, { id, status, position }) => {
      qc.setQueryData<BdTask[]>(BD_KEYS.tasks, (cur) =>
        cur
          ?.map((t) => (t.id === id ? { ...t, status, position } : t))
          .sort((a, b) => a.position - b.position),
      )
    },
    run: ({ id, status, position }) => bd.updateBdTask(id, { status, position }),
    errorMessage: 'Could not move the task — it is back where it was.',
  })
}

export function useMoveBdTask() {
  const move = useMoveBdTaskMutation()
  const qc = useQueryClient()

  return useCallback(
    (taskId: string, status: TaskStatus, beforeId: string | null) => {
      const tasks = qc.getQueryData<BdTask[]>(BD_KEYS.tasks) ?? []
      move.mutate({ id: taskId, status, position: positionFor(tasks, status, beforeId, taskId) })
    },
    [move, qc],
  )
}

/* ── Projects ────────────────────────────────────────────────────────────── */

export function useSaveBdProject() {
  const actorId = useActorId()
  return useOptimisticMutation<{ project: BdProject }>({
    keys: [BD_KEYS.projects],
    optimistic: (qc, { project }) => upsertIn(qc, BD_KEYS.projects, project),
    run: ({ project }) => bd.saveBdProject(project, actorId),
    errorMessage: 'Could not save the campaign — your change has been undone.',
  })
}

export function usePatchBdProject() {
  return useOptimisticMutation<{ id: string; patch: Partial<BdProject> }>({
    keys: [BD_KEYS.projects],
    optimistic: (qc, { id, patch }) => patchIn<BdProject>(qc, BD_KEYS.projects, id, patch),
    run: ({ id, patch }) => bd.updateBdProject(id, patch),
    errorMessage: 'Could not update the campaign — your change has been undone.',
  })
}

export function useDeleteBdProject() {
  return useOptimisticMutation<{ id: string }>({
    // Tasks cascade with the campaign — mirror that in the cache so the board
    // does not keep showing cards whose project is gone.
    keys: [BD_KEYS.projects, BD_KEYS.tasks],
    optimistic: (qc, { id }) => {
      removeFrom<BdProject>(qc, BD_KEYS.projects, id)
      qc.setQueryData<BdTask[]>(BD_KEYS.tasks, (cur) => cur?.filter((t) => t.projectId !== id))
    },
    run: ({ id }) => bd.deleteBdProject(id),
    errorMessage: 'Could not delete the campaign — it has been restored.',
  })
}

/* ── Daily updates ───────────────────────────────────────────────────────── */

export function useSaveBdUpdate() {
  return useOptimisticMutation<{ update: BdDailyUpdate }>({
    keys: [BD_KEYS.updates],
    optimistic: (qc, { update }) => {
      // Keyed on rep + date, not id: re-submitting today amends today's row, and
      // the cache has to collapse the two the same way the upsert will.
      qc.setQueryData<BdDailyUpdate[]>(BD_KEYS.updates, (cur = []) => {
        const existing = cur.find((u) => u.repId === update.repId && u.date === update.date)
        return existing
          ? cur.map((u) => (u === existing ? { ...update, id: existing.id } : u))
          : [update, ...cur]
      })
    },
    run: ({ update }) => bd.saveDailyUpdate(update),
    errorMessage: 'Could not save your update — it has been undone.',
  })
}

/* ── Targets ─────────────────────────────────────────────────────────────── */

export function useSaveBdTargets(periodMonth: string) {
  const actorId = useActorId()
  return useOptimisticMutation<{ targets: BdTarget[] }>({
    keys: [BD_KEYS.targets(periodMonth)],
    optimistic: (qc, { targets }) => qc.setQueryData<BdTarget[]>(BD_KEYS.targets(periodMonth), targets),
    run: ({ targets }) => bd.saveTargets(targets, periodMonth, actorId),
    errorMessage: 'Could not save the targets — the previous quotas are back.',
  })
}

/* ── Handoffs ────────────────────────────────────────────────────────────── */

/**
 * Handing a won lead to delivery writes three things: the handoff, the stamp on
 * the lead, and a note on its timeline. All three go into the cache at once, so
 * the drawer behind the modal is already correct when it closes.
 */
export function useRecordHandoff() {
  const actorId = useActorId()
  return useOptimisticMutation<{ handoff: BdHandoff; activity: BdActivity }>({
    keys: [BD_KEYS.handoffs, BD_KEYS.leads, BD_KEYS.activities],
    optimistic: (qc, { handoff, activity }) => {
      qc.setQueryData<BdHandoff[]>(BD_KEYS.handoffs, (cur = []) => [handoff, ...cur])
      patchIn<Lead>(qc, BD_KEYS.leads, handoff.leadId, { handoffId: handoff.id })
      qc.setQueryData<BdActivity[]>(BD_KEYS.activities, (cur = []) => [activity, ...cur])
    },
    run: async ({ handoff, activity }) => {
      await bd.createHandoff(handoff, actorId)
      await bd.createActivity(activity)
    },
    errorMessage: 'Could not record the handoff — nothing was changed.',
  })
}

/* ── Comments ────────────────────────────────────────────────────────────── */

export function useBdComments(parentType: BdCommentParent, parentId: string | undefined) {
  return useQuery({
    queryKey: BD_KEYS.comments(parentType, parentId ?? ''),
    queryFn: () => bd.fetchBdComments(parentType, parentId ?? ''),
    enabled: !!parentId,
    staleTime: 10_000,
  })
}

/**
 * Post a comment.
 *
 * The bubble appears the instant Enter is pressed, flagged `pending` so it can
 * be dimmed, and the flag clears when the server row replaces it. If the insert
 * fails the bubble disappears and the toast says so — better than a comment that
 * looks sent and is not.
 */
export function useCreateBdComment() {
  const { profile } = useAuthContext()

  return useOptimisticMutation<{ comment: BdComment }>({
    keys: ({ comment }) => [BD_KEYS.comments(comment.parentType, comment.parentId)],
    optimistic: (qc, { comment }) => {
      qc.setQueryData<BdComment[]>(
        BD_KEYS.comments(comment.parentType, comment.parentId),
        (cur = []) => [...cur, { ...comment, pending: true }],
      )
    },
    run: async ({ comment }) => {
      if (!profile?.id) throw new Error('Not signed in')
      await bd.createBdComment({
        id: comment.id,
        parentType: comment.parentType,
        parentId: comment.parentId,
        content: comment.content,
        doc: comment.doc,
        authorId: profile.id,
      })
    },
    errorMessage: 'Your comment did not send.',
  })
}

export function useDeleteBdComment(parentType: BdCommentParent, parentId: string) {
  return useOptimisticMutation<{ id: string }>({
    keys: [BD_KEYS.comments(parentType, parentId)],
    optimistic: (qc, { id }) => removeFrom<BdComment>(qc, BD_KEYS.comments(parentType, parentId), id),
    run: ({ id }) => bd.deleteBdComment(id),
    errorMessage: 'Could not delete that comment — it has been restored.',
  })
}

export function useUpdateBdComment(parentType: BdCommentParent, parentId: string) {
  return useOptimisticMutation<{ id: string; content: string; doc: BdComment['doc'] }>({
    keys: [BD_KEYS.comments(parentType, parentId)],
    optimistic: (qc, { id, content, doc }) =>
      patchIn<BdComment>(qc, BD_KEYS.comments(parentType, parentId), id, { content, doc }),
    run: ({ id, content, doc }) => bd.updateBdComment(id, content, doc),
    errorMessage: 'Could not save that edit — it has been undone.',
  })
}

/**
 * Record @mentions. Notifications fire from a DB trigger, so there is no cache
 * to touch — and it is safe to call on every autosave, because only a mention
 * that did not already exist inserts.
 */
export function useSyncBdMentions() {
  const { profile } = useAuthContext()
  return useMutation({
    mutationFn: ({ sourceType, sourceId, profileIds }: {
      sourceType: bd.BdMentionSource; sourceId: string; profileIds: string[]
    }) => (profile?.id ? bd.syncBdMentions(sourceType, sourceId, profileIds, profile.id) : Promise.resolve()),
  })
}

export type { BdComment, BdCommentParent, BdPerson }
