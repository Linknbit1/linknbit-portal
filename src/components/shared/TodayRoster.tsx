import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, Palmtree, Building2, CircleSlash, Clock3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { DatePicker } from '../ui/DatePicker'
import { useDayRoster } from '../../hooks/useAttendance'
import type { RosterEntry, RosterStatus } from '../../api/attendance'

/** Local calendar date (`en-CA` renders ISO), not UTC — the roster is a local-day question. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtTime = (ts: string | null): string =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'

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
    label: 'Working from home',
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

function StatusChipInline({ status, dayPart }: { status: RosterStatus; dayPart: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border',
        'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
        meta.chip,
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
          <div key={status} className="bg-surface-1 px-4 py-3 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-text-4">
              <Icon size={12} />
              {meta.label}
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
  )
}

type GroupBy = 'status' | 'team'

function GroupSwitch({ value, onChange }: { value: GroupBy; onChange: (v: GroupBy) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border-default bg-surface-inset p-0.5">
      {(['status', 'team'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            'px-3 py-1 rounded-sm text-[12px] font-ui font-semibold capitalize transition-colors',
            value === option ? 'bg-brand-red/15 text-brand-red' : 'text-text-3 hover:text-text-1',
          )}
        >
          By {option}
        </button>
      ))}
    </div>
  )
}

interface Group {
  key: string
  label: string
  rows: RosterEntry[]
}

function groupRows(rows: RosterEntry[], by: GroupBy): Group[] {
  if (by === 'status') {
    return GROUP_ORDER.flatMap((status) => {
      const matching = rows.filter((r) => r.status === status)
      return matching.length > 0
        ? [{ key: status, label: STATUS_META[status].label, rows: matching }]
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
  const groups = [...byTeam.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, teamRows]) => ({ key: team, label: team, rows: teamRows }))
  return unassigned.length > 0
    ? [...groups, { key: '__none__', label: 'No team', rows: unassigned }]
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

  const groups = useMemo(() => groupRows(rows, groupBy), [rows, groupBy])

  // Company-wide facts are identical on every row; the first one carries them.
  const holidayName = rows.find((r) => r.holiday_name)?.holiday_name ?? null
  const companyWfh = rows.find((r) => r.company_wfh)?.company_wfh ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DatePicker value={date} onChange={setDate} className="w-37.5" />
        {date !== localToday() && (
          <button
            type="button"
            onClick={() => setDate(localToday())}
            className="font-ui text-[12px] text-brand-red hover:underline"
          >
            Back to today
          </button>
        )}
        <div className="ml-auto">
          <GroupSwitch value={groupBy} onChange={setGroupBy} />
        </div>
      </div>

      {holidayName && (
        <div className="flex items-center gap-2 px-4 py-2.5 border border-service-mkt/30 bg-service-mkt/10 text-service-mkt font-ui text-[13px]">
          <Palmtree size={14} />
          <span>
            <span className="font-semibold">{holidayName}</span>. The office is closed.
          </span>
        </div>
      )}

      {companyWfh && !holidayName && (
        <div className="flex items-center gap-2 px-4 py-2.5 border border-service-dev/30 bg-service-dev/10 text-service-dev font-ui text-[13px]">
          <Home size={14} />
          <span>
            <span className="font-semibold">Company-wide WFH</span>, {companyWfh}
          </span>
        </div>
      )}

      <SummaryTiles rows={rows} />

      <div className="border border-border-default bg-surface-1">
        {isLoading ? (
          <div className="flex justify-center py-12 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center font-ui text-[13px] text-error">
            Could not load the roster. Refresh to try again.
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center font-ui text-[13px] text-text-4">
            Nobody is tracked for this date.
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <h3 className="flex items-center gap-2 px-4 py-2 bg-surface-2 border-b border-border-subtle font-mono text-[10.5px] uppercase tracking-wider text-text-3">
                {group.label}
                <span className="text-text-4 tabular-nums">{group.rows.length}</span>
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
