import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { randomUUID } from '../lib/uuid'
import { useMyPermissions } from '../hooks/usePermissions'
import { ADMINISTRATOR } from '../api/permissions'
import { useAuthContext } from '../context/AuthContext'
import {
  LEADS, BD_ACTIVITIES, BD_MEETINGS, BD_TASKS, BD_PROJECTS, BD_DAILY_UPDATES, BD_TARGETS,
  CHANNEL_STATS, BD_OUTREACH_LOGS, BD_REPS,
} from '../data/bdMock'
import type {
  Lead, LeadStage, BdActivity, BdMeeting, BdTask, BdProject,
  TaskStatus, ProjectStatus, BdDailyUpdate, BdTarget, ChannelStats, BdOutreachLog,
} from '../types'

/**
 * In-memory state for the Business Development prototype.
 *
 * The module is interactive but not yet wired to a backend: every edit lands
 * here and lives for the session. It is deliberately a Context rather than
 * per-page useState so a change made on one screen is visible on the others —
 * moving a lead to Won updates the funnel on Reports, logging an activity bumps
 * the lead's counter in the drawer.
 *
 * This file is disposable. When src/api/bd.ts and the TanStack Query hooks land,
 * every consumer swaps `useBd()` for the real hooks and this is deleted — which
 * is why nothing outside it imports from src/data/bdMock.ts directly.
 */

interface BdContextValue {
  leads: Lead[]
  activities: BdActivity[]
  meetings: BdMeeting[]
  tasks: BdTask[]
  projects: BdProject[]
  updates: BdDailyUpdate[]
  targets: BdTarget[]
  channelStats: ChannelStats[]
  outreachLogs: BdOutreachLog[]

  /** The BD person the signed-in user acts as. See `viewerRepId` below. */
  viewerRepId: string
  viewerName: string
  /** True when the viewer may see the whole department rather than only their own work. */
  canSeeAll: boolean

  moveLeadStage: (leadId: string, stage: LeadStage, lostReason?: string) => void
  saveLead: (lead: Lead) => void
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
   * (or at the end of that lane when null). Order is the array's own order.
   */
  moveTask: (taskId: string, status: TaskStatus, beforeId: string | null) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  deleteTask: (taskId: string) => void
  saveProject: (project: BdProject) => void
  moveProjectStatus: (projectId: string, status: ProjectStatus) => void
  deleteProject: (projectId: string) => void
  saveUpdate: (update: BdDailyUpdate) => void
  saveTargets: (targets: BdTarget[]) => void
  /** Record a batch of outreach and roll it into that channel's totals. */
  logOutreach: (entry: Omit<BdOutreachLog, 'id'>, passive: boolean) => void
}

const BdContext = createContext<BdContextValue | null>(null)

