import { useMemo } from 'react'
import {
  ClipboardCheck, CalendarCheck, Trophy, AtSign, Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { useMyPermissions } from './usePermissions'
import { ADMINISTRATOR } from '../api/permissions'
import { useApprovals } from './useApprovals'
import {
  useAllLeaveRequests, useAllWfhRequests, useAllAttendanceExceptions, useAllOvertimeRequests,
} from './useAttendance'
import { useClaimableQuestCount, useGamificationPendingCount } from './useGamification'
import { useNotifications } from './useNotifications'
import { useMyLatestCommentAt } from './useComments'
import { notificationHref } from '../constants/notifications'

/**
 * One thing blocking someone — either you, or somebody waiting on you.
 *
 * A `count` above 1 means the row stands for a queue rather than a single item,
 * so the link goes to that queue instead of to one record.
 */
export interface WaitingItem {
  id: string
  label: string
  detail?: string
  to: string
  icon: LucideIcon
  count: number
}

/**
 * Everything actually waiting on the signed-in user, from every module that can
 * block them.
 *
 * This is deliberately NOT "unread notifications". Most notifications are news —
 * something happened, nothing is owed. Mixing the two is what made the badge
 * badge meaningless: it counted things you had already dealt with elsewhere.
 * Here a zero is a promise that nothing is stuck on you.
 *
 * Mentions are the one notification type that counts, because being tagged is a
 * request for a reply, not an announcement — and they stop counting once that
 * reply exists, whether or not the notification was ever opened.
 *
 * Every query is capability-gated so an employee never fires a manager's queue.
 */
export function useWaitingOnYou(): { items: WaitingItem[]; total: number } {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const enabled = !!profile

  const can = (key: string) =>
    !!permissions && (permissions.includes(ADMINISTRATOR) || permissions.includes(key))

  const canManageAttendance = can('can_manage_attendance')
  const canReviewGamification =
    can('can_govern_gamification') || can('can_recognize') || can('can_fulfill_payouts')

  const { data: approvals = [] } = useApprovals({ status: 'pending' })
  const { data: leave = [] } = useAllLeaveRequests('pending', canManageAttendance)
  const { data: wfh = [] } = useAllWfhRequests('pending', canManageAttendance)
  const { data: exceptions = [] } = useAllAttendanceExceptions({ status: 'pending' }, canManageAttendance)
  const { data: overtime = [] } = useAllOvertimeRequests('pending', canManageAttendance)
  const { data: gamificationPending = 0 } = useGamificationPendingCount(enabled && canReviewGamification)
  const { data: claimableQuests = 0 } = useClaimableQuestCount(enabled)
  const { data: notifications = [] } = useNotifications(profile?.id ?? '')

  const unreadMentions = useMemo(
    () => notifications.filter((n) => !n.read && n.type === 'mention'),
    [notifications],
  )

  // A comment mention is recorded against the task the comment belongs to (see
  // fn_notify_mention), so one lookup per task answers every mention on it.
  const mentionTaskIds = useMemo(() => {
    const ids = new Set<string>()
    for (const n of unreadMentions) {
      if (n.resource_type === 'task' && n.resource_id) ids.add(n.resource_id)
    }
    return [...ids]
  }, [unreadMentions])

  const { data: repliedAt = {} } = useMyLatestCommentAt(profile?.id ?? '', mentionTaskIds)

  return useMemo(() => {
    const items: WaitingItem[] = []

    // Approvals are listed one by one: each names a different project, and
    // "4 approvals" tells you nothing about which door to open.
    for (const approval of approvals) {
      items.push({
        id: `approval:${approval.id}`,
        label: `Approve ${approval.type.replace(/_/g, ' ')}`,
        detail: approval.project?.name ?? undefined,
        to: approval.project ? `/projects/${approval.project.id}` : '/projects',
        icon: ClipboardCheck,
        count: 1,
      })
    }

    const attendanceTotal = leave.length + wfh.length + exceptions.length + overtime.length
    if (attendanceTotal > 0) {
      items.push({
        id: 'attendance',
        label: `${attendanceTotal} attendance ${attendanceTotal === 1 ? 'request' : 'requests'} to review`,
        detail: 'Leave, WFH, exceptions and overtime',
        to: '/attendance/requests',
        icon: CalendarCheck,
        count: attendanceTotal,
      })
    }

    if (gamificationPending > 0) {
      items.push({
        id: 'gamification',
        label: `${gamificationPending} recognition ${gamificationPending === 1 ? 'item' : 'items'} to review`,
        detail: 'Quest proofs, shoutouts and redemptions',
        to: '/gamification/approvals',
        icon: Trophy,
        count: gamificationPending,
      })
    }

    // Unread mentions, individually — each is a specific person waiting on a reply.
    // One with no resolvable destination is dropped rather than listed as a dead
    // row: an item you cannot open is not something you can act on.
    for (const n of unreadMentions) {
      const href = notificationHref(n.resource_type, n.resource_id, n.type)
      if (!href) continue
      // Answered: they commented on that thread after being tagged. Marking the
      // notification read is not the signal — people reply from the task itself
      // and never open the list, which left the row stuck there for good.
      const replied = n.resource_id ? repliedAt[n.resource_id] : undefined
      if (replied && new Date(replied).getTime() > new Date(n.created_at).getTime()) continue
      items.push({
        id: `mention:${n.id}`,
        label: n.title,
        detail: n.body ?? undefined,
        to: href,
        icon: AtSign,
        count: 1,
      })
    }

    // Last: an unclaimed quest is an opportunity, not an obligation, so it never
    // sits above something a colleague is actually blocked on.
    if (claimableQuests > 0) {
      items.push({
        id: 'quests',
        label: `${claimableQuests} ${claimableQuests === 1 ? 'quest' : 'quests'} you can claim`,
        to: '/gamification/board',
        icon: Target,
        count: claimableQuests,
      })
    }

    return { items, total: items.reduce((sum, item) => sum + item.count, 0) }
  }, [approvals, leave, wfh, exceptions, overtime, gamificationPending, claimableQuests, unreadMentions, repliedAt])
}
