import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { DatePicker } from '../components/ui/DatePicker'
import { PersonLink } from '../components/shared/PersonLink'
import { StandupTabs } from '../components/shared/StandupTabs'
import { StandupCard } from '../components/shared/StandupCard'
import { officeTime, localToday } from '../lib/standup'
import { useAuthContext } from '../context/AuthContext'
import { useStandupWindow, useStandupsByDate, useStandupRoster } from '../hooks/useStandups'

const SCOPED_ROLES = ['team_lead', 'project_manager']

export default function StandupTeamPage() {
  const { profile } = useAuthContext()
  const [date, setDate] = useState(localToday)
  const { data: standups = [], isLoading } = useStandupsByDate(date)
  const { data: roster = [] } = useStandupRoster(date)
  const { data: win } = useStandupWindow()

  const submittedIds = new Set(standups.map((s) => s.profile_id))
  const notSubmitted = roster.filter((r) => !submittedIds.has(r.profile_id) && !r.on_leave)
  const onLeave = roster.filter((r) => r.on_leave)
  // Leads and PMs read a team-scoped list; say so rather than letting it look like the whole company.
  const isScoped = SCOPED_ROLES.includes(profile?.role ?? '')

  // The window only counts people as "missing" once it has actually opened for
  // the selected day. Before that (e.g. viewing today at 3am) nobody could have
  // submitted, so they're "pending", not missing.
  const hasOpened = win
    ? (date < win.standup_date || (date === win.standup_date && new Date(win.server_now) >= new Date(win.opens_at)))
    : false
  const missing = hasOpened ? notSubmitted : []
  const pending = hasOpened ? [] : notSubmitted

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Team Standups" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[22px] text-text-1">Team Standups</h2>
          <p className="font-ui text-[13px] text-text-3">
            {isScoped
              ? "Your team's end-of-day updates — what they worked on, time spent, and blockers."
              : 'End-of-day updates across the company — what people worked on, time spent, and blockers.'}
          </p>
        </div>

        <StandupTabs />

        <div className="flex flex-wrap items-center gap-3">
          <DatePicker value={date} onChange={setDate} className="w-44" />
          <div className="flex items-center gap-2">
            <Badge variant="success">{standups.length} submitted</Badge>
            {missing.length > 0 && <Badge variant="error">{missing.length} missing</Badge>}
            {pending.length > 0 && <Badge variant="warning">{pending.length} pending</Badge>}
            {onLeave.length > 0 && <Badge variant="ghost">{onLeave.length} on leave</Badge>}
          </div>
        </div>

        {!hasOpened && win && date === win.standup_date && (
          <div className="flex items-center gap-2 bg-surface-1 border border-border-default rounded-lg px-3.5 py-2.5">
            <Clock size={14} className="text-text-3 shrink-0" />
            <span className="font-ui text-[12.5px] text-text-3">
              The standup window opens at {officeTime(win.opens_at, win.timezone)} — updates appear after that.
            </span>
          </div>
        )}

        {missing.length > 0 && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-2.5">Not submitted</p>
            <div className="flex flex-wrap gap-2">
              {missing.map((m) => (
                <span key={m.profile_id} className="inline-flex items-center gap-1.5 bg-surface-2 border border-border-default rounded-full pl-0.5 pr-2.5 py-0.5">
                  <Avatar name={m.name} src={m.avatar_url ?? undefined} size="xs" personId={m.profile_id} />
                  <PersonLink personId={m.profile_id} className="font-ui text-[12px] text-text-2">{m.name}</PersonLink>
                </span>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : standups.length === 0 ? (
          <div className="py-14 text-center font-ui text-[13px] text-text-4">No standups submitted for this day.</div>
        ) : (
          <div className="space-y-3">{standups.map((s) => <StandupCard key={s.id} standup={s} />)}</div>
        )}
      </div>
    </div>
  )
}
