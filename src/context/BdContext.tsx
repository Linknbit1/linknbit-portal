import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { randomUUID } from '../lib/uuid'
import { CHANNEL_ORDER } from '../constants/bd'
import { useMyPermissions } from '../hooks/usePermissions'
import { ADMINISTRATOR } from '../api/permissions'
import { useAuthContext } from './AuthContext'
import { currentPeriodMonth, type BdPerson } from '../api/bd'
import {
  useBdPeople, useBdLeads, useBdActivities, useBdMeetings, useBdTasks, useBdProjects,
  useBdUpdates, useBdTargets, useBdHandoffs,
  useSaveLead, usePatchLead, useDeleteLead, useLogActivity,
  useSaveMeeting, useDeleteMeeting,
  useSaveBdTask, usePatchBdTask, useDeleteBdTask, useToggleBdChecklistItem, useMoveBdTask,
  useSaveBdProject, usePatchBdProject, useDeleteBdProject,
  useSaveBdUpdate, useSaveBdTargets, useRecordHandoff,
} from '../hooks/useBd'
import { useRealtimeBd } from '../hooks/realtime/useRealtimeBd'
import type {
  Lead, LeadStage, BdActivity, BdMeeting, BdTask, BdProject,
  TaskStatus, ProjectStatus, BdDailyUpdate, BdTarget, ChannelStats, BdHandoff,
} from '../types'

/**
 * The Business Development module's data, composed once.
 *
 * This is deliberately one provider rather than a fetch per page. The nine BD
 * screens are not nine datasets — they are filters and cross-products over the
 * same five collections (a lead's revenue is a channel's revenue is a rep's
 * attainment), and fetching per page made the same rows arrive five times and,
 * worse, let two screens disagree about them for as long as their caches
 * differed. Reading them together is what makes "won a deal on Pipeline" show up
 * on Outreach and Targets in the same frame.
 *
 * The layering is unchanged: components call this, this calls the hooks in
 * src/hooks/useBd.ts, those call src/api/bd.ts. Nothing here talks to Supabase.
 *
 * ── The derived fields ───────────────────────────────────────────────────────
 * `activityCount`, project `progress`/`taskCount`, `channelStats` and target
 * attainment are all computed here and never stored. That is what stops the
 * pipeline and the reports from ever contradicting each other: there is no
 * second copy of the number to go stale.
 */

interface BdContextValue {
  leads: Lead[]
  activities: BdActivity[]
  meetings: BdMeeting[]
  tasks: BdTask[]
  projects: BdProject[]
  updates: BdDailyUpdate[]
  targets: BdTarget[]
  handoffs: BdHandoff[]
  /** Everyone with BD access — the source for every owner/assignee/host picker. */
  people: BdPerson[]
  /** Derived from `activities` + `leads` — never stored, so it cannot drift. */
  channelStats: ChannelStats[]

  /** True only on the very first load, when there is nothing cached to show yet. */
  isLoading: boolean

  /** The signed-in person, as BD sees them. */
  viewerRepId: string
  viewerName: string
  /** True when the viewer may see and edit the whole department, not only their own work. */
  canSeeAll: boolean

  moveLeadStage: (leadId: string, stage: LeadStage, lostReason?: string) => void
  saveLead: (lead: Lead) => void
  patchLead: (leadId: string, patch: Partial<Lead>) => void
  deleteLead: (leadId: string) => void
  logActivity: (activity: Omit<BdActivity, 'id'>) => void
  saveMeeting: (meeting: BdMeeting) => void
  deleteMeeting: (meetingId: string) => void
  saveTask: (task: BdTask) => void
  /** Inline field edit from the task drawer — patches one or more fields in place. */
  patchTask: (taskId: string, patch: Partial<BdTask>) => void
  moveTaskStatus: (taskId: string, status: TaskStatus) => void
  /**
   * Drag-to-position: move a task into `status`, inserted before `beforeId`
   * (or at the end of that lane when null).
   */
  moveTask: (taskId: string, status: TaskStatus, beforeId: string | null) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  deleteTask: (taskId: string) => void
  saveProject: (project: BdProject) => void
  /** Inline field edit from the project detail page. */
  patchProject: (projectId: string, patch: Partial<BdProject>) => void
  moveProjectStatus: (projectId: string, status: ProjectStatus) => void
  deleteProject: (projectId: string) => void
  saveUpdate: (update: BdDailyUpdate) => void
  saveTargets: (targets: BdTarget[]) => void
  /** Record a batch of outreach and roll it into that channel's totals. */
  logBatch: (entry: Omit<BdActivity, 'id' | 'leadId' | 'type'>) => void
  /** Hand a won lead to delivery, and stamp the lead with what it became. */
  recordHandoff: (handoff: BdHandoff) => void
}

