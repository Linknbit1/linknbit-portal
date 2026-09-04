import { useMemo, useState } from 'react'
import {
  Loader2, Search, Download, Plus, Pencil, AlertCircle, Wifi, SlidersHorizontal,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, Monitor, Plane, ArrowUp, ArrowUpDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Tabs } from '../ui/Tabs'
import { Toggle } from '../ui/Toggle'
import { Drawer } from '../ui/Drawer'
import { DatePicker } from '../ui/DatePicker'
import { TimePicker } from '../ui/TimePicker'
import { PeriodStepper } from '../ui/PeriodStepper'
import { SlideSwitch } from '../ui/SlideSwitch'
import { FilterField } from '../ui/FilterField'
import { useToast } from '../ui/toast-context'
import { PersonLink } from './PersonLink'
import { AttendanceChips } from './AttendanceChips'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useDateRangeFilter, type RangeMode } from '../../hooks/useDateRangeFilter'
import {
  useAttendanceRange, useMarkAttendance, useUpdateAttendanceRecord, useAttendanceSettings,
} from '../../hooks/useAttendance'
import { useActiveProfiles } from '../../hooks/useAuth'
import { useTeams } from '../../hooks/useTeams'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { zonedWallTimeToIso, isoToZonedMinutes } from '../../lib/timezone'
import { downloadCsv } from '../../lib/csv'
import type { AttendanceWithProfile } from '../../api/attendance'

/* ── Vocabulary ───────────────────────────────────────────────────────────── */

interface RecordFacts {
  status: string | null
  day_type: string
  day_part: string
}

/**
 * The slices of a day worth filtering and counting by.
 *
 * Attendance is two independent facts — what kind of day it was, and whether the
 * person turned up — so these are not one enum. "Half Day" is a leave whose
 * day_part is not full; "Leave" is a whole one. Keeping the predicates here, once,
 * is what stops the tiles and the filter from disagreeing about what a half day is.
 */
