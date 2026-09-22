import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { CalendarRange, UserRound } from 'lucide-react'
import { MobileHub, type HubRowItem } from '../components/layout/MobileHub'
import { StackScreen } from '../components/layout/StackScreen'
import { Topbar } from '../components/layout/Topbar'
import { ScheduleGrid } from '../components/shared/ScheduleGrid'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useCanAccess } from '../hooks/useRoleFlags'
import { useAuthContext } from '../context/AuthContext'

interface SectionEntry {
  title: string
  render: () => ReactNode
}

/**
 * Who may book somebody's time.
 *
 * The same capability the allocation table's write policy tests, so the Book
 * affordance appears exactly where it will work. A button that errors is worse
 * than no button.
 */
function usePlanningRights(): boolean {
  return useCanAccess('can_manage_projects')
}

/** Everybody's week, for whoever can see more than their own. */
function TeamWeek() {
  const canPlan = usePlanningRights()
  return <ScheduleGrid canPlan={canPlan} />
}

/**
 * One person's own week.
 *
 * Read-only for them. Seeing your week is not the same as being able to rewrite
 * it, and capacity_roster already lets anybody see their own row.
 */
function MyWeek() {
  const { profile } = useAuthContext()
  if (!profile) return null
  return <ScheduleGrid canPlan={false} lockedProfileId={profile.id} />
}

const SECTIONS: Record<string, SectionEntry> = {
  week: { title: 'Week', render: () => <TeamWeek /> },
  me: { title: 'My week', render: () => <MyWeek /> },
}

/** Mobile landing for /schedule: the rows, and nothing else. */
export function ScheduleHub() {
  const items: HubRowItem[] = [
    { to: '/schedule/week', label: 'Week', icon: CalendarRange, description: 'Who is free, and what is booked' },
    { to: '/schedule/me', label: 'My week', icon: UserRound, description: 'What is planned for you' },
  ]
  return <MobileHub title="Schedule" items={items} />
}

/**
 * /schedule — a hub on a phone, the week itself on a computer.
 *
 * Same split as Attendance: the root is a role-aware landing rather than a page,
 * and each section is its own full page on desktop, reached from the sidebar
 * rather than by switching an in-page tab.
 */
export default function SchedulePage() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <Navigate to="/schedule/week" replace />
  return <ScheduleHub />
}

/** /schedule/:section — a stack screen on a phone, a full page on a computer. */
export function ScheduleSectionScreen() {
  const isDesktop = useIsDesktop()
  const { section } = useParams()
  const entry = section ? SECTIONS[section] : undefined

  if (!entry) return <Navigate to="/schedule" replace />

  if (isDesktop) {
    return (
      // No heading under the Topbar — it carries the section's name already.
      <div className="flex flex-col flex-1">
        <Topbar title={entry.title} />
        <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
          {entry.render()}
        </div>
      </div>
    )
  }

  // Back to the hub, never into history: this screen is also reached from a
  // notification or a pinned link, where history back is a dead end.
  return <StackScreen title={entry.title} back="/schedule">{entry.render()}</StackScreen>
}
