import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { randomUUID } from '../lib/uuid'
import { useMyPermissions } from '../hooks/usePermissions'
import { ADMINISTRATOR } from '../api/permissions'
import { useAuthContext } from '../context/AuthContext'
import {
  LEADS, BD_ACTIVITIES, BD_MEETINGS, BD_TASKS, BD_DAILY_UPDATES, BD_TARGETS, BD_REPS,
} from '../data/bdMock'
import type {
  Lead, LeadStage, BdActivity, BdMeeting, BdTask, BdTaskStatus, BdDailyUpdate, BdTarget,
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
  updates: BdDailyUpdate[]
  targets: BdTarget[]

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
  moveTaskStatus: (taskId: string, status: BdTaskStatus) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  deleteTask: (taskId: string) => void
  saveUpdate: (update: BdDailyUpdate) => void
  saveTargets: (targets: BdTarget[]) => void
}

const BdContext = createContext<BdContextValue | null>(null)

export function BdPrototypeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()

  const [leads, setLeads] = useState<Lead[]>(LEADS)
  const [activities, setActivities] = useState<BdActivity[]>(BD_ACTIVITIES)
  const [meetings, setMeetings] = useState<BdMeeting[]>(BD_MEETINGS)
  const [tasks, setTasks] = useState<BdTask[]>(BD_TASKS)
  const [updates, setUpdates] = useState<BdDailyUpdate[]>(BD_DAILY_UPDATES)
  const [targets, setTargets] = useState<BdTarget[]>(BD_TARGETS)

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

  const moveTaskStatus = useCallback((taskId: string, status: BdTaskStatus) => {
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

  const saveUpdate = useCallback((update: BdDailyUpdate) => {
    setUpdates((prev) => {
      const exists = prev.some((u) => u.id === update.id)
      return exists ? prev.map((u) => (u.id === update.id ? update : u)) : [update, ...prev]
    })
  }, [])

  const saveTargets = useCallback((next: BdTarget[]) => setTargets(next), [])

  const value = useMemo<BdContextValue>(
    () => ({
      leads, activities, meetings, tasks, updates, targets,
      viewerRepId: viewerRep.id,
      viewerName: viewerRep.name,
      canSeeAll,
      moveLeadStage, saveLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, moveTaskStatus, toggleChecklistItem, deleteTask,
      saveUpdate, saveTargets,
    }),
    [
      leads, activities, meetings, tasks, updates, targets,
      viewerRep.id, viewerRep.name, canSeeAll,
      moveLeadStage, saveLead, deleteLead, logActivity,
      saveMeeting, deleteMeeting,
      saveTask, moveTaskStatus, toggleChecklistItem, deleteTask,
      saveUpdate, saveTargets,
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