const BdContext = createContext<BdContextValue | null>(null)

export function BdProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const periodMonth = useMemo(() => currentPeriodMonth(), [])

  const canSeeAll =
    !!permissions &&
    (permissions.includes(ADMINISTRATOR) || permissions.includes('can_manage_bd'))

  const peopleQ = useBdPeople()
  const leadsQ = useBdLeads()
  const activitiesQ = useBdActivities()
  const meetingsQ = useBdMeetings()
  const tasksQ = useBdTasks()
  const projectsQ = useBdProjects()
  const updatesQ = useBdUpdates()
  const targetsQ = useBdTargets(periodMonth)
  const handoffsQ = useBdHandoffs()

  // One subscription for the module, held for as long as a BD screen is open.
  useRealtimeBd(true)

  const saveLeadM = useSaveLead()
  const patchLeadM = usePatchLead()
  const deleteLeadM = useDeleteLead()
  const logActivityM = useLogActivity()
  const saveMeetingM = useSaveMeeting()
  const deleteMeetingM = useDeleteMeeting()
  const saveTaskM = useSaveBdTask()
  const patchTaskM = usePatchBdTask()
  const deleteTaskM = useDeleteBdTask()
  const toggleChecklistM = useToggleBdChecklistItem()
  const moveTaskM = useMoveBdTask()
  const saveProjectM = useSaveBdProject()
  const patchProjectM = usePatchBdProject()
  const deleteProjectM = useDeleteBdProject()
  const saveUpdateM = useSaveBdUpdate()
  const saveTargetsM = useSaveBdTargets(periodMonth)
  const recordHandoffM = useRecordHandoff()

  const rawLeads = useMemo(() => leadsQ.data ?? [], [leadsQ.data])
  const activities = useMemo(() => activitiesQ.data ?? [], [activitiesQ.data])
  const meetings = useMemo(() => meetingsQ.data ?? [], [meetingsQ.data])
  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data])
  const rawProjects = useMemo(() => projectsQ.data ?? [], [projectsQ.data])
  const updates = useMemo(() => updatesQ.data ?? [], [updatesQ.data])
  const rawTargets = useMemo(() => targetsQ.data ?? [], [targetsQ.data])
  const handoffs = useMemo(() => handoffsQ.data ?? [], [handoffsQ.data])
  const people = useMemo(() => peopleQ.data ?? [], [peopleQ.data])

  const viewerRepId = profile?.id ?? ''
  const viewerName = profile?.name ?? 'You'

  /* ── Derived reads ─────────────────────────────────────────────────────── */

  /** Touchpoint count per lead, off the activity log rather than a stored column. */
  const leads = useMemo<Lead[]>(() => {
    const counts = new Map<string, number>()
    for (const a of activities) {
      if (a.leadId) counts.set(a.leadId, (counts.get(a.leadId) ?? 0) + 1)
    }
    const handedOff = new Map(handoffs.map((h) => [h.leadId, h.id]))
    return rawLeads.map((l) => ({
      ...l,
      activityCount: counts.get(l.id) ?? 0,
      handoffId: handedOff.get(l.id),
    }))
  }, [rawLeads, activities, handoffs])

  /** A campaign's progress is its tasks' completion — there is nothing else it could be. */
  const projects = useMemo<BdProject[]>(
    () =>
      rawProjects.map((p) => {
        const own = tasks.filter((t) => t.projectId === p.id)
        const done = own.filter((t) => t.status === 'completed' || t.status === 'approved').length
        return {
          ...p,
          taskCount: own.length,
          progress: own.length === 0 ? 0 : Math.round((done / own.length) * 100),
        }
      }),
    [rawProjects, tasks],
  )

  /**
   * Channel performance, computed rather than stored.
   *
   * Effort comes from activities, outcome comes from leads — so a won deal shows
   * up as that channel's revenue automatically, and the Outreach page can never
   * contradict the pipeline.
   *
   * `trend` compares this month's volume against last month's, which is the one
   * figure that genuinely needs two periods rather than one.
   */
  const channelStats = useMemo<ChannelStats[]>(() => {
    const now = new Date()
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const thisMonth = monthKey(now)
    const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    return CHANNEL_ORDER.map((channel) => {
      const effort = activities.filter((a) => a.channel === channel)
      const channelLeads = leads.filter((l) => l.channel === channel)
      const won = channelLeads.filter((l) => l.stage === 'won')
      // Nobody sends on a passive channel — its volume arrives as replies.
      const passive = channel === 'inbound' || channel === 'referral'

      const volumeIn = (key: string) =>
        effort.filter((a) => a.at.slice(0, 7) === key).reduce((n, a) => n + a.volume, 0)
      const current = volumeIn(thisMonth)
      const previous = volumeIn(lastMonth)

      return {
        channel,
        sent: passive ? 0 : effort.reduce((n, a) => n + a.volume, 0),
        responses: effort.reduce((n, a) => n + (passive ? a.volume : a.responses), 0),
        meetings: effort.reduce((n, a) => n + a.meetingsBooked, 0),
        leads: channelLeads.length,
        won: won.length,
        revenue: won.reduce((n, l) => n + l.value, 0),
        // No previous month to compare against is not a 100% rise; it is no trend.
        trend: previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100),
      }
    })
  }, [activities, leads])

  /**
   * Targets with their actuals read off the live pipeline.
   *
   * A rep with no quota set still gets a row, at zero — otherwise someone joining
   * mid-month vanishes from the department's board until an admin remembers to
   * fill their targets in.
   */
  const targets = useMemo<BdTarget[]>(() => {
    const byRep = new Map(rawTargets.map((t) => [t.repId, t]))
    return people.map((person) => {
      const quota = byRep.get(person.id)
      const ownWon = leads.filter((l) => l.ownerId === person.id && l.stage === 'won')
      const ownLost = leads.filter((l) => l.ownerId === person.id && l.stage === 'lost')
      return {
        repId: person.id,
        repName: person.name,
        revenueTarget: quota?.revenueTarget ?? 0,
        outreachTarget: quota?.outreachTarget ?? 0,
        meetingsTarget: quota?.meetingsTarget ?? 0,
        revenueActual: ownWon.reduce((n, l) => n + l.value, 0),
        outreachActual: activities.filter((a) => a.byId === person.id).reduce((n, a) => n + a.volume, 0),
        meetingsActual: meetings.filter((m) => m.hostId === person.id).length,
        wins: ownWon.length,
        losses: ownLost.length,
      }
    })
  }, [rawTargets, people, leads, activities, meetings])

  /* ── Writes ────────────────────────────────────────────────────────────── */

  const moveLeadStage = useCallback((leadId: string, stage: LeadStage, lostReason?: string) => {
    const closing = stage === 'won' || stage === 'lost' || stage === 'unqualified'
    patchLeadM.mutate({
      id: leadId,
      patch: {
        stage,
        // Closing clears the follow-up; reopening a closed lead clears the reason.
        ...(closing ? { nextFollowUp: null } : {}),
        lostReason: stage === 'lost' ? (lostReason ?? 'No response') : undefined,
        // Mirrors the DB trigger that actually stamps this, so the revenue chart
        // moves with the drop instead of a beat later. The refetch overwrites it
        // with the authoritative timestamp.
        closedAt: closing ? new Date().toISOString() : null,
      },
    })
  }, [patchLeadM])

  const saveLead = useCallback((lead: Lead) => {
    saveLeadM.mutate({ lead, isNew: !rawLeads.some((l) => l.id === lead.id) })
  }, [saveLeadM, rawLeads])

  const patchLead = useCallback((leadId: string, patch: Partial<Lead>) => {
    patchLeadM.mutate({ id: leadId, patch })
  }, [patchLeadM])

  const deleteLead = useCallback((leadId: string) => {
    deleteLeadM.mutate({ id: leadId })
  }, [deleteLeadM])

  const logActivity = useCallback((activity: Omit<BdActivity, 'id'>) => {
    logActivityM.mutate({
      activity: { ...activity, id: randomUUID(), byId: activity.byId || viewerRepId, byName: activity.byName || viewerName },
    })
  }, [logActivityM, viewerRepId, viewerName])

  /** A batch of channel effort — the same record as a touchpoint, with no lead. */
  const logBatch = useCallback((entry: Omit<BdActivity, 'id' | 'leadId' | 'type'>) => {
    logActivityM.mutate({
      activity: {
        ...entry, id: randomUUID(), leadId: null, type: 'note',
        byId: entry.byId || viewerRepId, byName: entry.byName || viewerName,
      },
    })
  }, [logActivityM, viewerRepId, viewerName])

  const saveMeeting = useCallback((meeting: BdMeeting) => {
    saveMeetingM.mutate({ meeting })
  }, [saveMeetingM])

  const deleteMeeting = useCallback((meetingId: string) => {
    deleteMeetingM.mutate({ id: meetingId })
  }, [deleteMeetingM])

  const saveTask = useCallback((task: BdTask) => {
    saveTaskM.mutate({ task, isNew: !tasks.some((t) => t.id === task.id) })
  }, [saveTaskM, tasks])

  const patchTask = useCallback((taskId: string, patch: Partial<BdTask>) => {
    patchTaskM.mutate({ id: taskId, patch })
  }, [patchTaskM])

  const moveTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    patchTaskM.mutate({ id: taskId, patch: { status } })
  }, [patchTaskM])

  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    const item = tasks.find((t) => t.id === taskId)?.checklist.find((c) => c.id === itemId)
    if (!item) return
    toggleChecklistM.mutate({ taskId, itemId, done: !item.done })
  }, [toggleChecklistM, tasks])

  const deleteTask = useCallback((taskId: string) => {
    deleteTaskM.mutate({ id: taskId })
  }, [deleteTaskM])

  const saveProject = useCallback((project: BdProject) => {
    saveProjectM.mutate({ project })
  }, [saveProjectM])

  const patchProject = useCallback((projectId: string, patch: Partial<BdProject>) => {
    patchProjectM.mutate({ id: projectId, patch })
  }, [patchProjectM])

  const moveProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    patchProjectM.mutate({ id: projectId, patch: { status } })
  }, [patchProjectM])

  const deleteProject = useCallback((projectId: string) => {
    deleteProjectM.mutate({ id: projectId })
  }, [deleteProjectM])

  const saveUpdate = useCallback((update: BdDailyUpdate) => {
    saveUpdateM.mutate({ update })
  }, [saveUpdateM])

  const saveTargets = useCallback((next: BdTarget[]) => {
    saveTargetsM.mutate({ targets: next })
  }, [saveTargetsM])

  const recordHandoff = useCallback((handoff: BdHandoff) => {
    // The handoff is itself a touchpoint worth keeping on the lead's timeline.
    const lead = rawLeads.find((l) => l.id === handoff.leadId)
    recordHandoffM.mutate({
      handoff,
      activity: {
        id: randomUUID(),
        leadId: handoff.leadId,
        channel: lead?.channel ?? 'referral',
        type: 'stage_change',
        at: handoff.at,
        note: `Handed to delivery as “${handoff.projectName}”, owned by ${handoff.managerName}.`,
        volume: 1, responses: 0, meetingsBooked: 0, leadsCreated: 0,
        byId: viewerRepId, byName: viewerName,
      },
    })
  }, [recordHandoffM, rawLeads, viewerRepId, viewerName])

  const isLoading =
    leadsQ.isLoading || tasksQ.isLoading || projectsQ.isLoading || activitiesQ.isLoading || peopleQ.isLoading

  const value = useMemo<BdContextValue>(
    () => ({
      leads, activities, meetings, tasks, projects, updates, handoffs, targets, people,
      channelStats, isLoading,
      viewerRepId, viewerName, canSeeAll,
      moveLeadStage, saveLead, patchLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, patchTask, moveTaskStatus, moveTask: moveTaskM, toggleChecklistItem, deleteTask,
      saveProject, patchProject, moveProjectStatus, deleteProject,
      saveUpdate, saveTargets, logBatch, recordHandoff,
    }),
    [
      leads, activities, meetings, tasks, projects, updates, handoffs, targets, people,
      channelStats, isLoading,
      viewerRepId, viewerName, canSeeAll,
      moveLeadStage, saveLead, patchLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, patchTask, moveTaskStatus, moveTaskM, toggleChecklistItem, deleteTask,
      saveProject, patchProject, moveProjectStatus, deleteProject,
      saveUpdate, saveTargets, logBatch, recordHandoff,
    ],
  )

  return <BdContext.Provider value={value}>{children}</BdContext.Provider>
}

// Same exemption AuthContext takes: a provider and its hook belong in one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useBd(): BdContextValue {
  const ctx = useContext(BdContext)
  if (!ctx) throw new Error('useBd must be used inside <BdProvider>')
  return ctx
}
