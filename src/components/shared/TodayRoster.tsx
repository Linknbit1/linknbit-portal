import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, Palmtree, Building2, CircleSlash, Clock3, UserCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { STICKY_UNDER_TOPBAR } from '../../lib/stickyHeader'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { DatePicker } from '../ui/DatePicker'
import { Tabs } from '../ui/Tabs'
import { useDayRoster } from '../../hooks/useAttendance'
import { useTeams } from '../../hooks/useTeams'
import { useAuthContext } from '../../context/AuthContext'
import type { RosterEntry, RosterStatus } from '../../api/attendance'

/** Local calendar date (`en-CA` renders ISO), not UTC — the roster is a local-day question. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtTime = (ts: string | null): string =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'


/** Avatar (w-7) plus its gap — indents the phone's second line under the name. */
const NAME_INDENT = 'pl-9.5'

interface StatusMeta {
  label: string
  icon: LucideIcon
  /** Chip styling — border, tint and text in one place per status. */
  chip: string
  /** Counter accent, used for the tile's number. */
  accent: string
}

/**
 * Presence vocabulary, in the order the summary tiles read. Leave and WFH borrow
 * the service accents the rest of the attendance module already uses for them,
 * so a chip means the same thing here as it does on the team panel.
 */
const STATUS_META: Record<RosterStatus, StatusMeta> = {
  in_office: {
    label: 'In office',
    icon: Building2,
    chip: 'bg-success/12 text-success border-success/30',
    accent: 'text-success',
  },
  wfh: {
    label: 'Work from Home',
    icon: Home,
    chip: 'bg-service-dev/12 text-service-dev border-service-dev/30',
    accent: 'text-service-dev',
  },
  leave: {
    label: 'On leave',
    icon: Plane,
    chip: 'bg-service-design/12 text-service-design border-service-design/30',
    accent: 'text-service-design',
  },
  holiday: {
    label: 'Holiday',
    icon: Palmtree,
    chip: 'bg-service-mkt/12 text-service-mkt border-service-mkt/30',
    accent: 'text-service-mkt',
  },
  off: {
    label: 'Non-working day',
    icon: CircleSlash,
    chip: 'bg-surface-2 text-text-3 border-border-default',
    accent: 'text-text-3',
  },
  not_checked_in: {
    label: 'Not checked in',
    icon: Clock3,
    chip: 'bg-error/10 text-error border-error/30',
    accent: 'text-error',
  },
}

/** Which statuses get a summary tile, and in what order. */
const TILE_ORDER: RosterStatus[] = ['in_office', 'wfh', 'leave', 'not_checked_in']

/** Order people are listed in when grouping by status. */
const GROUP_ORDER: RosterStatus[] = [
  'not_checked_in',
  'in_office',
  'wfh',
  'leave',
  'holiday',
  'off',
]

function StatusChipInline({ status, dayPart, className }: { status: RosterStatus; dayPart: string; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border',
        'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
        meta.chip,
        className,
      )}
    >
      <Icon size={11} />
      {meta.label}
      {dayPart !== 'full' && (
        <span className="font-normal normal-case tracking-normal opacity-80">
          · {dayPart === 'first_half' ? 'first half' : 'second half'}
        </span>
      )}
    </span>
  )
}