const RECORD_FILTERS: {
  value: string
  label: string
  icon: LucideIcon
  /** Tile accent; the filter list ignores it. */
  color: string
  bg: string
  match: (r: RecordFacts) => boolean
}[] = [
  { value: 'present', label: 'Present', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20', match: (r) => r.status === 'present' },
  { value: 'late', label: 'Late', icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', match: (r) => r.status === 'late' },
  { value: 'absent', label: 'Absent', icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10 border-error/20', match: (r) => r.status === 'absent' },
  { value: 'half_day', label: 'Half Day', icon: Monitor, color: 'text-service-design', bg: 'bg-service-design/10 border-service-design/20', match: (r) => r.day_type === 'leave' && r.day_part !== 'full' },
  { value: 'leave', label: 'Leave', icon: Plane, color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20', match: (r) => r.day_type === 'leave' && r.day_part === 'full' },
  { value: 'wfh', label: 'WFH', icon: ClipboardList, color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20', match: (r) => r.day_type === 'wfh' },
  { value: 'holiday', label: 'Holiday', icon: Plane, color: 'text-text-3', bg: 'bg-text-3/10 border-border-default', match: (r) => r.day_type === 'holiday' },
]

/** Which of those get a counter tile, and in what order. */
const TILE_ORDER = ['present', 'late', 'absent', 'half_day', 'leave']

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
  { value: 'wfh', label: 'WFH' },
  { value: 'holiday', label: 'Holiday' },
]

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Any source' },
  { value: 'self', label: 'Self check-in' },
  { value: 'biometric', label: 'Biometric terminal' },
  { value: 'admin', label: 'Entered by an admin' },
]

const RANGE_TABS: { key: RangeMode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
]

const isRangeMode = (v: string): v is RangeMode =>
  RANGE_TABS.some((t) => t.key === v)

/* ── Counting ─────────────────────────────────────────────────────────────── */

/**
 * A worked half day is half an attendance and half a leave, so it counts 0.5 to
 * each rather than a whole day to both — counting it whole in both inflates every
 * total. A partial WFH splits the same way: half remote, half in the office.
 */
function weightOf(r: RecordFacts): number {
  const partial = (r.day_type === 'leave' || r.day_type === 'wfh') && r.day_part !== 'full'
  return partial ? 0.5 : 1
}

interface Tally {
  present: number
  late: number
  absent: number
  half_day: number
  leave: number
  wfh: number
}

const emptyTally = (): Tally => ({ present: 0, late: 0, absent: 0, half_day: 0, leave: 0, wfh: 0 })

function addTo(t: Tally, r: RecordFacts): void {
  const isLeave = r.day_type === 'leave'
  const partial = (isLeave || r.day_type === 'wfh') && r.day_part !== 'full'
  if (isLeave && partial) t.half_day += 0.5
  else if (isLeave) t.leave += 1
  if (r.day_type === 'wfh') t.wfh += partial ? 0.5 : 1

  const w = weightOf(r)
  if (r.status === 'present') t.present += w
  else if (r.status === 'late') t.late += w
  else if (r.status === 'absent') t.absent += w
}

/** Drops a trailing .0 so whole days read "18" and halves read "18.5". */
const fmtDays = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'

function durationLabel(rec: AttendanceWithProfile): string {
  if (!rec.check_in || !rec.check_out) return '-'
  const mins = Math.floor((new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

/** The day cell on a multi-day span: "Mon 14 Sep". One date needs no column. */
const shortDay = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/* ── Mark / edit a record ─────────────────────────────────────────────────── */

// Current wall-clock time (HH:MM, 24h) in the given office timezone.
function officeNowHHMM(timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date())
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const minutesToHHMM = (mins: number) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
const hhmmToMinutes = (hhmm: string): number | null => {
  const [h, m] = hhmm.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

// Statuses that carry a clocked check-in time. A half day is not in here because
// it is not a status at all — it is day_type=leave with a partial day_part, and
// whether times apply depends purely on whether an arrival is being recorded.
const CLOCKED_STATUSES = new Set(['present', 'late'])

interface MarkSheetProps {
  onClose: () => void
  /** The date the screen is showing, so a new record defaults to it. */
  defaultDate: string
  /** When provided, edits this record instead of creating one. */
  editRecord?: AttendanceWithProfile | null
}

/**
 * Record a day for somebody, or correct one already recorded.
 *
 * A panel rather than a centred box, matching every other form in attendance:
 * on the right on a computer, up from the bottom on a phone.
 *
 * The status follows the check-in time on its own — an arrival after the
 * person's cutoff is late — until an admin picks one explicitly, at which point
 * the override wins. That is what fixes "marked at 08:30 and not flagged late"
 * without an effect that re-renders on every keystroke.
 */
function MarkAttendanceSheet({ onClose, defaultDate, editRecord = null }: MarkSheetProps) {
  const [open, setOpen] = useState(true)
  const close = () => setOpen(false)
  const isDesktop = useIsDesktop()
  const toast = useToast()
  const markMutation = useMarkAttendance()
  const updateMutation = useUpdateAttendanceRecord()
  const { data: people = [] } = useActiveProfiles()
  const { data: settings } = useAttendanceSettings()
  const tz = settings?.timezone ?? 'Asia/Karachi'
  const isEdit = editRecord !== null

  const [profileId, setProfileId] = useState(editRecord?.profile_id ?? '')
  // null = follow the auto-computed (present/late) value; a string = admin override.
  const [statusOverride, setStatusOverride] = useState<string | null>(editRecord?.status ?? null)
  const [date, setDate] = useState(editRecord?.date ?? defaultDate)
  const [checkInTime, setCheckInTime] = useState(() =>
    editRecord?.check_in
      ? minutesToHHMM(isoToZonedMinutes(editRecord.check_in, tz))
      : officeNowHHMM(tz),
  )
  const [note, setNote] = useState(editRecord?.note ?? '')

  const isSaving = markMutation.isPending || updateMutation.isPending

  // Effective on-time cutoff for the selected employee: their allowed check-in if
  // set, otherwise the office work-start plus the grace period.
  const cutoffMinutes = useMemo(() => {
    const person = people.find((p) => p.id === profileId)
    if (person?.allowed_check_in) return hhmmToMinutes(person.allowed_check_in.slice(0, 5))
    if (settings?.work_start_time) {
      const base = hhmmToMinutes(settings.work_start_time.slice(0, 5))
      return base === null ? null : base + (settings.grace_period_min ?? 0)
    }
    return null
  }, [people, profileId, settings])

  const computedStatus = useMemo(() => {
    const inMin = hhmmToMinutes(checkInTime)
    if (cutoffMinutes === null || inMin === null) return null
    return inMin > cutoffMinutes ? 'late' : 'present'
  }, [checkInTime, cutoffMinutes])

  const status = statusOverride ?? computedStatus ?? 'present'
  const showTimes = CLOCKED_STATUSES.has(status)

  const handleSave = async () => {
    if (!profileId) return
    const checkInIso = showTimes && checkInTime ? zonedWallTimeToIso(date, checkInTime, tz) : null
    try {
      if (isEdit && editRecord) {
        await updateMutation.mutateAsync({
          id: editRecord.id,
          status,
          note: note.trim() || null,
          checkIn: checkInIso,
        })
        toast('Attendance updated', 'success')
      } else {
        await markMutation.mutateAsync({
          profileId,
          date,
          status,
          note: note.trim() || undefined,
          checkIn: checkInIso ?? undefined,
        })
        toast('Attendance marked', 'success')
      }
      close()
    } catch {
      toast(isEdit ? 'Failed to update attendance' : 'Failed to mark attendance', 'error')
    }
  }

  const label = 'text-label font-ui font-semibold uppercase tracking-wider text-text-2'

  return (
    <Drawer
      open={open}
      onClose={close}
      onExitComplete={onClose}
      side={isDesktop ? 'right' : 'bottom'}
      width={420}
      busy={isSaving}
      title={
        <h2 className="font-display font-bold text-[16px] text-text-1">
          {isEdit ? 'Edit attendance' : 'Mark attendance'}
        </h2>
      }
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={close} disabled={isSaving}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} loading={isSaving} disabled={!profileId}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="rounded-sm border border-border-default bg-surface-2 px-3 py-2 font-ui text-[12px] text-text-3">
          This writes straight to the attendance record and is marked as entered by an admin.
        </p>

        <div className="space-y-1.5">
          <label className={label}>Employee</label>
          {isEdit ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border-default bg-surface-inset px-3 py-2">
              <Avatar name={editRecord?.profiles?.name ?? '?'} src={editRecord?.profiles?.avatar_url ?? undefined} size="sm" />
              <span className="font-ui text-[13px] text-text-1">{editRecord?.profiles?.name ?? '-'}</span>
            </div>
          ) : (
            <Select
              value={profileId}
              onChange={setProfileId}
              placeholder="Select employee…"
              options={people
                .filter((p) => !p.attendance_excluded)
                .map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className={label}>Status</label>
          <Select value={status} onChange={(v) => setStatusOverride(v)} options={STATUS_OPTIONS} />
        </div>

        <div className="space-y-1.5">
          <label className={label}>Date</label>
          <DatePicker value={date} onChange={setDate} placeholder="Select date…" />
        </div>

        {showTimes && (
          <div className="space-y-1.5">
            <label className={label}>Check in</label>
            <TimePicker value={checkInTime} onChange={setCheckInTime} placeholder="Time…" />
            {computedStatus && cutoffMinutes !== null && (
              <p className={cn('font-mono text-[10.5px]', computedStatus === 'late' ? 'text-warning' : 'text-success')}>
                {computedStatus === 'late'
                  ? `Late, checks in after ${minutesToHHMM(cutoffMinutes)} cutoff`
                  : `On time, at or before ${minutesToHHMM(cutoffMinutes)} cutoff`}
                {status !== computedStatus && ' (status overridden manually)'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className={label}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason, context…"
            rows={3}
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
          />
        </div>
      </div>
    </Drawer>
  )
}

/* ── Sorting ──────────────────────────────────────────────────────────────── */

interface Sort<K extends string> {
  key: K
  asc: boolean
}

/**
 * A column header that sorts. Pressing the active column flips the direction;
 * pressing another moves the sort to it and starts ascending, because that is
 * what "sort by name" means the first time you ask for it.
 */
function SortTh<K extends string>({
  label, col, sort, onSort, align = 'left',
}: {
  label: string
  col: K
  sort: Sort<K>
  onSort: (col: K) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === col
  return (
    <th
      className={cn(
        'px-4 py-2.5 font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap text-text-3',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        aria-label={`Sort by ${label}`}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-text-1',
          align === 'right' && 'flex-row-reverse',
          active && 'text-text-1',
        )}
      >
        {label}
        {active
          ? <ArrowUp size={10} className={cn('text-brand-red transition-transform', !sort.asc && 'rotate-180')} />
          : <ArrowUpDown size={10} className="text-text-4" />}
      </button>
    </th>
  )
}

/** Sorts in place on a copy, nulls last whichever direction is asked for. */
function sorted<T>(rows: T[], get: (row: T) => string | number | null, asc: boolean): T[] {
  return [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv))
    return asc ? cmp : -cmp
  })
}

/**
 * The sort control for the card lists, which have no headers to press.
 *
 * One Select for the column and one button for the direction, rather than a row
 * of pressable labels: on a phone the labels would be a scrolling strip of tiny
 * targets, and the direction still needs somewhere to live.
 */
function MobileSort<K extends string>({
  value, onChange, options,
}: {
  value: Sort<K>
  onChange: (sort: Sort<K>) => void
  options: { value: K; label: string }[]
}) {
  const current = options.find((o) => o.value === value.key)
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle py-2 sm:px-4">
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">Sort</span>
      <Select
        size="sm"
        value={value.key}
        onChange={(v) => {
          const match = options.find((o) => o.value === v)
          if (match) onChange({ key: match.value, asc: true })
        }}
        options={options}
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={() => onChange({ key: value.key, asc: !value.asc })}
        aria-label={value.asc ? `${current?.label ?? 'Sort'}, ascending` : `${current?.label ?? 'Sort'}, descending`}
        className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-border-default bg-surface-1 text-text-3 transition-colors hover:text-text-1"
      >
        <ArrowUp size={13} className={cn('transition-transform', !value.asc && 'rotate-180')} />
      </button>
    </div>
  )
}

/* ── The screen ───────────────────────────────────────────────────────────── */

type View = 'records' | 'people'

interface PersonRollup {
  profileId: string
  name: string
  avatarUrl: string | null
  days: number
  tally: Tally
}

/**
 * The attendance register, over any span of dates.
 *
 * This was one date and nothing else, which answered "who was in yesterday" and
 * no other question. A register is read two ways and it now supports both:
 *
 * - **Records** — a row per recorded day, which is the ledger. Provenance lives
 *   here: which device, whether the network validated, who entered it, the note.
 * - **By person** — the same rows folded up per person, which is the only way to
 *   see that somebody has been late nine times this month. A single day makes
 *   this view pointless, so the switch only appears once the span is wider.
 *
 * Filters narrow both views and every counter at once, so the tiles always
 * describe exactly the rows underneath them. A team filter is derived from the
 * membership table rather than a dedicated query — it is small, several screens
 * already hold it, and it updates the moment somebody joins a team.
 */
export function AttendanceRecords() {
  const toast = useToast()
  const isDesktop = useIsDesktop()
  const range = useDateRangeFilter('day')

  const [view, setView] = useState<View>('records')
  const [search, setSearch] = useState('')
  const [team, setTeam] = useState('all')
  const [person, setPerson] = useState('all')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [editRec, setEditRec] = useState<AttendanceWithProfile | null>(null)

  const { data: records = [], isLoading, isError } = useAttendanceRange(range.from, range.to)
  const { data: teams = [] } = useTeams()
  const { data: memberships = [] } = useTeamMembers()

  const teamMemberIds = useMemo(() => {
    if (team === 'all') return null
    return new Set(memberships.filter((m) => m.team_id === team).map((m) => m.profile_id))
  }, [team, memberships])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const statusMatch = RECORD_FILTERS.find((f) => f.value === status)
    return records.filter((r) => {
      if (statusMatch && !statusMatch.match(r)) return false
      if (source !== 'all' && r.source !== source) return false
      if (flaggedOnly && !r.device_flagged) return false
      if (person !== 'all' && r.profile_id !== person) return false
      if (teamMemberIds && !teamMemberIds.has(r.profile_id)) return false
      if (needle && !(r.profiles?.name ?? '').toLowerCase().includes(needle)) return false
      return true
    })
  }, [records, search, status, source, flaggedOnly, person, teamMemberIds])

  const stats = useMemo(() => {
    const t = emptyTally()
    for (const r of filtered) addTo(t, r)
    return t
  }, [filtered])

  const rollups = useMemo<PersonRollup[]>(() => {
    const byPerson = new Map<string, PersonRollup>()
    for (const r of filtered) {
      const existing = byPerson.get(r.profile_id) ?? {
        profileId: r.profile_id,
        name: r.profiles?.name ?? '-',
        avatarUrl: r.profiles?.avatar_url ?? null,
        days: 0,
        tally: emptyTally(),
      }
      existing.days += 1
      addTo(existing.tally, r)
      byPerson.set(r.profile_id, existing)
    }
    // Order is the view's business — it sorts on whichever column is chosen, and
    // opens on most-late-first, which is what a register folded up per person is
    // opened to find.
    return [...byPerson.values()]
  }, [filtered])

  // People who appear in the span, for the employee filter. Drawn from the rows
  // rather than the directory so the list is never full of names with nothing
  // recorded in the period you are looking at.
  const peopleOptions = useMemo(() => {
    const seen = new Map<string, { name: string; avatarUrl: string | null }>()
    for (const r of records) {
      if (!seen.has(r.profile_id)) {
        seen.set(r.profile_id, { name: r.profiles?.name ?? '-', avatarUrl: r.profiles?.avatar_url ?? null })
      }
    }
    return [
      { value: 'all', label: 'Everyone' },
      ...[...seen.entries()]
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([id, p]) => ({ value: id, label: p.name, avatar: { name: p.name, url: p.avatarUrl } })),
    ]
  }, [records])

  const teamOptions = useMemo(
    () => [
      { value: 'all', label: 'All teams' },
      ...teams.map((t) => ({ value: t.id, label: t.name })),
    ],
    [teams],
  )

  const activeFilters =
    (team !== 'all' ? 1 : 0) + (person !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0)
    + (source !== 'all' ? 1 : 0) + (flaggedOnly ? 1 : 0)

  const clearFilters = () => {
    setTeam('all'); setPerson('all'); setStatus('all'); setSource('all'); setFlaggedOnly(false)
  }

  // A span of one day needs no Date column and no per-person fold: both would
  // print the same value on every row.
  const isMultiDay = range.dayCount > 1

  const exportCsv = () => {
    if (filtered.length === 0) { toast('Nothing to export', 'error'); return }
    const name = `attendance-${range.from}${range.from === range.to ? '' : `_to_${range.to}`}`
    if (view === 'people' && isMultiDay) {
      downloadCsv(
        `${name}-by-person`,
        ['Name', 'Days recorded', 'Present', 'Late', 'Absent', 'Half day', 'Leave', 'WFH'],
        rollups.map((p) => [
          p.name, String(p.days), fmtDays(p.tally.present), fmtDays(p.tally.late),
          fmtDays(p.tally.absent), fmtDays(p.tally.half_day), fmtDays(p.tally.leave), fmtDays(p.tally.wfh),
        ]),
      )
      return
    }
    downloadCsv(
      name,
      ['Name', 'Date', 'Day', 'Attendance', 'Check In', 'Duration', 'Source', 'Device', 'Note'],
      filtered.map((r) => [
        r.profiles?.name ?? r.profile_id,
        r.date,
        // Two columns, matching the two chips: one merged "Status" would
        // reintroduce exactly the ambiguity the split removed.
        r.day_type === 'leave'
          ? r.day_part === 'full' ? 'Leave' : r.day_part === 'first_half' ? 'Half Day (1st)' : 'Half Day (2nd)'
          : r.day_type === 'wfh'
            ? r.day_part === 'full' ? 'WFH' : r.day_part === 'first_half' ? 'WFH (1st half)' : 'WFH (2nd half)'
            : r.day_type === 'holiday' ? 'Holiday' : 'Work',
        r.status ?? '',
        fmtTime(r.check_in),
        durationLabel(r),
        r.source,
        r.device_name ?? '',
        r.note ?? '',
      ]),
    )
  }

  const showPeopleView = view === 'people' && isMultiDay

  return (
    <div className="flex flex-col gap-4">
      {/* ── Period ──────────────────────────────────────────────────────────
          The span is the first thing said, because every number below it is
          only true of that span. Day / Week / Month / Custom fills the line on
          a phone; the stepper below it does the same. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Tabs
          variant="pill"
          size="sm"
          tabs={RANGE_TABS.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={range.mode}
          onChange={(k) => { if (isRangeMode(k)) range.setMode(k) }}
          fill
          className="h-9 w-full items-stretch sm:w-auto sm:flex-none"
        />

        {range.mode === 'custom' ? (
          <div className="flex items-center gap-2">
            <DatePicker value={range.from} onChange={range.setFrom} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
            <span className="font-mono text-[12px] text-text-4">to</span>
            <DatePicker value={range.to} onChange={range.setTo} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
          </div>
        ) : (
          <PeriodStepper
            label={range.label}
            onPrev={() => range.step(-1)}
            onNext={() => range.step(1)}
            disableNext={range.includesToday}
            fill
            className="sm:w-auto sm:shrink-0"
            labelClassName="sm:min-w-36 sm:text-center"
          />
        )}

        {isMultiDay && (
          <SlideSwitch
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'records', label: 'Records' },
              { value: 'people', label: 'By person' },
            ]}
            className="sm:ml-auto sm:w-56"
          />
        )}
      </div>

      {/* ── Counters ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border border-border-default bg-border-default sm:grid-cols-3 lg:grid-cols-5">
        {TILE_ORDER.map((key) => {
          const meta = RECORD_FILTERS.find((f) => f.value === key)
          if (!meta) return null
          const Icon = meta.icon
          const on = status === key
          return (
            // Pressing a counter filters to it. The tiles already name the five
            // slices somebody wants; making them inert and putting the same five
            // in a dropdown is two controls for one decision.
            <button
              key={key}
              type="button"
              onClick={() => setStatus(on ? 'all' : key)}
              aria-pressed={on}
              className={cn(
                'flex flex-col gap-2 bg-surface-1 p-3 text-left transition-colors sm:p-4',
                on ? 'bg-surface-2' : 'hover:bg-surface-2',
              )}
            >
              <span className={cn('flex size-8 items-center justify-center rounded-lg border', meta.bg)}>
                <Icon size={15} className={meta.color} />
              </span>
              <span>
                <span className={cn('block font-display text-[24px]/none font-bold', meta.color)}>
                  {fmtDays(stats[key as keyof Tally] ?? 0)}
                </span>
                <span className="mt-1 block font-ui text-[12px] text-text-3">{meta.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Toolbar + list ─────────────────────────────────────────────────── */}
      <div className="sm:border sm:border-border-default sm:bg-surface-1">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3 sm:gap-x-3 sm:px-4 sm:py-3">
          <div className="relative order-1 min-w-0 flex-1 sm:w-52 sm:flex-none">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member…"
              aria-label="Search members"
              className="w-full rounded-md border border-border-default bg-surface-inset py-1.5 pl-7 pr-3 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
            />
          </div>
          <div className="order-2 flex shrink-0 items-center gap-2 sm:ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFiltersOpen(true)}
              aria-label={activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'}
              className={cn('px-2.5 sm:px-3', activeFilters > 0 && 'border-brand-red/40')}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-red font-mono text-[10px] font-semibold text-white">
                  {activeFilters}
                </span>
              )}
            </Button>
            <Button size="sm" variant="secondary" onClick={exportCsv} aria-label="Export CSV" className="px-2.5 sm:px-3">
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={() => setMarking(true)} aria-label="Mark attendance" className="px-2.5 sm:px-3">
              <Plus size={14} />
              <span className="hidden sm:inline">Mark attendance</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center font-ui text-[13px] text-error sm:px-4">
            Could not load the records. Refresh to try again.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-text-4 sm:px-4">
            <ClipboardList size={20} />
            <span className="font-ui text-[13px]">
              {records.length === 0
                ? `Nothing recorded in ${range.label.toLowerCase()}.`
                : 'No records match these filters.'}
            </span>
          </div>
        ) : showPeopleView ? (
          <PeopleView rollups={rollups} />
        ) : (
          <RecordsView
            rows={filtered}
            showDate={isMultiDay}
            onEdit={setEditRec}
          />
        )}
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side={isDesktop ? 'right' : 'bottom'}
        width={380}
        title={
          <div>
            <h2 className="font-display font-semibold text-[15px] text-text-1">Filters</h2>
            <p className="font-ui text-[12px] text-text-4">
              {filtered.length} of {records.length} records shown
            </p>
          </div>
        }
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex-1" disabled={activeFilters === 0} onClick={clearFilters}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>Done</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          <FilterField label="Team">
            <Select value={team} onChange={setTeam} options={teamOptions} className="w-full" />
          </FilterField>
          <FilterField label="Employee">
            <Select value={person} onChange={setPerson} options={peopleOptions} className="w-full" />
          </FilterField>
          <FilterField label="Day">
            <Select
              value={status}
              onChange={setStatus}
              options={[{ value: 'all', label: 'Any day' }, ...STATUS_OPTIONS]}
              className="w-full"
            />
          </FilterField>
          <FilterField label="How it was recorded">
            <Select value={source} onChange={setSource} options={SOURCE_OPTIONS} className="w-full" />
          </FilterField>
          <FilterField label="Devices">
            {/* A div, not a button: Toggle is itself a <button>, and nesting one
                inside another is invalid HTML — the outer press never lands. */}
            <div className="flex items-center gap-3 rounded-sm border border-border-default bg-surface-inset px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="block font-ui text-[13px] text-text-1">Flagged only</span>
                <span className="block font-ui text-[11.5px]/snug text-text-4">
                  Check-ins from a device the terminal could not vouch for.
                </span>
              </div>
              <Toggle checked={flaggedOnly} onChange={setFlaggedOnly} label="Flagged devices only" />
            </div>
          </FilterField>
        </div>
      </Drawer>

      {marking && (
        <MarkAttendanceSheet defaultDate={range.to} onClose={() => setMarking(false)} />
      )}
      {editRec && (
        <MarkAttendanceSheet
          editRecord={editRec}
          defaultDate={editRec.date}
          onClose={() => setEditRec(null)}
        />
      )}
    </div>
  )
}

/* ── Records view ─────────────────────────────────────────────────────────── */

type RecordSortKey = 'name' | 'date' | 'status' | 'checkIn' | 'duration' | 'source'

/** Minutes worked, for sorting; null when the day never closed. */
function durationMinutes(rec: AttendanceWithProfile): number | null {
  if (!rec.check_in || !rec.check_out) return null
  return Math.floor((new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000)
}

const RECORD_SORTERS: Record<RecordSortKey, (r: AttendanceWithProfile) => string | number | null> = {
  name: (r) => r.profiles?.name ?? '',
  date: (r) => r.date,
  status: (r) => r.status ?? r.day_type,
  // The clock time, not the ISO string: sorting arrivals across several days has
  // to compare 09:15 with 09:40, not the 14th with the 15th.
  checkIn: (r) => (r.check_in ? new Date(r.check_in).getHours() * 60 + new Date(r.check_in).getMinutes() : null),
  duration: durationMinutes,
  source: (r) => r.source,
}

function RecordsView({
  rows, showDate, onEdit,
}: {
  rows: AttendanceWithProfile[]
  showDate: boolean
  onEdit: (rec: AttendanceWithProfile) => void
}) {
  // Date first on a span, name on a single day: the leading column is the one
  // that tells rows apart, and on one date every row carries the same date.
  const [sort, setSort] = useState<Sort<RecordSortKey>>(
    () => ({ key: showDate ? 'date' : 'name', asc: true }),
  )
  const onSort = (key: RecordSortKey) =>
    setSort((cur) => (cur.key === key ? { key, asc: !cur.asc } : { key, asc: true }))

  const view = useMemo(() => sorted(rows, RECORD_SORTERS[sort.key], sort.asc), [rows, sort])

  return (
    <>
      <table className="hidden w-full lg:table">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-2">
            <SortTh label="Member" col="name" sort={sort} onSort={onSort} />
            {showDate && <SortTh label="Date" col="date" sort={sort} onSort={onSort} />}
            <SortTh label="Status" col="status" sort={sort} onSort={onSort} />
            <SortTh label="Check In" col="checkIn" sort={sort} onSort={onSort} />
            <SortTh label="Duration" col="duration" sort={sort} onSort={onSort} />
            <SortTh label="Source" col="source" sort={sort} onSort={onSort} />
            {['Device', 'Note', ''].map((h, i) => (
              <th
                key={h || `sp-${i}`}
                className="px-4 py-2.5 text-left font-ui text-[10.5px] font-semibold uppercase tracking-wider text-text-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.map((rec) => (
            <tr key={rec.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={rec.profiles?.name ?? '?'} src={rec.profiles?.avatar_url ?? undefined} size="sm" personId={rec.profile_id} />
                  <PersonLink personId={rec.profile_id} className="font-ui text-[13px] font-medium text-text-1">
                    {rec.profiles?.name ?? rec.profile_id.slice(0, 8)}
                  </PersonLink>
                </div>
              </td>
              {showDate && (
                <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap text-text-2">{shortDay(rec.date)}</td>
              )}
              <td className="px-4 py-3"><AttendanceChips facts={rec} /></td>
              <td className="px-4 py-3 font-mono text-[12.5px] text-text-1">{fmtTime(rec.check_in)}</td>
              <td className="px-4 py-3 font-mono text-[12px] text-text-2">{durationLabel(rec)}</td>
              <td className="px-4 py-3">
                <span className={cn('font-mono text-[11px] uppercase tracking-wider', rec.source === 'self' ? 'text-success' : 'text-text-3')}>
                  {rec.source}
                </span>
              </td>
              <td className="px-4 py-3">
                {rec.device_flagged ? (
                  <span className="flex items-center gap-1 font-ui text-[11px] text-warning">
                    <AlertCircle size={11} /> Flagged
                  </span>
                ) : rec.device_name ? (
                  <span className="block max-w-30 truncate font-mono text-[11px] text-text-3">{rec.device_name}</span>
                ) : (
                  <span className="font-mono text-[11px] text-text-4">-</span>
                )}
              </td>
              <td className="max-w-35 truncate px-4 py-3 font-ui text-[12px] text-text-3">{rec.note ?? ''}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {rec.wifi_validated && <Wifi size={13} className="text-success" aria-label="WiFi validated" />}
                  <button
                    onClick={() => onEdit(rec)}
                    className="text-text-4 transition-colors hover:text-text-1"
                    aria-label={`Edit ${rec.profiles?.name ?? 'record'}`}
                    title="Edit record"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cards below lg. Two lines — who and when, then the facts — indented
          under the name so the second line reads as belonging to the first.
          There are no column headers to press here, so the same sort is offered
          as a select; without it, sorting would be a desktop-only feature. */}
      <div className="lg:hidden">
        <MobileSort
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Name' },
            ...(showDate ? [{ value: 'date' as const, label: 'Date' }] : []),
            { value: 'status', label: 'Status' },
            { value: 'checkIn', label: 'Check-in time' },
            { value: 'duration', label: 'Duration' },
            { value: 'source', label: 'Source' },
          ]}
        />
        {view.map((rec) => (
          <div key={rec.id} className="flex flex-col gap-1.5 border-b border-border-subtle py-3 last:border-0 sm:px-4">
            <div className="flex items-start gap-2.5">
              <Avatar name={rec.profiles?.name ?? '?'} src={rec.profiles?.avatar_url ?? undefined} size="sm" personId={rec.profile_id} />
              <div className="min-w-0 flex-1">
                <PersonLink personId={rec.profile_id} className="block truncate font-ui text-[13px] font-medium text-text-1">
                  {rec.profiles?.name ?? rec.profile_id.slice(0, 8)}
                </PersonLink>
                {showDate && (
                  <span className="block font-mono text-[11px] text-text-4">{shortDay(rec.date)}</span>
                )}
              </div>
              <button
                onClick={() => onEdit(rec)}
                className="shrink-0 text-text-4 transition-colors hover:text-text-1"
                aria-label={`Edit ${rec.profiles?.name ?? 'record'}`}
              >
                <Pencil size={13} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-9.5">
              <AttendanceChips facts={rec} />
              <span className="font-mono text-[11.5px] tabular-nums text-text-3">
                In <span className="text-text-1">{fmtTime(rec.check_in)}</span>
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-text-3">{durationLabel(rec)}</span>
              <span className={cn('font-mono text-[10.5px] uppercase tracking-wider', rec.source === 'self' ? 'text-success' : 'text-text-4')}>
                {rec.source}
              </span>
              {rec.wifi_validated && <Wifi size={12} className="text-success" aria-label="WiFi validated" />}
              {rec.device_flagged && (
                <span className="flex items-center gap-1 font-ui text-[11px] text-warning">
                  <AlertCircle size={11} /> Flagged
                </span>
              )}
            </div>

            {rec.note && <p className="pl-9.5 font-ui text-[11.5px]/snug text-text-4">{rec.note}</p>}
          </div>
        ))}
      </div>
    </>
  )
}

/* ── By-person view ───────────────────────────────────────────────────────── */

const ROLLUP_COLUMNS: { key: keyof Tally; label: string; color: string }[] = [
  { key: 'present', label: 'Present', color: 'text-success' },
  { key: 'late', label: 'Late', color: 'text-warning' },
  { key: 'absent', label: 'Absent', color: 'text-error' },
  { key: 'half_day', label: 'Half', color: 'text-service-design' },
  { key: 'leave', label: 'Leave', color: 'text-service-dev' },
  { key: 'wfh', label: 'WFH', color: 'text-service-dev' },
]

type PersonSortKey = 'name' | 'days' | keyof Tally

function PeopleView({ rollups }: { rollups: PersonRollup[] }) {
  // Opens on most-late-first, which is the question this view exists to answer;
  // the roll-up is built that way and the header says so from the first paint.
  const [sort, setSort] = useState<Sort<PersonSortKey>>({ key: 'late', asc: false })
  const onSort = (key: PersonSortKey) =>
    setSort((cur) => (cur.key === key ? { key, asc: !cur.asc } : { key, asc: key === 'name' }))

  const view = useMemo(
    () => sorted(
      rollups,
      (p) => (sort.key === 'name' ? p.name : sort.key === 'days' ? p.days : p.tally[sort.key]),
      sort.asc,
    ),
    [rollups, sort],
  )

  return (
    <>
      <table className="hidden w-full lg:table">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-2">
            <SortTh label="Member" col="name" sort={sort} onSort={onSort} />
            <SortTh label="Days" col="days" sort={sort} onSort={onSort} align="right" />
            {ROLLUP_COLUMNS.map((c) => (
              <SortTh key={c.key} label={c.label} col={c.key} sort={sort} onSort={onSort} align="right" />
            ))}
          </tr>
        </thead>
        <tbody>
          {view.map((p) => (
            <tr key={p.profileId} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" personId={p.profileId} />
                  <PersonLink personId={p.profileId} className="font-ui text-[13px] font-medium text-text-1">
                    {p.name}
                  </PersonLink>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-text-2">{p.days}</td>
              {ROLLUP_COLUMNS.map((c) => (
                <td key={c.key} className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums">
                  {p.tally[c.key] > 0
                    ? <span className={c.color}>{fmtDays(p.tally[c.key])}</span>
                    : <span className="text-text-4">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="lg:hidden">
        <MobileSort
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'days', label: 'Days recorded' },
            ...ROLLUP_COLUMNS.map((c) => ({ value: c.key, label: c.label })),
          ]}
        />
        {view.map((p) => (
          <div key={p.profileId} className="flex flex-col gap-2 border-b border-border-subtle py-3 last:border-0 sm:px-4">
            <div className="flex items-center gap-2.5">
              <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" personId={p.profileId} />
              <PersonLink personId={p.profileId} className="min-w-0 flex-1 truncate font-ui text-[13px] font-medium text-text-1">
                {p.name}
              </PersonLink>
              <span className="shrink-0 font-mono text-[11px] text-text-4">{p.days} days</span>
            </div>
            {/* Only the counts that are not zero: six columns of dashes on a
                phone is a wall, and the point of the fold is what stands out. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9.5 font-mono text-[11.5px] tabular-nums">
              {ROLLUP_COLUMNS.filter((c) => p.tally[c.key] > 0).map((c) => (
                <span key={c.key} className="text-text-4">
                  <span className={cn('font-semibold', c.color)}>{fmtDays(p.tally[c.key])}</span> {c.label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
