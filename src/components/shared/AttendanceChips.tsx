import { cn } from '../../lib/cn'

/**
 * Attendance is two independent facts, so it renders as two independent chips:
 *
 *   DAY         what kind of day it was    — Leave / Half Day · 1st / WFH · 2nd / Holiday
 *   ATTENDANCE  whether they turned up     — Present / Late / No show
 *
 * They used to share one column, which meant whichever was written last erased
 * the other and the row read differently depending on the order things happened
 * in. Keeping them visually separate is the point: a half day that was worked
 * shows BOTH chips, and neither can hide the other.
 *
 * An ordinary working day has no day chip, and a full day off has no attendance
 * chip — in both cases the missing half is genuinely "not applicable", so an em
 * dash is shown rather than an invented value.
 */

export interface AttendanceFacts {
  status: string | null
  day_type: string
  day_part: string
}

const CHIP_BASE =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap'

const DAY_META: Record<string, { label: string; cls: string }> = {
  leave:   { label: 'Leave',    cls: 'bg-service-dev/10 text-service-dev border-service-dev/30' },
  wfh:     { label: 'WFH',      cls: 'bg-service-dev/10 text-service-dev border-service-dev/30' },
  holiday: { label: 'Holiday',  cls: 'bg-text-3/10 text-text-3 border-border-default' },
}

const HALF_META = {
  label: 'Half Day',
  cls: 'bg-service-design/10 text-service-design border-service-design/30',
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-success/10 text-success border-success/30' },
  late:    { label: 'Late',    cls: 'bg-warning/10 text-warning border-warning/30' },
  absent:  { label: 'Absent',  cls: 'bg-error/10 text-error border-error/30' },
}

/** Short label for the worked half, so "Half Day" alone is never ambiguous. */
function dayPartSuffix(dayPart: string): string | null {
  if (dayPart === 'first_half') return '1st'
  if (dayPart === 'second_half') return '2nd'
  return null
}

/** True when nobody is expected in at all — a full day of leave or a holiday. */
function isFullDayOff(f: AttendanceFacts): boolean {
  return f.day_part === 'full' && (f.day_type === 'leave' || f.day_type === 'holiday')
}

const Dash = () => <span className="font-mono text-[11px] text-text-4">—</span>

/** The day-kind chip. Renders nothing for an ordinary working day. */
export function DayTypeChip({ facts, className }: { facts: AttendanceFacts; className?: string }) {
  const { day_type, day_part } = facts
  if (day_type === 'work') return null

  // A partial day gets a suffix whichever kind it is; only leave swaps its label
  // for "Half Day", because a partial WFH is not a day off — it is half a day
  // spent at home and half in the office, and both halves are worked.
  const partial = day_part !== 'full'
  const meta = partial && day_type === 'leave' ? HALF_META : DAY_META[day_type]
  if (!meta) return null

  const suffix = partial ? dayPartSuffix(day_part) : null
  return (
    <span className={cn(CHIP_BASE, meta.cls, className)}>
      {meta.label}
      {suffix && <span className="opacity-70">· {suffix}</span>}
    </span>
  )
}

/**
 * The attendance chip. `absent` deliberately reads "No show" on a partial day —
 * "Absent" next to an approved Half Day or partial WFH chip looks like an
 * accusation, when it only means they did not turn up for the half they were
 * due in for.
 */
export function AttendanceStatusChip({ facts, className }: { facts: AttendanceFacts; className?: string }) {
  const { status } = facts
  if (!status) return null
  const meta = STATUS_META[status]
  if (!meta) return null

  const onHalfDay = facts.day_part !== 'full'
  const label = status === 'absent' && onHalfDay ? 'No show' : meta.label

  return <span className={cn(CHIP_BASE, meta.cls, className)}>{label}</span>
}

/**
 * Both chips together, for the records table and anywhere a whole day is shown
 * in one cell. Falls back to a dash on each side independently, so a row never
 * silently collapses to nothing.
 */
export function AttendanceChips({ facts, className }: { facts: AttendanceFacts; className?: string }) {
  // Decided from the data, not from whether the child elements are truthy:
  // <DayTypeChip/> is a JSX element even when the component renders null, so
  // testing the element would always take the "has a chip" branch.
  const hasDayChip = facts.day_type !== 'work'
  const hasStatusChip = !!facts.status && facts.status in STATUS_META

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {hasDayChip && <DayTypeChip facts={facts} />}
      {hasStatusChip && <AttendanceStatusChip facts={facts} />}
      {/* Full day off: no arrival is expected, so say so rather than leave a gap. */}
      {hasDayChip && !hasStatusChip && isFullDayOff(facts) && <Dash />}
      {/* Nothing known at all (e.g. a row awaiting the absence job). */}
      {!hasDayChip && !hasStatusChip && <Dash />}
    </span>
  )
}
