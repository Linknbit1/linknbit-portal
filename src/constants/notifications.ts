// The catalogue of notification types. `type` matches notifications.type in the
// DB (set by the triggers, or derived from resource_type by fn_notifications_gate).
//
// `roles` limits which people can ever RECEIVE a type, so the settings screen
// only offers toggles that can actually fire for you — an employee never sees
// "Device approval requests". Undefined = everyone.
//
// Preferences are opt-out: no row in notification_preferences means enabled.

export interface NotificationTypeMeta {
  type: string
  label: string
  description: string
  roles?: readonly string[]
}

const GOVERNORS: readonly string[] = ['super_admin', 'admin', 'hr']
const ADMINS: readonly string[] = ['super_admin', 'admin']
/** Anyone who can be on the receiving end of a team member's request. */
const APPROVERS: readonly string[] = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead']

export interface NotificationGroup {
  key: string
  label: string
  items: NotificationTypeMeta[]
}

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    key: 'my_requests',
    label: 'My requests',
    items: [
      { type: 'request_leave_reviewed',     label: 'Leave decisions',     description: 'When your leave is approved or declined' },
      { type: 'request_wfh_reviewed',       label: 'WFH decisions',       description: 'When your WFH is approved, declined, or granted by HR' },
      { type: 'request_exception_reviewed', label: 'Exception decisions', description: 'When your attendance exception is reviewed' },
      { type: 'request_overtime_reviewed',  label: 'Overtime decisions',  description: 'When your logged overtime is reviewed' },
    ],
  },
  {
    key: 'schedule',
    label: 'Schedule',
    items: [
      { type: 'schedule_holiday',           label: 'Holidays',          description: 'When a holiday is added to the calendar' },
      { type: 'schedule_wfh_day',           label: 'Company WFH days',  description: 'When the whole company is asked to work from home' },
      { type: 'schedule_working_saturday',  label: 'Working Saturdays', description: 'When a Saturday is marked as a working day' },
    ],
  },
  {
    key: 'recognition',
    label: 'Recognition & rewards',
    items: [
      { type: 'gamification_shoutout', label: 'Shoutouts',   description: 'When someone gives you a shoutout' },
      { type: 'gamification_badge',    label: 'Badges',      description: 'When you earn a badge' },
      { type: 'gamification_quest',    label: 'Quests',      description: 'When your quest claim is approved or sent back' },
      { type: 'gamification_reward',   label: 'Rewards',     description: 'Redemption and group reward updates' },
      { type: 'gamification_eotm',           label: 'Employee of the Month',   description: 'When you are named Employee of the Month' },
      { type: 'gamification_eotm_announced', label: 'Employee of the Month — announcements', description: 'When someone else is named Employee of the Month' },
    ],
  },
  {
    key: 'work',
    label: 'Projects & tasks',
    items: [
      { type: 'task_assigned',          label: 'Assigned to you',   description: 'When someone puts you on a task, or takes you off one' },
      { type: 'task_activity',          label: 'Task updates',      description: 'Status, priority and due-date changes on tasks you follow' },
      { type: 'mention',                label: 'Mentions',          description: 'When someone @mentions you in a task, comment or project doc' },
      { type: 'project_task_added',     label: 'New tasks',         description: 'When a task is added to a project you watch' },
      { type: 'project_comment_added',  label: 'New comments',      description: 'When someone comments in a project you watch' },
    ],
  },
  {
    key: 'meetings',
    label: 'Meetings',
    // Ungated: anyone can be pulled into a client call, BD access or not — which
    // is the whole reason these notifications exist.
    items: [
      { type: 'meeting_invite',  label: 'Meeting invitations', description: 'When somebody adds you to a client meeting' },
      { type: 'meeting_updated', label: 'Changes and cancellations', description: 'When a meeting you are on is moved or called off' },
    ],
  },
  {
    key: 'chat',
    label: 'Chat',
    items: [
      { type: 'chat_message', label: 'New messages', description: 'When someone messages you or posts in a channel you are in' },
      { type: 'chat_mention', label: 'Mentions',     description: 'When someone @mentions you in chat — reaches you even in a muted conversation' },
      { type: 'chat_added',   label: 'Added to a channel', description: 'When someone adds you to a channel or group chat' },
    ],
  },
  {
    key: 'to_review',
    label: 'Waiting on me',
    items: [
      { type: 'request_leave_submitted',     label: 'Leave requests',     description: 'When your team submits leave',              roles: APPROVERS },
      { type: 'request_wfh_submitted',       label: 'WFH requests',       description: 'When your team requests WFH',               roles: APPROVERS },
      { type: 'request_exception_submitted', label: 'Exception requests', description: 'When your team requests an exception',      roles: APPROVERS },
      { type: 'request_overtime_submitted',  label: 'Overtime requests',  description: 'When your team logs overtime',              roles: APPROVERS },
      { type: 'quest_claimed',               label: 'Quest claimed',      description: 'When someone claims a quest',               roles: GOVERNORS },
      { type: 'quest_submitted',             label: 'Quest submissions',  description: 'When someone submits quest proof for review', roles: APPROVERS },
      { type: 'shoutout_pending',            label: 'Shoutouts to review', description: 'When a colleague gives someone a shoutout', roles: GOVERNORS },
      { type: 'redemption_pending',          label: 'Reward redemptions', description: 'When someone redeems a reward or a group fills', roles: GOVERNORS },
      { type: 'device_approval',             label: 'Device approvals',   description: 'When someone registers a device',           roles: ADMINS },
    ],
  },
]