function SummaryTiles({ rows }: { rows: RosterEntry[] }) {
  const counts = useMemo(() => {
    const tally = {} as Record<RosterStatus, number>
    for (const row of rows) tally[row.status] = (tally[row.status] ?? 0) + 1
    return tally
  }, [rows])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-default border border-border-default">
      {TILE_ORDER.map((status) => {
        const meta = STATUS_META[status]
        const Icon = meta.icon
        return (
          <div key={status} className="bg-surface-1 p-3 sm:px-4 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-text-4">
              <Icon size={12} className="shrink-0" />
              <span className="truncate">{meta.label}</span>
            </span>
            <span className={cn('font-mono text-2xl font-semibold tabular-nums', meta.accent)}>
              {counts[status] ?? 0}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PersonRow({ row }: { row: RosterEntry }) {
  return (
    // A phone gets two lines — who, then how — because a name, three times and a
    // status chip on one wrapped line leaves every cell too narrow to read. From
    // `sm` up it is one row again, and no horizontal padding below `sm` because
    // the list is not in a card there.
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-border-subtle last:border-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5 sm:px-4">
      <div className="flex items-center gap-2.5 min-w-0 sm:flex-1">
        <Avatar name={row.name} src={row.avatar_url ?? undefined} size="sm" personId={row.profile_id} />
        <div className="min-w-0">
          <PersonLink
            personId={row.profile_id}
            className="block font-ui font-medium text-[13px] text-text-1 truncate"
          >
            {row.name}
          </PersonLink>
          {row.job_title && (
            <span className="block font-ui text-[11px] text-text-4 truncate">{row.job_title}</span>
          )}
        </div>
      </div>

      {/* `sm:contents` dissolves this wrapper at the desktop breakpoint so the
          times and the chip become cells of the row itself. On a phone it stays
          a real box, which is what keeps the second line indented under the
          name as one unit instead of indenting each fragment separately. */}
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', NAME_INDENT, 'sm:contents')}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-text-3 tabular-nums">
          {/* Times are only returned for people the viewer is entitled to see them
              for, so an absent time is "not yours to see", never "missing data". */}
          {row.detail_visible && row.status === 'in_office' && (
            <span>
              In <span className="text-text-1">{fmtTime(row.check_in)}</span>
            </span>
          )}
          {row.detail_visible && row.check_out && <span>Out {fmtTime(row.check_out)}</span>}
          {row.detail_visible && row.leave_type && (
            <span className="font-ui normal-case text-text-3">{row.leave_type}</span>
          )}
          {row.is_late && (
            <span className="px-1.5 py-0.5 rounded-sm border border-warning/30 bg-warning/12 text-warning text-[10px] font-ui font-semibold uppercase tracking-wider">
              Late
            </span>
          )}
        </div>

        <StatusChipInline status={row.status} dayPart={row.day_part} />
      </div>
    </div>
  )
}

type GroupBy = 'status' | 'team'

const GROUP_TABS = [
  { key: 'status', label: 'By status' },
  { key: 'team', label: 'By team' },
]

const isGroupBy = (key: string): key is GroupBy => key === 'status' || key === 'team'

interface Group {
  key: string
  label: string
  rows: RosterEntry[]
  /** A team this viewer leads — sorted to the top and marked as theirs. */
  mine: boolean
}

function groupRows(rows: RosterEntry[], by: GroupBy, myTeams: ReadonlySet<string>): Group[] {
  if (by === 'status') {
    return GROUP_ORDER.flatMap((status) => {
      const matching = rows.filter((r) => r.status === status)
      return matching.length > 0
        ? [{ key: status, label: STATUS_META[status].label, rows: matching, mine: false }]
        : []
    })
  }

  // Someone on several teams appears under each — a lead scanning "Design"
  // wants everyone in Design, not everyone whose first team happens to be it.
  const byTeam = new Map<string, RosterEntry[]>()
  const unassigned: RosterEntry[] = []
  for (const row of rows) {
    if (row.team_names.length === 0) {
      unassigned.push(row)
      continue
    }
    for (const team of row.team_names) {
      const bucket = byTeam.get(team)
      if (bucket) bucket.push(row)
      else byTeam.set(team, [row])
    }
  }
  // A lead's own team goes first. Alphabetical is the right order for teams you
  // have no stake in, but it is the wrong first thing to read for someone who
  // opens this page to check on the people they are answerable for.
  const groups = [...byTeam.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, teamRows]) => ({ key: team, label: team, rows: teamRows, mine: myTeams.has(team) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine))
  return unassigned.length > 0
    ? [...groups, { key: '__none__', label: 'No team', rows: unassigned, mine: false }]
    : groups
}

/**
 * Today — the whole company's presence on one date. Replaces the four separate
 * request queues as the answer to "who is working, and how" by reading the
 * `day_roster` RPC, which resolves attendance, leave, WFH, holidays and the
 * weekend rule server-side.
 */
export function TodayRoster() {
  const [date, setDate] = useState(localToday)
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const { data: rows = [], isLoading, isError } = useDayRoster(date)

  // Leading a team is a fact on the record, not a permission: whoever `lead_id`
  // points at leads it, whatever their role is called. Matched by name because
  // the roster reports team names, and they come from this same table.
  const { profile } = useAuthContext()
  const { data: teams = [] } = useTeams()
  const myTeams = useMemo(
    () => new Set(teams.filter((t) => t.lead_id === profile?.id).map((t) => t.name)),
    [teams, profile?.id],
  )

  const groups = useMemo(() => groupRows(rows, groupBy, myTeams), [rows, groupBy, myTeams])

  // Company-wide facts are identical on every row; the first one carries them.
  const holidayName = rows.find((r) => r.holiday_name)?.holiday_name ?? null
  const companyWfh = rows.find((r) => r.company_wfh)?.company_wfh ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* The date and the grouping share one line at every width — they are the
          two things that say what the list below is. Getting back to today is
          the date box's own Today button, not a second control out here. */}
      <div className="flex items-center gap-2 sm:gap-3">
        <DatePicker value={date} onChange={setDate} className="min-w-0 flex-1 sm:w-44 sm:flex-none" />
        <Tabs
          variant="pill"
          size="sm"
          tabs={GROUP_TABS}
          activeKey={groupBy}
          onChange={(key) => { if (isGroupBy(key)) setGroupBy(key) }}
          // h-9 + items-stretch: the same 36px control height the date box and
          // every Select use, with the buttons filling the track so the sliding
          // backing is inset by the track's padding rather than floating in it.
          className="h-9 shrink-0 items-stretch sm:ml-auto"
        />
      </div>

      {holidayName && (
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 border border-service-mkt/30 bg-service-mkt/10 text-service-mkt font-ui text-[13px]">
          <Palmtree size={14} className="shrink-0" />
          <span>
            <span className="font-semibold">{holidayName}</span>. The office is closed.
          </span>
        </div>
      )}

      {companyWfh && !holidayName && (
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 border border-service-dev/30 bg-service-dev/10 text-service-dev font-ui text-[13px]">
          <Home size={14} className="shrink-0" />
          <span>
            <span className="font-semibold">Company-wide WFH</span>, {companyWfh}
          </span>
        </div>
      )}

      <SummaryTiles rows={rows} />

      {/* No card on a phone: a border inside a 360px screen spends width on
          chrome and boxes the list in twice. The dividers still make it a list. */}
      <div className="sm:border sm:border-border-default sm:bg-surface-1">
        {isLoading ? (
          <div className="flex justify-center py-12 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center font-ui text-[13px] text-error sm:px-4">
            Could not load the roster. Refresh to try again.
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center font-ui text-[13px] text-text-4 sm:px-4">
            Nobody is tracked for this date.
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              {/* Pinned: a roster is scrolled past its own headings, and "which
                  group am I looking at" is the one thing you cannot recover from
                  the rows. Full-bleed on a phone so it covers the rows sliding
                  under it edge to edge. */}
              <h3
                className={cn(
                  'sticky z-20 flex items-center gap-2 -mx-4 px-4 py-2 border-y',
                  'font-mono text-[10.5px] uppercase tracking-wider',
                  'sm:mx-0 sm:border-t-0',
                  group.mine
                    ? 'bg-brand-red/12 border-brand-red/25 text-brand-red'
                    : 'bg-surface-2 border-border-subtle text-text-3',
                  STICKY_UNDER_TOPBAR,
                )}
              >
                {group.label}
                <span className={cn('tabular-nums', group.mine ? 'text-brand-red/60' : 'text-text-4')}>
                  {group.rows.length}
                </span>
                {group.mine && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-brand-red/30 bg-brand-red/10 px-1.5 py-0.5 font-semibold">
                    <UserCheck size={11} />
                    Your team
                  </span>
                )}
              </h3>
              {group.rows.map((row) => (
                <PersonRow key={`${group.key}:${row.profile_id}`} row={row} />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