export function BdPrototypeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()

  const [leads, setLeads] = useState<Lead[]>(LEADS)
  const [activities, setActivities] = useState<BdActivity[]>(BD_ACTIVITIES)
  const [meetings, setMeetings] = useState<BdMeeting[]>(BD_MEETINGS)
  const [tasks, setTasks] = useState<BdTask[]>(BD_TASKS)
  const [projects, setProjects] = useState<BdProject[]>(BD_PROJECTS)
  const [updates, setUpdates] = useState<BdDailyUpdate[]>(BD_DAILY_UPDATES)
  const [targets, setTargets] = useState<BdTarget[]>(BD_TARGETS)
  const [channelStats, setChannelStats] = useState<ChannelStats[]>(CHANNEL_STATS)
  const [outreachLogs, setOutreachLogs] = useState<BdOutreachLog[]>(BD_OUTREACH_LOGS)

  const canSeeAll =
    !!permissions &&
    (permissions.includes(ADMINISTRATOR) || permissions.includes('can_manage_bd'))

  /**
   * Which BD rep the viewer *is*. The mock team is fictional, so a signed-in
   * account only matches by name in a seeded demo; everyone else is treated as
   * the BD Manager so "My work" has something in it. Once leads carry a real
   * profile id this collapses to `profile.id`.
   */
  const viewerRep =
    BD_REPS.find((r) => r.name === profile?.name) ?? BD_REPS[0]

  const moveLeadStage = useCallback((leadId: string, stage: LeadStage, lostReason?: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              stage,
              // Closing clears the follow-up; reopening a closed lead clears the reason.
              nextFollowUp: stage === 'won' || stage === 'lost' ? null : l.nextFollowUp,
              lostReason: stage === 'lost' ? (lostReason ?? l.lostReason ?? 'No response') : undefined,
            }
          : l,
      ),
    )
  }, [])

  const saveLead = useCallback((lead: Lead) => {
    setLeads((prev) => {
      const exists = prev.some((l) => l.id === lead.id)
      return exists ? prev.map((l) => (l.id === lead.id ? lead : l)) : [{ ...lead }, ...prev]
    })
  }, [])

  const deleteLead = useCallback((leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setActivities((prev) => prev.filter((a) => a.leadId !== leadId))
  }, [])

  const logActivity = useCallback((activity: Omit<BdActivity, 'id'>) => {
    setActivities((prev) => [{ ...activity, id: randomUUID() }, ...prev])
    // An activity is a touchpoint, so it moves the lead's own counters too.
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activity.leadId
          ? { ...l, activityCount: l.activityCount + 1, lastContacted: activity.at.slice(0, 10) }
          : l,
      ),
    )
  }, [])

  const saveMeeting = useCallback((meeting: BdMeeting) => {
    setMeetings((prev) => {
      const exists = prev.some((m) => m.id === meeting.id)
      return exists ? prev.map((m) => (m.id === meeting.id ? meeting : m)) : [...prev, meeting]
    })
  }, [])

  const deleteMeeting = useCallback((meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
  }, [])

  const saveTask = useCallback((task: BdTask) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev]
    })
  }, [])

  const moveTask = useCallback((taskId: string, status: TaskStatus, beforeId: string | null) => {
    setTasks((prev) => {
      const moving = prev.find((t) => t.id === taskId)
      if (!moving) return prev
      const rest = prev.filter((t) => t.id !== taskId)
      const next = { ...moving, status }

      if (beforeId) {
        const idx = rest.findIndex((t) => t.id === beforeId)
        if (idx !== -1) return [...rest.slice(0, idx), next, ...rest.slice(idx)]
      }
      // No anchor means "end of this lane" — insert after the last task already
      // in that status rather than at the end of the whole list, or the card
      // would jump behind other lanes' tasks.
      const lastInLane = rest.map((t) => t.status).lastIndexOf(status)
      return lastInLane === -1
        ? [...rest, next]
        : [...rest.slice(0, lastInLane + 1), next, ...rest.slice(lastInLane + 1)]
    })
  }, [])

  const patchTask = useCallback((taskId: string, patch: Partial<BdTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))
  }, [])

  const moveTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
  }, [])

  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
            }
          : t,
      ),
    )
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  const saveProject = useCallback((project: BdProject) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id)
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev]
    })
  }, [])

  const moveProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status } : p)))
  }, [])

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId))
  }, [])

  const saveUpdate = useCallback((update: BdDailyUpdate) => {
    setUpdates((prev) => {
      const exists = prev.some((u) => u.id === update.id)
      return exists ? prev.map((u) => (u.id === update.id ? update : u)) : [update, ...prev]
    })
  }, [])

  const saveTargets = useCallback((next: BdTarget[]) => setTargets(next), [])

  const logOutreach = useCallback((entry: Omit<BdOutreachLog, 'id'>, passive: boolean) => {
    setOutreachLogs((prev) => [{ ...entry, id: randomUUID() }, ...prev])
    setChannelStats((prev) =>
      prev.map((c) =>
        c.channel === entry.channel
          ? {
              ...c,
              // Passive channels are not sent on, so their volume is inbound
              // replies rather than outbound sends.
              sent: passive ? c.sent : c.sent + entry.volume,
              responses: c.responses + (passive ? entry.volume : entry.responses),
              meetings: c.meetings + entry.meetings,
              leads: c.leads + entry.leads,
            }
          : c,
      ),
    )
  }, [])

  const value = useMemo<BdContextValue>(
    () => ({
      leads, activities, meetings, tasks, projects, updates, targets, channelStats, outreachLogs,
      viewerRepId: viewerRep.id,
      viewerName: viewerRep.name,
      canSeeAll,
      moveLeadStage, saveLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, patchTask, moveTaskStatus, moveTask, toggleChecklistItem, deleteTask,
      saveProject, moveProjectStatus, deleteProject,
      saveUpdate, saveTargets, logOutreach,
    }),
    [
      leads, activities, meetings, tasks, projects, updates, targets, channelStats, outreachLogs,
      viewerRep.id, viewerRep.name, canSeeAll,
      moveLeadStage, saveLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, patchTask, moveTaskStatus, moveTask, toggleChecklistItem, deleteTask,
      saveProject, moveProjectStatus, deleteProject,
      saveUpdate, saveTargets, logOutreach,
    ],
  )

  return <BdContext.Provider value={value}>{children}</BdContext.Provider>
}

// Same exemption AuthContext takes: a provider and its hook belong in one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useBd(): BdContextValue {
  const ctx = useContext(BdContext)
  if (!ctx) throw new Error('useBd must be used inside <BdPrototypeProvider>')
  return ctx
}