export interface NotificationCategory {
  key: string
  label: string
}

/**
 * Notification categories. The settings taxonomy above is the source of truth — a
 * notification lands in the same bucket the toggle that controls it lives in,
 * so the two screens can never disagree about what "Chat" means.
 *
 * Two buckets exist only here: `security`, because audit alerts deliberately
 * have no preference toggle (an admin should not be able to mute the alarm on
 * flagged actions), and `other`, so a type added by a future trigger still
 * shows up somewhere instead of vanishing from a filtered view.
 */
export const INBOX_CATEGORIES: NotificationCategory[] = [
  ...NOTIFICATION_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  { key: 'security', label: 'Security & audit' },
  { key: 'other', label: 'Other' },
]

const CATEGORY_BY_TYPE: ReadonlyMap<string, NotificationCategory> = new Map(
  NOTIFICATION_GROUPS.flatMap((g) => g.items.map((i) => [i.type, { key: g.key, label: g.label }] as const)),
)

/** Which notification category a notification belongs to. Never returns undefined. */
export function categoryForType(type: string | null | undefined): NotificationCategory {
  if (type === 'audit_alert') return { key: 'security', label: 'Security & audit' }
  return (type && CATEGORY_BY_TYPE.get(type)) || { key: 'other', label: 'Other' }
}

/** Groups (and items) this role can actually receive — drives the settings screen. */
export function notificationGroupsFor(role: string | null | undefined): NotificationGroup[] {
  return NOTIFICATION_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (!!role && i.roles.includes(role))) }))
    .filter((g) => g.items.length > 0)
}

export const PROJECT_TASK_QUERY_PARAM = 'task'
export const TASK_PROJECT_REDIRECT_QUERY_PARAM = 'openInProject'

export function projectTaskDrawerHref(projectId: string, taskId: string): string {
  return `/admin/projects/${projectId}?${PROJECT_TASK_QUERY_PARAM}=${encodeURIComponent(taskId)}`
}

function taskNotificationHref(taskId: string): string {
  return `/admin/tasks/${taskId}?${TASK_PROJECT_REDIRECT_QUERY_PARAM}=1`
}

/**
 * Notification types that are a reviewer being told a queue filled up. They all
 * land on the Approvals screen, whatever resource they point at — the resource
 * type alone cannot tell "your quest was approved" from "a quest needs review".
 */
const GAMIFICATION_REVIEW_TYPES: readonly string[] = [
  'quest_claimed', 'quest_submitted', 'shoutout_pending', 'redemption_pending',
]

/** Where a notification should take you when clicked. */
export function notificationHref(
  resourceType: string | null,
  resourceId?: string | null,
  type?: string | null,
): string | null {
  if (type && GAMIFICATION_REVIEW_TYPES.includes(type)) return '/gamification/approvals'
  switch (resourceType) {
    case 'task':
      return resourceId ? taskNotificationHref(resourceId) : '/notifications'
    case 'project':
      return resourceId ? `/admin/projects/${resourceId}` : '/notifications'
    case 'leave_request':
    case 'wfh_request':
    case 'attendance_exception':
    case 'overtime_request':
    case 'holiday':
    case 'company_wfh_day':
    case 'working_saturday':
      return '/attendance'
    // /gamification only redirects to the leaderboard, so each resource names
    // the sub-page that actually shows it.
    case 'quest_task':
      return '/gamification/board'
    case 'shoutout':
      return '/gamification/shoutouts'
    case 'badge':
      return '/gamification/badges'
    case 'redemption':
    case 'reward_pool':
      return '/gamification/rewards'
    case 'employee_of_the_month':
      return '/gamification/leaderboard'
    case 'channel':
      // resource_id is the conversation, so a chat notification opens the thread.
      return resourceId ? `/chat/${resourceId}` : '/chat'
    case 'enrolled_device':
      return '/settings/devices'
    // Business Development. These land on the module's own screens rather than
    // the delivery ones — a bd_task is not a task, and sending someone to
    // /admin/tasks/<id> would 404.
    case 'bd_task':
      return '/bd/tasks'
    case 'bd_lead':
      return '/bd/pipeline'
    case 'bd_project':
      return resourceId ? `/bd/projects/${resourceId}` : '/bd/projects'
    case 'bd_comment':
      return '/bd/pipeline'
    case 'bd_meeting':
      // Deliberately the personal schedule, not /bd/meetings: most people
      // notified about a meeting are invitees who hold no can_view_bd and would
      // be bounced straight back out of the BD module.
      return '/my-meetings'
    default:
      return null
  }
}
