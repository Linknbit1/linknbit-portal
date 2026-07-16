import React, { useState, useMemo } from 'react'
import {
  CheckCircle2, Clock, LogOut, Users, Calendar,
  AlertTriangle, Wifi, Monitor, Search, Download, Plus, X, Check,
  Home, ChevronDown, ClipboardList, ThumbsUp, ThumbsDown, ShieldCheck,
  Smartphone, Settings as SettingsIcon, Shield, AlertCircle, Save,
  BarChart2, TrendingUp, TrendingDown, Minus,
  Palmtree, Hourglass, Star, Plane, Trash2, Pencil,
  type LucideIcon,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { TimezoneSelect } from '../../components/ui/TimezoneSelect'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { PeriodStepper } from '../../components/ui/PeriodStepper'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import {
  useAllAttendance,
  useMarkAttendance,
  useUpdateAttendanceRecord,
  useAdminCheckOut,
  useAttendanceSettings,
  useUpdateAttendanceSettings,
  useAllAttendanceExceptions,
  useReviewException,
  useDeleteException,
  useMonthlyAttendance,
  useMonthlyHalfDayLeaves,
  useMonthlyOvertime,
  useHolidays,
  useCreateHoliday,
  useCreateHolidayRange,
  useDeleteHoliday,
  useWorkingSaturdays,
  useAddWorkingSaturday,
  useRemoveWorkingSaturday,
  useCompanyWfhDays,
  useAddCompanyWfhDay,
  useRemoveCompanyWfhDay,
  useAllOvertimeRequests,
  useReviewOvertime,
  useDeleteOvertime,
  useAllWfhRequests,
  useReviewWfh,
  useDeleteWfh,
  useGrantWfh,
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useAllLeaveRequests,
  useReviewLeave,
  useDeleteLeave,
} from '../../hooks/useAttendance'
import type {
  AttendanceExceptionWithProfile,
  AttendanceSettings,
  WfhRequestWithProfile,
  LeaveRequestWithProfile,
  LeaveType,
} from '../../api/attendance'
import { useActiveProfiles } from '../../hooks/useAuth'
import { AttendanceCheckInCard } from '../../components/shared/AttendanceCheckInCard'
import { useEnrolledDevices, useApproveDevice, useDeactivateDevice } from '../../hooks/useEnrolledDevices'
import type { AttendanceWithProfile } from '../../api/attendance'
import { downloadCsv } from '../../lib/csv'
import { cn } from '../../lib/cn'
import { zonedWallTimeToIso, isoToZonedMinutes } from '../../lib/timezone'
import { computeEmployeeHours } from '../../lib/attendanceHours'
import { ModalShell } from '../../components/ui/ModalShell'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

/* ── Status chip meta ─────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  present:  { label: 'Present',  cls: 'bg-success/10 text-success border-success/30',     dot: '#22C55E' },
  late:     { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/30',     dot: '#F59E0B' },
  absent:   { label: 'Absent',   cls: 'bg-error/10 text-error border-error/30',           dot: '#F4364C' },
  half_day: { label: 'Half Day', cls: 'bg-service-design/10 text-service-design border-service-design/30', dot: '#A78BFA' },
  leave:    { label: 'Leave',    cls: 'bg-service-dev/10 text-service-dev border-service-dev/30', dot: '#22D3EE' },
  wfh:      { label: 'WFH',      cls: 'bg-service-dev/10 text-service-dev border-service-dev/30', dot: '#22D3EE' },
  holiday:  { label: 'Holiday',  cls: 'bg-text-3/10 text-text-3 border-border-default',   dot: '#6B7280' },
}

const WFH_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  rejected: { label: 'Rejected', cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
}

function StatusChip({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['absent']
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="size-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

function WFHStatusChip({ status }: { status: string }) {
  const m = WFH_META[status] ?? WFH_META.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="size-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

/* ── Mark / Edit Attendance modal ─────────────────────────────────────────── */
interface MarkModalProps {
  onClose: () => void
  dateFilter: string
  /** When provided, the modal edits this existing record instead of creating one. */
  editRecord?: AttendanceWithProfile | null
}

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

// Statuses that carry a clocked check-in/out time.
const CLOCKED_STATUSES = new Set(['present', 'late', 'half_day'])

function MarkModal({ onClose, dateFilter, editRecord = null }: MarkModalProps) {
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
  const [date, setDate] = useState(editRecord?.date ?? dateFilter)
  const [checkInTime, setCheckInTime] = useState(() =>
    editRecord?.check_in ? minutesToHHMM(isoToZonedMinutes(editRecord.check_in, tz)) : officeNowHHMM(tz),
  )
  const [checkOutTime, setCheckOutTime] = useState(() =>
    editRecord?.check_out ? minutesToHHMM(isoToZonedMinutes(editRecord.check_out, tz)) : '',
  )
  const [note, setNote] = useState(editRecord?.note ?? '')

  const isSaving = markMutation.isPending || updateMutation.isPending

  // Effective on-time cutoff for the selected employee: their allowed check-in if set,
  // otherwise the office work-start + grace period.
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

  // Effective status: an explicit admin override wins; otherwise it auto-follows the
  // present/late computed from the check-in time vs the employee's cutoff. This fixes
  // "marked at 08:30 but not flagged late" without an effect (no cascading renders).
  const status = statusOverride ?? computedStatus ?? 'present'
  const showTimes = CLOCKED_STATUSES.has(status)

  const handleSave = async () => {
    if (!profileId) return
    const clocked = showTimes
    const checkInIso = clocked && checkInTime ? zonedWallTimeToIso(date, checkInTime, tz) : null
    const checkOutIso = clocked && checkOutTime ? zonedWallTimeToIso(date, checkOutTime, tz) : null
    try {
      if (isEdit && editRecord) {
        await updateMutation.mutateAsync({
          id: editRecord.id,
          status,
          note: note.trim() || null,
          checkIn: checkInIso,
          checkOut: checkOutIso,
        })
        toast('Attendance updated', 'success')
      } else {
        await markMutation.mutateAsync({
          profileId,
          date,
          status,
          note: note.trim() || undefined,
          checkIn: checkInIso ?? undefined,
          checkOut: checkOutIso ?? undefined,
        })
        toast('Attendance marked', 'success')
      }
      onClose()
    } catch {
      toast(isEdit ? 'Failed to update attendance' : 'Failed to mark attendance', 'error')
    }
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{isEdit ? 'Edit Attendance' : 'Mark Attendance'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Employee</label>
            {isEdit ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border-default bg-surface-inset px-3 py-2">
                <Avatar name={editRecord?.profiles?.name ?? '?'} src={editRecord?.profiles?.avatar_url ?? undefined} size="sm" />
                <span className="font-ui text-[13px] text-text-1">{editRecord?.profiles?.name ?? '—'}</span>
              </div>
            ) : (
              <Select
                value={profileId}
                onChange={setProfileId}
                placeholder="Select employee…"
                options={people.filter((p) => !p.attendance_excluded).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))}
              />
            )}
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Status</label>
            <Select
              value={status}
              onChange={(v) => setStatusOverride(v)}
              options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
            <DatePicker value={date} onChange={setDate} placeholder="Select date…" />
          </div>
          {showTimes && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Check in</label>
                  <TimePicker value={checkInTime} onChange={setCheckInTime} placeholder="Time…" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Check out (optional)</label>
                  <TimePicker value={checkOutTime} onChange={setCheckOutTime} placeholder="Time…" />
                </div>
              </div>
              {computedStatus && cutoffMinutes !== null && (
                <p className={cn('font-mono text-[10.5px]', computedStatus === 'late' ? 'text-warning' : 'text-success')}>
                  {computedStatus === 'late'
                    ? `Late — checks in after ${minutesToHHMM(cutoffMinutes)} cutoff`
                    : `On time — at or before ${minutesToHHMM(cutoffMinutes)} cutoff`}
                  {status !== computedStatus && ' (status overridden manually)'}
                </p>
              )}
            </>
          )}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason, context..."
              rows={2}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!profileId || isSaving}>
            <Check size={14} /> Save
          </Button>
        </div>
    </ModalShell>
  )
}

/* ── Daily Records tab ───────────────────────────────────────────────────── */
export function DailyRecordsTab() {
  const toast = useToast()
  const [dateFilter, setDateFilter] = useState(localToday)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [markOpen, setMarkOpen] = useState(false)
  const [editRec, setEditRec] = useState<AttendanceWithProfile | null>(null)

  const { data: records = [], isLoading } = useAllAttendance(dateFilter)
  const adminCheckOutMutation = useAdminCheckOut()

  const filtered = records.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    const name = r.profiles?.name ?? ''
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    present: records.filter((r) => r.status === 'present').length,
    late: records.filter((r) => r.status === 'late').length,
    absent: records.filter((r) => r.status === 'absent').length,
    half_day: records.filter((r) => r.status === 'half_day').length,
    leave: records.filter((r) => r.status === 'leave').length,
  }

  const handleCheckOut = async (rec: AttendanceWithProfile) => {
    try {
      await adminCheckOutMutation.mutateAsync({ id: rec.id, date: rec.date })
      toast('Check-out recorded', 'success')
    } catch {
      toast('Failed to record check-out', 'error')
    }
  }

  const durationLabel = (rec: AttendanceWithProfile) => {
    if (!rec.check_in || !rec.check_out) return '—'
    const diff = new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()
    const mins = Math.floor(diff / 60000)
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast('No records to export', 'error')
      return
    }
    downloadCsv(
      `attendance-${dateFilter}`,
      ['Name', 'Date', 'Status', 'Check In', 'Check Out', 'Duration', 'Source', 'Device', 'Note'],
      filtered.map((r) => [
        r.profiles?.name ?? r.profile_id,
        r.date,
        r.status,
        fmtTime(r.check_in),
        fmtTime(r.check_out),
        durationLabel(r),
        r.source,
        r.device_name ?? '',
        r.note ?? '',
      ]),
    )
  }

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Present',  value: stats.present,  icon: CheckCircle2, color: 'text-success',         bg: 'bg-success/10 border-success/20' },
          { label: 'Late',     value: stats.late,     icon: Clock,        color: 'text-warning',         bg: 'bg-warning/10 border-warning/20' },
          { label: 'Absent',   value: stats.absent,   icon: AlertTriangle,color: 'text-error',           bg: 'bg-error/10 border-error/20' },
          { label: 'Half Day', value: stats.half_day, icon: Monitor,      color: 'text-service-design',  bg: 'bg-service-design/10 border-service-design/20' },
          { label: 'Leave',    value: stats.leave,    icon: Wifi,         color: 'text-service-dev',     bg: 'bg-service-dev/10 border-service-dev/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex flex-col gap-2">
            <div className={cn('size-9 rounded-lg border flex items-center justify-center', bg)}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[28px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-border-default rounded-xl">
        <div className="flex flex-wrap items-center gap-3 px-4 lg:px-5 py-3.5 border-b border-border-subtle">
          <Calendar size={15} className="text-text-3 shrink-0" />
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="Select date…"
            className="w-40"
          />
          <div className="relative flex-1 max-w-55">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member..."
              className="w-full pl-7 pr-3 py-1.5 bg-surface-inset border border-border-default rounded-md text-[12.5px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <Select
            size="sm"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: 'all', label: 'All Status' },
              ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download size={13} /> Export
            </Button>
            <Button size="sm" onClick={() => setMarkOpen(true)}>
              <Plus size={13} /> Mark Attendance
            </Button>
          </div>
        </div>

        <table className="w-full hidden lg:table">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-2">
              {['Member', 'Status', 'Check In', 'Check Out', 'Duration', 'Source', 'Device', 'Note', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">
                  No records for this date / filter
                </td>
              </tr>
            ) : (
              filtered.map((rec) => (
                <tr key={rec.id} className="border-b border-border-subtle hover:bg-white/1.5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={rec.profiles?.name ?? '?'} src={rec.profiles?.avatar_url ?? undefined} size="sm" />
                      <span className="font-ui font-medium text-[13px] text-text-1">
                        {rec.profiles?.name ?? rec.profile_id.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusChip status={rec.status} /></td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-text-1">{fmtTime(rec.check_in)}</td>
                  <td className="px-4 py-3">
                    {rec.check_out ? (
                      <span className="font-mono text-[12.5px] text-text-1">{fmtTime(rec.check_out)}</span>
                    ) : rec.check_in ? (
                      <button
                        onClick={() => handleCheckOut(rec)}
                        disabled={adminCheckOutMutation.isPending}
                        className="flex items-center gap-1 text-[11.5px] font-ui font-semibold text-warning hover:text-warning/80 transition-colors"
                      >
                        <LogOut size={12} /> Check Out
                      </button>
                    ) : (
                      <span className="font-mono text-[12.5px] text-text-4">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-2">{durationLabel(rec)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'font-mono text-[11px] uppercase tracking-wider',
                      rec.source === 'self' ? 'text-success' : 'text-text-3',
                    )}>
                      {rec.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rec.device_flagged ? (
                      <span className="flex items-center gap-1 text-[11px] font-ui text-warning">
                        <AlertCircle size={11} /> Flagged
                      </span>
                    ) : rec.device_name ? (
                      <span className="font-mono text-[11px] text-text-3 truncate max-w-30 block">{rec.device_name}</span>
                    ) : (
                      <span className="font-mono text-[11px] text-text-4">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-ui text-[12px] text-text-3 max-w-35 truncate">
                    {rec.note ?? ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {rec.wifi_validated && (
                        <Wifi size={13} className="text-success" aria-label="WiFi validated" />
                      )}
                      <button
                        onClick={() => setEditRec(rec)}
                        className="text-text-4 hover:text-text-1 transition-colors"
                        aria-label={`Edit ${rec.profiles?.name ?? 'record'}`}
                        title="Edit record"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col">
          {isLoading ? (
            <div className="px-4 py-12 text-center font-mono text-[12px] text-text-4">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center font-mono text-[12px] text-text-4">No records for this date / filter</div>
          ) : (
            filtered.map((rec) => (
              <div key={rec.id} className="px-4 py-3.5 border-b border-border-subtle last:border-0 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={rec.profiles?.name ?? '?'} src={rec.profiles?.avatar_url ?? undefined} size="sm" />
                    <span className="font-ui font-medium text-[13px] text-text-1 truncate">
                      {rec.profiles?.name ?? rec.profile_id.slice(0, 8)}
                    </span>
                    {rec.wifi_validated && <Wifi size={12} className="text-success shrink-0" aria-label="WiFi validated" />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip status={rec.status} />
                    <button onClick={() => setEditRec(rec)} className="text-text-4 hover:text-text-1 transition-colors" aria-label="Edit record">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-text-2 pl-10.5">
                  <span>In: <span className="text-text-1">{fmtTime(rec.check_in)}</span></span>
                  {rec.check_out ? (
                    <span>Out: <span className="text-text-1">{fmtTime(rec.check_out)}</span></span>
                  ) : rec.check_in ? (
                    <button
                      onClick={() => handleCheckOut(rec)}
                      disabled={adminCheckOutMutation.isPending}
                      className="flex items-center gap-1 text-[11.5px] font-ui font-semibold text-warning hover:text-warning/80"
                    >
                      <LogOut size={12} /> Check Out
                    </button>
                  ) : null}
                  <span>{durationLabel(rec)}</span>
                  <span className={cn('uppercase tracking-wider text-[11px]', rec.source === 'self' ? 'text-success' : 'text-text-3')}>{rec.source}</span>
                  {rec.device_flagged && <span className="flex items-center gap-1 text-[11px] font-ui text-warning"><AlertCircle size={11} /> Flagged</span>}
                </div>
                {rec.note && <p className="font-ui text-[12px] text-text-3 pl-10.5">{rec.note}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {markOpen && <MarkModal onClose={() => setMarkOpen(false)} dateFilter={dateFilter} />}
      {editRec && <MarkModal editRecord={editRec} onClose={() => setEditRec(null)} dateFilter={dateFilter} />}
    </>
  )
}

/* ── Grant WFH modal ──────────────────────────────────────────────────────── */
function GrantWfhModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const grantMut = useGrantWfh()
  const { data: people = [] } = useActiveProfiles()
  const [profileId, setProfileId] = useState('')
  const [date, setDate] = useState(localToday)
  const [reason, setReason] = useState('')

  const handleGrant = async () => {
    if (!profileId || !reason.trim()) return
    try {
      await grantMut.mutateAsync({ profileId, date, reason: reason.trim(), grantedBy: profile?.id ?? '' })
      toast('WFH granted — marked on attendance', 'success')
      onClose()
      setProfileId(''); setReason(''); setDate(localToday())
    } catch {
      toast('Failed to grant WFH', 'error')
    }
  }

  if (!open) return null

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Grant WFH</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Employee</label>
            <Select
              value={profileId}
              onChange={setProfileId}
              placeholder="Select employee…"
              options={people.filter((p) => !p.attendance_excluded).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is WFH being granted?"
              rows={2}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleGrant} disabled={!profileId || !reason.trim() || grantMut.isPending}>
            <Check size={14} /> Grant
          </Button>
        </div>
    </ModalShell>
  )
}

/* ── WFH Requests tab ─────────────────────────────────────────────────────── */
export function WFHRequestsTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: requests = [] } = useAllWfhRequests()
  const reviewMut = useReviewWfh()
  const deleteMut = useDeleteWfh()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const [grantOpen, setGrantOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<WfhRequestWithProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WfhRequestWithProfile | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  const filtered = requests.filter((r) => statusFilter === 'all' || r.status === statusFilter)

  const approve = async (id: string) => {
    try {
      await reviewMut.mutateAsync({ id, status: 'approved', reviewedBy: profile?.id ?? '' })
      toast('WFH request approved — marked on attendance', 'success')
    } catch {
      toast('Failed to approve request', 'error')
    }
  }

  const reject = async (id: string, note: string) => {
    try {
      await reviewMut.mutateAsync({ id, status: 'rejected', reviewedBy: profile?.id ?? '', reviewNote: note })
      toast('WFH request rejected', 'error')
    } catch {
      toast('Failed to reject request', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast('WFH request deleted', 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete request', 'error')
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pending,  icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',       value: approved, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',       value: rejected, icon: AlertTriangle,color: 'text-error',   bg: 'bg-error/10 border-error/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('size-10 rounded-lg border flex items-center justify-center shrink-0', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[26px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar icon={ClipboardList} title="WFH Requests">
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <ShieldCheck size={13} /> Grant WFH
          </Button>
        </SectionToolbar>

        {filtered.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No WFH requests match this filter.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((req) => {
              const isExpanded = expandedId === req.id
              return (
                <div key={req.id} className="hover:bg-white/1.5 transition-colors">
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar name={req.profiles?.name ?? '?'} src={req.profiles?.avatar_url ?? undefined} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-ui font-medium text-[13px] text-text-1">{req.profiles?.name ?? '?'}</span>
                        {req.granted_directly && (
                          <span className="text-[10px] font-mono bg-service-dev/10 text-service-dev border border-service-dev/20 px-1.5 py-0.5 rounded-xs uppercase tracking-wide">HR Granted</span>
                        )}
                      </div>
                      <p className="text-[12px] font-ui text-text-3 truncate max-w-85">{req.reason}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] font-mono text-text-2 shrink-0">
                      <Calendar size={12} className="text-text-4" />
                      {req.date}
                    </div>
                    <div className="shrink-0 text-[11.5px] font-mono text-text-4">{fmt(req.created_at)}</div>
                    <WFHStatusChip status={req.status} />
                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 ml-1">
                        <button
                          onClick={() => approve(req.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors"
                        >
                          <ThumbsUp size={12} /> Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(req)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors"
                        >
                          <ThumbsDown size={12} /> Reject
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setExpandedId(isExpanded ? null : req.id)} className="ml-1 text-text-4 hover:text-text-1 transition-colors">
                        <ChevronDown size={15} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => setDeleteTarget(req)} className="ml-0.5 text-text-4 hover:text-error transition-colors" aria-label="Delete request">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {isExpanded && req.status !== 'pending' && (
                    <div className="px-5 pb-3.5 pt-0">
                      <div className="bg-surface-2 rounded-md px-4 py-3 text-[12px] font-ui text-text-3 flex gap-4 flex-wrap">
                        {req.reviewed_at && <span><span className="text-text-4 font-mono">Reviewed at</span> <span className="text-text-2">{fmt(req.reviewed_at)}</span></span>}
                        {req.review_note && <span className="w-full text-text-2 italic">"{req.review_note}"</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Grant WFH modal */}
      <GrantWfhModal open={grantOpen} onClose={() => setGrantOpen(false)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete WFH request?"
        message={
          <>
            This permanently deletes the WFH request for{' '}
            <span className="font-semibold text-text-1">{deleteTarget?.profiles?.name ?? 'this employee'}</span>
            {deleteTarget?.status === 'approved' && ' and removes the work-from-home day from their attendance'}. This cannot be undone.
          </>
        }
        isPending={deleteMut.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {rejectTarget && (
        <ModalShell onClose={() => setRejectTarget(null)} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Reject Request</h3>
              <button onClick={() => setRejectTarget(null)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="text-[13px] font-ui text-text-2 mb-4">
              Rejecting WFH request for <span className="font-semibold text-text-1">{rejectTarget.profiles?.name ?? 'this employee'}</span>.
            </p>
            <textarea
              placeholder="Reason for rejection..."
              rows={3}
              onChange={(e) => {
                /* controlled in onReject below */
                void e
              }}
              id="reject-note"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" onClick={() => {
                const note = (document.getElementById('reject-note') as HTMLTextAreaElement)?.value ?? ''
                reject(rejectTarget.id, note)
                setRejectTarget(null)
              }}>
                <X size={14} /> Reject
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ── Leave type editor modal ──────────────────────────────────────────────── */
const LEAVE_COLOR_OPTIONS = [
  { value: 'service-dev',    label: 'Cyan' },
  { value: 'service-mkt',    label: 'Amber' },
  { value: 'service-design', label: 'Violet' },
  { value: 'success',        label: 'Green' },
  { value: 'warning',        label: 'Orange' },
]

function LeaveTypeModal({ open, onClose, editing }: {
  open: boolean
  onClose: () => void
  editing: LeaveType | null
}) {
  if (!open) return null
  // Keyed remount initialises the form from `editing` without a sync-in-effect.
  return <LeaveTypeForm key={editing?.id ?? 'new'} onClose={onClose} editing={editing} />
}

function LeaveTypeForm({ onClose, editing }: { onClose: () => void; editing: LeaveType | null }) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const createMut = useCreateLeaveType()
  const updateMut = useUpdateLeaveType()
  const [name, setName] = useState(editing?.name ?? '')
  const [days, setDays] = useState(String(editing?.days_allowed ?? 0))
  const [color, setColor] = useState(editing?.color ?? 'service-dev')

  const handleSave = async () => {
    const daysNum = Number(days)
    if (!name.trim() || !Number.isFinite(daysNum) || daysNum < 0) return
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: { name: name.trim(), days_allowed: daysNum, color } })
        toast('Leave type updated', 'success')
      } else {
        await createMut.mutateAsync({ payload: { name: name.trim(), days_allowed: daysNum, color }, createdBy: profile?.id ?? '' })
        toast('Leave type created', 'success')
      }
      onClose()
    } catch {
      toast('Failed to save leave type', 'error')
    }
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{editing ? 'Edit Leave Type' : 'New Leave Type'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Leave"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Days / Year</label>
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Color</label>
              <Select value={color} onChange={setColor} options={LEAVE_COLOR_OPTIONS} />
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave}
            disabled={!name.trim() || createMut.isPending || updateMut.isPending}>
            <Check size={14} /> {editing ? 'Save' : 'Create'}
          </Button>
        </div>
    </ModalShell>
  )
}

/* ── Leave tab (types + quotas + request review) ──────────────────────────── */
const LEAVE_STATUS_CLS: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/25',
  approved: 'bg-success/10 text-success border-success/25',
  rejected: 'bg-error/10 text-error border-error/25',
}

// Static class lookups so Tailwind JIT sees literal class names (no dynamic `bg-${color}`).
const LEAVE_COLOR_CLS: Record<string, { dot: string; chip: string }> = {
  'service-dev':    { dot: 'bg-service-dev',    chip: 'text-service-dev border-service-dev/30' },
  'service-mkt':    { dot: 'bg-service-mkt',    chip: 'text-service-mkt border-service-mkt/30' },
  'service-design': { dot: 'bg-service-design', chip: 'text-service-design border-service-design/30' },
  success:          { dot: 'bg-success',        chip: 'text-success border-success/30' },
  warning:          { dot: 'bg-warning',        chip: 'text-warning border-warning/30' },
}
const leaveColor = (c: string | null | undefined) => LEAVE_COLOR_CLS[c ?? 'service-dev'] ?? LEAVE_COLOR_CLS['service-dev']

export function LeaveTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: types = [] } = useLeaveTypes()
  const { data: requests = [] } = useAllLeaveRequests()
  const deleteTypeMut = useDeleteLeaveType()
  const reviewMut = useReviewLeave()
  const deleteMut = useDeleteLeave()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestWithProfile | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequestWithProfile | null>(null)

  const filtered = requests.filter((r) => statusFilter === 'all' || r.status === statusFilter)

  const fmtRange = (start: string, end: string) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts)
    if (start === end) return s
    const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts)
    return `${s} – ${e}`
  }

  const openNewType = () => { setEditingType(null); setTypeModalOpen(true) }
  const openEditType = (t: LeaveType) => { setEditingType(t); setTypeModalOpen(true) }

  const deleteType = async (t: LeaveType) => {
    try {
      await deleteTypeMut.mutateAsync(t.id)
      toast('Leave type removed', 'success')
    } catch {
      toast('Cannot delete — leave requests reference this type', 'error')
    }
  }

  const approve = async (id: string) => {
    try {
      await reviewMut.mutateAsync({ id, status: 'approved', reviewedBy: profile?.id ?? '' })
      toast('Leave approved — marked on attendance', 'success')
    } catch {
      toast('Failed to approve leave', 'error')
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    try {
      await reviewMut.mutateAsync({ id: rejectTarget.id, status: 'rejected', reviewedBy: profile?.id ?? '', reviewNote: rejectNote.trim() || undefined })
      toast('Leave rejected', 'error')
      setRejectTarget(null); setRejectNote('')
    } catch {
      toast('Failed to reject leave', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast('Leave request deleted', 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete leave request', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Leave types management */}
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar icon={Plane} title="Leave Types">
          <Button size="sm" onClick={openNewType}>
            <Plus size={13} /> Add Type
          </Button>
        </SectionToolbar>
        {types.length === 0 ? (
          <div className="py-10 text-center font-ui text-[13px] text-text-4">No leave types yet — add one to get started.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn('size-2.5 rounded-full shrink-0', leaveColor(t.color).dot)} />
                <span className="font-ui font-medium text-[13px] text-text-1 flex-1">{t.name}</span>
                {!t.is_active && <span className="text-[10px] font-mono text-text-4 uppercase">inactive</span>}
                <span className="font-mono text-[12px] text-text-3">{t.days_allowed} days / year</span>
                <button onClick={() => openEditType(t)} className="ml-2 text-text-4 hover:text-text-1 transition-colors" aria-label="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteType(t)} className="text-text-4 hover:text-error transition-colors" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave requests review */}
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar icon={ClipboardList} title="Leave Requests">
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </SectionToolbar>
        {filtered.length === 0 ? (
          <div className="py-12 text-center font-ui text-[13px] text-text-4">No leave requests match this filter.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-5 py-3.5">
                <Avatar name={req.profiles?.name ?? '?'} src={req.profiles?.avatar_url ?? undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-ui font-medium text-[13px] text-text-1">{req.profiles?.name ?? '?'}</span>
                    <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-xs border', leaveColor(req.leave_types?.color).chip)}>
                      {req.leave_types?.name ?? 'Leave'}
                    </span>
                    <span className="font-mono text-[11.5px] text-text-3">{fmtRange(req.start_date, req.end_date)}</span>
                    <span className="font-display font-bold text-[12px] text-text-2">{req.days}d</span>
                    {req.day_part !== 'full' && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-service-design/10 border border-service-design/25 text-service-design text-[10px] font-mono font-semibold">
                        Half day
                      </span>
                    )}
                  </div>
                  <p className="font-ui text-[12px] text-text-3 truncate">{req.reason}</p>
                  {req.review_note && <p className="font-ui text-[11px] text-error mt-0.5 italic">"{req.review_note}"</p>}
                </div>
                {req.status === 'pending' ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => approve(req.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors">
                      <ThumbsUp size={12} /> Approve
                    </button>
                    <button onClick={() => { setRejectTarget(req); setRejectNote('') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors">
                      <ThumbsDown size={12} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold shrink-0 mt-0.5',
                    LEAVE_STATUS_CLS[req.status] ?? LEAVE_STATUS_CLS.pending)}>
                    {req.status}
                  </span>
                )}
                {isAdmin && (
                  <button onClick={() => setDeleteTarget(req)} className="shrink-0 mt-0.5 text-text-4 hover:text-error transition-colors" aria-label="Delete request">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <LeaveTypeModal open={typeModalOpen} onClose={() => setTypeModalOpen(false)} editing={editingType} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete leave request?"
        message={
          <>
            This permanently deletes the leave request for{' '}
            <span className="font-semibold text-text-1">{deleteTarget?.profiles?.name ?? 'this employee'}</span>
            {deleteTarget?.status === 'approved' && ' and removes the leave days from their attendance'}. This cannot be undone.
          </>
        }
        isPending={deleteMut.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {rejectTarget && (
        <ModalShell onClose={() => setRejectTarget(null)} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Reject Leave</h3>
              <button onClick={() => setRejectTarget(null)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="text-[13px] font-ui text-text-2 mb-4">
              Rejecting leave for <span className="font-semibold text-text-1">{rejectTarget.profiles?.name ?? 'this employee'}</span>.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" onClick={confirmReject} disabled={reviewMut.isPending}>
                <X size={14} /> Reject
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ── Enrolled Devices tab ─────────────────────────────────────────────────── */
export function EnrolledDevicesTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  // Approving/reactivating a device authorises check-in. Admins/super_admins approve any
  // device; HR approve others' devices but not their own (self-approval is blocked, RLS too).
  // Anyone with access to this tab may deactivate (block).
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isHr    = profile?.role === 'hr'
  const { data: devices = [], isLoading } = useEnrolledDevices()
  const approveMutation = useApproveDevice()
  const deactivateMutation = useDeactivateDevice()

  const pending = devices.filter((d) => !d.approved_by && d.is_active)
  const approved = devices.filter((d) => d.approved_by && d.is_active)
  const inactive = devices.filter((d) => !d.is_active)

  // Group by fingerprint to detect shared physical devices
  const fingerprintMap = new Map<string, typeof devices>()
  devices.forEach((d) => {
    fingerprintMap.set(d.device_fingerprint, [...(fingerprintMap.get(d.device_fingerprint) ?? []), d])
  })
  const sharedFingerprints = new Set(
    [...fingerprintMap.entries()].filter(([, g]) => g.length > 1).map(([fp]) => fp)
  )
  const sharedDevicesCount = sharedFingerprints.size

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const handleApprove = async (deviceId: string) => {
    if (!profile) return
    try {
      await approveMutation.mutateAsync({ deviceId, approvedBy: profile.id })
      toast('Device approved', 'success')
    } catch {
      toast('Failed to approve device', 'error')
    }
  }

  const handleDeactivate = async (deviceId: string) => {
    try {
      await deactivateMutation.mutateAsync(deviceId)
      toast('Device deactivated', 'success')
    } catch {
      toast('Failed to deactivate device', 'error')
    }
  }

  const handleReactivate = async (deviceId: string) => {
    if (!profile) return
    try {
      await approveMutation.mutateAsync({ deviceId, approvedBy: profile.id })
      toast('Device reactivated — employee can check in again', 'success')
    } catch {
      toast('Failed to reactivate device', 'error')
    }
  }

  const DeviceRow = ({ d }: { d: typeof devices[number] }) => {
    // HR cannot approve/reactivate their own device; admins can approve anyone's.
    const canApproveThis = isAdmin || (isHr && d.profile_id !== profile?.id)
    const isShared = sharedFingerprints.has(d.device_fingerprint)
    const sharedWith = isShared
      ? (fingerprintMap.get(d.device_fingerprint) ?? [])
          .filter((other) => other.id !== d.id)
          .map((other) => other.profiles?.name ?? other.profile_id.slice(0, 8))
      : []

    return (
    <tr className={cn(
      'border-b border-border-subtle hover:bg-white/1.5 transition-colors',
      isShared && 'bg-warning/3',
    )}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={d.profiles?.name ?? '?'} src={d.profiles?.avatar_url ?? undefined} size="sm" />
          <span className="font-ui font-medium text-[13px] text-text-1">{d.profiles?.name ?? d.profile_id.slice(0, 8)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2 min-w-0">
          <Smartphone size={13} className="text-text-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-ui text-[12.5px] text-text-1 truncate">{d.device_name}</span>
              {isShared && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-warning/15 border border-warning/30 text-warning text-[10px] font-mono font-semibold uppercase tracking-wide shrink-0">
                  <AlertTriangle size={9} /> Shared
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-text-4 mt-0.5">{d.device_fingerprint.slice(0, 16)}…</p>
            {isShared && sharedWith.length > 0 && (
              <p className="font-ui text-[10.5px] text-warning/70 mt-0.5">
                Also used by: {sharedWith.join(', ')}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-text-3">{fmt(d.first_seen_at)}</td>
      <td className="px-4 py-3 font-mono text-[12px] text-text-3">{fmt(d.last_seen_at)}</td>
      <td className="px-4 py-3">
        {!d.approved_by && d.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xs bg-warning/10 border border-warning/30 text-warning text-[11px] font-ui font-semibold">
            <AlertCircle size={11} /> Pending
          </span>
        ) : d.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xs bg-success/10 border border-success/30 text-success text-[11px] font-ui font-semibold">
            <Check size={11} /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xs bg-error/10 border border-error/30 text-error text-[11px] font-ui font-semibold">
            <X size={11} /> Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {!d.approved_by && d.is_active && canApproveThis && (
            <button
              onClick={() => handleApprove(d.id)}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors"
            >
              <ThumbsUp size={12} /> Approve
            </button>
          )}
          {d.is_active && (
            <button
              onClick={() => handleDeactivate(d.id)}
              disabled={deactivateMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors"
            >
              <X size={12} /> Deactivate
            </button>
          )}
          {!d.is_active && canApproveThis && (
            <button
              onClick={() => handleReactivate(d.id)}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-service-dev/10 border border-service-dev/30 text-service-dev text-[11.5px] font-ui font-semibold hover:bg-service-dev/20 transition-colors"
            >
              <CheckCircle2 size={12} /> Reactivate
            </button>
          )}
          {!d.approved_by && d.is_active && !canApproveThis && (
            <span className="font-ui text-[11px] text-text-4 italic">
              {isHr && d.profile_id === profile?.id ? 'You can’t approve your own device' : 'Admin approval required'}
            </span>
          )}
        </div>
      </td>
    </tr>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',  value: pending.length,         icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',        value: approved.length,        icon: Shield,      color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Inactive',        value: inactive.length,        icon: Smartphone,  color: 'text-text-3',  bg: 'bg-surface-2 border-border-default' },
          { label: 'Shared Devices',  value: sharedDevicesCount,     icon: Users,       color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('size-10 rounded-lg border flex items-center justify-center shrink-0', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[26px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar
          icon={Smartphone}
          title="Enrolled Devices"
          badge={pending.length}
        />

        <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap lg:whitespace-normal">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-2">
              {['Employee', 'Device', 'First Seen', 'Last Seen', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">Loading…</td></tr>
            ) : devices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">No devices enrolled yet.</td></tr>
            ) : (
              devices.map((d) => <DeviceRow key={d.id} d={d} />)
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

/* ── Exception status chip ───────────────────────────────────────────────── */
const EXC_STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  rejected: { label: 'Rejected', cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
}

function ExcStatusChip({ status }: { status: string }) {
  const m = EXC_STATUS_META[status] ?? EXC_STATUS_META['pending']
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="size-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

/* ── Exceptions tab ───────────────────────────────────────────────────────── */
export function ExceptionsTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AttendanceExceptionWithProfile | null>(null)

  const filters = {
    type:   typeFilter   !== 'all' ? typeFilter   : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }

  const { data: exceptions = [], isLoading } = useAllAttendanceExceptions(filters)
  const reviewMutation = useReviewException()
  const deleteMut = useDeleteException()

  const pendingCount  = exceptions.filter((e) => e.status === 'pending').length
  const approvedCount = exceptions.filter((e) => e.status === 'approved').length
  const rejectedCount = exceptions.filter((e) => e.status === 'rejected').length

  const handleApprove = async (id: string) => {
    try {
      await reviewMutation.mutateAsync({ id, status: 'approved' })
      toast('Exception approved', 'success')
    } catch {
      toast('Failed to approve exception', 'error')
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    try {
      await reviewMutation.mutateAsync({ id: rejectTarget, status: 'rejected', note: rejectNote.trim() || undefined })
      toast('Exception rejected', 'error')
      setRejectTarget(null)
      setRejectNote('')
    } catch {
      toast('Failed to reject exception', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast('Exception deleted', 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete exception', 'error')
    }
  }

  const TYPE_META: Record<string, { label: string; cls: string }> = {
    late_arrival:    { label: 'Late Arrival',    cls: 'bg-warning/10 text-warning border-warning/25' },
    early_departure: { label: 'Early Departure', cls: 'bg-service-design/10 text-service-design border-service-design/25' },
    out_of_office:   { label: 'Out of Office',   cls: 'bg-service-dev/10 text-service-dev border-service-dev/25' },
  }

  const fmtTimeStr = (t: string | null) => t ? t.slice(0, 5) : '—'
  const fmtTs = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pendingCount,  icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',       value: approvedCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',       value: rejectedCount, icon: AlertTriangle, color: 'text-error',  bg: 'bg-error/10 border-error/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('size-10 rounded-lg border flex items-center justify-center shrink-0', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[26px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar icon={AlertCircle} title="Exception Requests">
          <Select
            size="sm"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all',              label: 'All Types' },
              { value: 'late_arrival',     label: 'Late Arrival' },
              { value: 'early_departure',  label: 'Early Departure' },
              { value: 'out_of_office',    label: 'Out of Office' },
            ]}
          />
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',      label: 'All Status' },
              { value: 'pending',  label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </SectionToolbar>

        <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap lg:whitespace-normal">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-2">
              {['Employee', 'Date', 'Type', 'Requested Time', 'Reason', 'Status', 'OOO Tracking', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">Loading…</td></tr>
            ) : exceptions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">No exception requests match this filter.</td></tr>
            ) : (
              exceptions.map((exc) => {
                const typeMeta = TYPE_META[exc.exception_type] ?? TYPE_META['late_arrival']
                const excWp = exc as AttendanceExceptionWithProfile
                return (
                  <tr key={exc.id} className="border-b border-border-subtle hover:bg-white/1.5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={excWp.profiles?.name ?? '?'} src={excWp.profiles?.avatar_url ?? undefined} size="sm" />
                        <span className="font-ui font-medium text-[13px] text-text-1">
                          {excWp.profiles?.name ?? exc.profile_id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">{fmtDate(exc.date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold whitespace-nowrap', typeMeta.cls)}>
                        {typeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-text-1 whitespace-nowrap">
                      {fmtTimeStr(exc.requested_time)}
                      {exc.return_time && (
                        <span className="text-text-4 ml-1">→ {fmtTimeStr(exc.return_time)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-ui text-[12px] text-text-2 max-w-40">
                      <span className="line-clamp-2">{exc.reason}</span>
                    </td>
                    <td className="px-4 py-3"><ExcStatusChip status={exc.status} /></td>
                    <td className="px-4 py-3">
                      {exc.exception_type === 'out_of_office' ? (
                        <div className="text-[11px] font-mono text-text-3 space-y-0.5">
                          <div>Out: {fmtTs(exc.actual_departure)}</div>
                          <div>Back: {fmtTs(exc.actual_return)}</div>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-text-4">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {exc.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(exc.id)}
                              disabled={reviewMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors"
                            >
                              <ThumbsUp size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(exc.id)}
                              disabled={reviewMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors"
                            >
                              <ThumbsDown size={12} /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="font-mono text-[11px] text-text-4">
                            {exc.reviewed_at
                              ? new Date(exc.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '—'}
                          </span>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteTarget(excWp)} className="ml-0.5 text-text-4 hover:text-error transition-colors" aria-label="Delete exception">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <ModalShell onClose={() => { setRejectTarget(null); setRejectNote('') }} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Reject Exception</h3>
              <button onClick={() => { setRejectTarget(null); setRejectNote('') }} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="font-ui text-[13px] text-text-3 mb-4">Provide a reason so the employee knows what to address.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              autoFocus
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
            />
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setRejectTarget(null); setRejectNote('') }}>Cancel</Button>
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                disabled={!rejectNote.trim() || reviewMutation.isPending}
                onClick={handleReject}
              >
                <X size={14} /> Reject
              </Button>
            </div>
        </ModalShell>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete exception request?"
        message={
          <>
            This permanently deletes the {(TYPE_META[deleteTarget?.exception_type ?? '']?.label ?? 'exception').toLowerCase()} request for{' '}
            <span className="font-semibold text-text-1">{deleteTarget?.profiles?.name ?? 'this employee'}</span>. This cannot be undone.
            {deleteTarget?.exception_type === 'out_of_office' && deleteTarget?.status === 'approved' && (
              <span className="block mt-2 text-[12px] text-warning">
                Note: any out-of-office minutes already excluded from their worked hours are not automatically restored.
              </span>
            )}
          </>
        }
        isPending={deleteMut.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

/* ── Holidays tab ─────────────────────────────────────────────────────────── */

const HOLIDAY_TYPE_META: Record<string, { label: string; cls: string; dot: string }> = {
  public_holiday: { label: 'Public Holiday', cls: 'bg-brand-red/10 text-brand-red border-brand-red/25',         dot: '#EE2737' },
  company_off:    { label: 'Company Off',     cls: 'bg-service-design/10 text-service-design border-service-design/25', dot: '#A78BFA' },
  optional:       { label: 'Optional',        cls: 'bg-service-dev/10 text-service-dev border-service-dev/25',   dot: '#22D3EE' },
}

/**
 * One consistent frame for each kind of scheduled day, so Holidays / Working
 * Saturdays / Company WFH read as three parallel concepts: what it is (icon +
 * title), what it means for staff (description), how many, and how to add one.
 */
function ScheduleSection({ icon: Icon, title, description, count, unit, action, children }: {
  icon: LucideIcon
  title: string
  description: string
  count: number
  unit: string
  action: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border-subtle bg-surface-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-surface-1 border border-border-default flex items-center justify-center shrink-0">
            <Icon size={16} className="text-text-3" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-[14px] text-text-1">{title}</h3>
              <span className="font-mono text-[11px] text-text-4">
                {count} {unit}{count !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="font-ui text-[12px] text-text-4 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {children}
    </section>
  )
}

function ScheduleEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-8 text-center font-ui text-[13px] text-text-4">{children}</div>
}

export function HolidaysTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'range'>('single')
  const [form, setForm] = useState({ date: '', dateTo: '', name: '', type: 'public_holiday' as 'public_holiday' | 'company_off' | 'optional' })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [satPickerOpen, setSatPickerOpen] = useState(false)
  const [satDate, setSatDate] = useState('')
  const [satNote, setSatNote] = useState('')
  const [satDeleteTarget, setSatDeleteTarget] = useState<string | null>(null)

  const [wfhOpen, setWfhOpen] = useState(false)
  const [wfhDate, setWfhDate] = useState('')
  const [wfhReason, setWfhReason] = useState('')
  const [wfhDeleteTarget, setWfhDeleteTarget] = useState<string | null>(null)

  const { data: holidays = [], isLoading } = useHolidays(year)
  const { data: workingSaturdays = [] } = useWorkingSaturdays(year)
  const { data: companyWfhDays = [] } = useCompanyWfhDays(year)
  const createMutation = useCreateHoliday()
  const createRangeMutation = useCreateHolidayRange()
  const deleteMutation = useDeleteHoliday()
  const addSatMutation = useAddWorkingSaturday()
  const removeSatMutation = useRemoveWorkingSaturday()
  const addWfhMutation = useAddCompanyWfhDay()
  const removeWfhMutation = useRemoveCompanyWfhDay()

  const handleAddWfhDay = async () => {
    if (!wfhDate || !wfhReason.trim() || !profile) return
    try {
      await addWfhMutation.mutateAsync({ date: wfhDate, reason: wfhReason.trim(), createdBy: profile.id })
      toast(
        `${new Date(wfhDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} set as a company WFH day — everyone's attendance marked`,
        'success',
      )
      setWfhOpen(false); setWfhDate(''); setWfhReason('')
    } catch (err) {
      toast(
        err instanceof Error && err.message.includes('duplicate')
          ? 'That date is already a company WFH day'
          : 'Failed to declare WFH day',
        'error',
      )
    }
  }

  const handleRemoveWfhDay = async (id: string) => {
    try {
      await removeWfhMutation.mutateAsync(id)
      toast('Company WFH day removed — attendance reverted', 'success')
      setWfhDeleteTarget(null)
    } catch {
      toast('Failed to remove WFH day', 'error')
    }
  }

  const handleAddSaturday = async () => {
    if (!satDate || !profile) return
    try {
      await addSatMutation.mutateAsync({ date: satDate, note: satNote.trim() || null, createdBy: profile.id })
      toast(`${new Date(satDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} marked as working day`, 'success')
      setSatPickerOpen(false)
      setSatDate('')
      setSatNote('')
    } catch {
      toast('Failed to add working Saturday', 'error')
    }
  }

  const handleRemoveSaturday = async (id: string) => {
    try {
      await removeSatMutation.mutateAsync(id)
      toast('Working Saturday removed', 'success')
      setSatDeleteTarget(null)
    } catch {
      toast('Failed to remove working Saturday', 'error')
    }
  }

  // Count days in selected range (inclusive)
  const rangeCount = (() => {
    if (addMode !== 'range' || !form.date || !form.dateTo) return 0
    const a = new Date(form.date + 'T00:00:00')
    const b = new Date(form.dateTo + 'T00:00:00')
    if (b < a) return 0
    return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  })()

  const isSaving = createMutation.isPending || createRangeMutation.isPending

  const isAddDisabled = (() => {
    if (!form.name.trim() || !profile || isSaving) return true
    if (addMode === 'single') return !form.date
    return !form.date || !form.dateTo || rangeCount < 1
  })()

  const handleAdd = async () => {
    if (isAddDisabled) return
    const name = form.name.trim()
    try {
      if (addMode === 'single') {
        await createMutation.mutateAsync({ payload: { date: form.date, name, type: form.type }, createdBy: profile!.id })
        toast(`"${name}" added — attendance records updated`, 'success')
      } else {
        await createRangeMutation.mutateAsync({ startDate: form.date, endDate: form.dateTo, name, type: form.type, createdBy: profile!.id })
        toast(`${rangeCount} holiday days added for "${name}"`, 'success')
      }
      setAddOpen(false)
      setForm({ date: '', dateTo: '', name: '', type: 'public_holiday' })
      setAddMode('single')
    } catch {
      toast('Failed to add holiday', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast('Holiday removed', 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to remove holiday', 'error')
    }
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Group by month for display
  const byMonth = MONTH_NAMES.map((m, i) => ({
    month: m,
    items: holidays.filter((h) => new Date(h.date + 'T00:00:00').getMonth() === i),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-5">

      {/* Year navigator — scopes all three sections below */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodStepper
          icon={Calendar}
          label={String(year)}
          onPrev={() => setYear((y) => y - 1)}
          onNext={() => setYear((y) => y + 1)}
        />
        <p className="font-mono text-[11.5px] text-text-4">
          {holidays.length} holiday{holidays.length !== 1 ? 's' : ''}
          {' · '}{workingSaturdays.length} working Saturday{workingSaturdays.length !== 1 ? 's' : ''}
          {' · '}{companyWfhDays.length} WFH day{companyWfhDays.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── 1. Holidays — days off ───────────────────────────────────────────── */}
      <ScheduleSection
        icon={Palmtree}
        title="Holidays"
        description=""
        count={holidays.length}
        unit="day"
        action={
          <Button
            size="sm"
            onClick={() => { setAddOpen(true); setAddMode('single'); setForm({ date: '', dateTo: '', name: '', type: 'public_holiday' }) }}
          >
            <Plus size={14} /> Add Holiday
          </Button>
        }
      >
        {/* Type legend */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border-subtle">
          {Object.entries(HOLIDAY_TYPE_META).map(([k, v]) => (
            <span key={k} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', v.cls)}>
              <span className="size-1.5 rounded-full" style={{ background: v.dot }} />
              {v.label}
            </span>
          ))}
        </div>

        {isLoading ? (
          <ScheduleEmpty>Loading…</ScheduleEmpty>
        ) : holidays.length === 0 ? (
          <ScheduleEmpty>No holidays added for {year} yet.</ScheduleEmpty>
        ) : (
          <div>
            {byMonth.map(({ month, items }) => (
              <div key={month}>
                <div className="px-5 py-2 bg-surface-2/60 border-b border-border-subtle flex items-center gap-2">
                  <span className="font-display font-semibold text-[12px] text-text-2">{month} {year}</span>
                  <span className="font-mono text-[10.5px] text-text-4">{items.length}</span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {items.map((h) => {
                    const meta = HOLIDAY_TYPE_META[h.type] ?? HOLIDAY_TYPE_META['public_holiday']
                    return (
                      <div key={h.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/1.5 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-ui font-semibold text-[13px] text-text-1 truncate">{h.name}</p>
                          <p className="font-mono text-[11px] text-text-4 mt-0.5">{fmtDate(h.date)}</p>
                        </div>
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border shrink-0', meta.cls)}>
                          <span className="size-1.5 rounded-full" style={{ background: meta.dot }} />
                          {meta.label}
                        </span>
                        <button
                          onClick={() => setDeleteTarget(h.id)}
                          title="Remove holiday"
                          className="text-text-4 hover:text-error transition-colors p-1.5 rounded-sm hover:bg-error/10 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScheduleSection>

      {/* Add holiday modal */}
      {addOpen && (
        <ModalShell onClose={() => setAddOpen(false)} size="md" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">Add Holiday</h3>
              <button onClick={() => setAddOpen(false)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>

            {/* Single / Range toggle */}
            <div className="flex items-center gap-1 p-1 bg-surface-inset border border-border-default rounded-md mb-4">
              {(['single', 'range'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setAddMode(m); setForm((f) => ({ ...f, date: '', dateTo: '' })) }}
                  className={cn(
                    'flex-1 py-1.5 rounded-sm text-[12px] font-ui font-semibold transition-colors',
                    addMode === m
                      ? 'bg-surface-2 text-text-1 shadow-sm'
                      : 'text-text-4 hover:text-text-2',
                  )}
                >
                  {m === 'single' ? 'Single Date' : 'Date Range'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Date field(s) */}
              {addMode === 'single' ? (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
                  <DatePicker value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} placeholder="Select date…" />
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">From</label>
                    <DatePicker
                      value={form.date}
                      onChange={(v) => setForm((f) => ({ ...f, date: v, dateTo: f.dateTo && f.dateTo < v ? '' : f.dateTo }))}
                      placeholder="Start date…"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">To</label>
                    <DatePicker
                      value={form.dateTo}
                      onChange={(v) => setForm((f) => ({ ...f, dateTo: v }))}
                      minDate={form.date || undefined}
                      placeholder="End date…"
                    />
                  </div>
                </div>
              )}

              {/* Range preview */}
              {addMode === 'range' && rangeCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border-default rounded-md">
                  <Calendar size={12} className="text-text-4 shrink-0" />
                  <span className="font-mono text-[12px] text-text-2">
                    <span className="text-text-1 font-semibold">{rangeCount}</span> day{rangeCount !== 1 ? 's' : ''}
                    {' '}— {new Date(form.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {' '}to {new Date(form.dateTo + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Eid ul-Fitr, Independence Day…"
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Type</label>
                <Select
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v as typeof form.type }))}
                  options={[
                    { value: 'public_holiday', label: 'Public Holiday' },
                    { value: 'company_off',    label: 'Company Off' },
                    { value: 'optional',       label: 'Optional' },
                  ]}
                />
                <p className="text-[11px] font-ui text-text-4 mt-1.5">
                  {form.type === 'public_holiday' && 'National / government holiday — all employees off.'}
                  {form.type === 'company_off'    && 'Company-wide day off (team outing, shutdown, etc.).'}
                  {form.type === 'optional'       && 'Optional — employees may choose to take it off.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={isAddDisabled}
                onClick={handleAdd}
              >
                <Check size={14} /> {addMode === 'range' ? `Save ${rangeCount > 0 ? rangeCount + ' Days' : 'Range'}` : 'Save Holiday'}
              </Button>
            </div>
        </ModalShell>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ModalShell onClose={() => setDeleteTarget(null)} size="sm" contentClassName="p-5 sm:p-6">
            <h3 className="font-display font-bold text-[16px] text-text-1 mb-2">Remove Holiday?</h3>
            <p className="font-ui text-[13px] text-text-3 mb-5">
              This will remove the holiday. Attendance records already flipped to "holiday" status will not be automatically reverted.
            </p>
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={deleteMutation.isPending} onClick={() => handleDelete(deleteTarget)}>
                <X size={14} /> Remove
              </Button>
            </div>
        </ModalShell>
      )}

      {/* ── 2. Working Saturdays — extra working days ────────────────────────── */}
      <ScheduleSection
        icon={Calendar}
        title="Working Saturdays"
        description=""
        count={workingSaturdays.length}
        unit="Saturday"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setSatPickerOpen(true); setSatDate(''); setSatNote('') }}
          >
            <Plus size={13} /> Mark Saturday
          </Button>
        }
      >
        {workingSaturdays.length === 0 ? (
          <ScheduleEmpty>No working Saturdays for {year}.</ScheduleEmpty>
        ) : (
          <div className="divide-y divide-border-subtle">
            {workingSaturdays.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/1.5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-ui font-semibold text-[13px] text-text-1">
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  {s.note && <p className="font-ui text-[11px] text-text-4 mt-0.5">{s.note}</p>}
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold bg-success/10 text-success border border-success/25 shrink-0">
                  Working Day
                </span>
                <button
                  onClick={() => setSatDeleteTarget(s.id)}
                  title="Remove working Saturday"
                  className="text-text-4 hover:text-error transition-colors p-1.5 rounded-sm hover:bg-error/10 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScheduleSection>

      {/* ── 3. Company WFH days — working, but from home ─────────────────────── */}
      <ScheduleSection
        icon={Home}
        title="Company WFH Days"
        description=""
        count={companyWfhDays.length}
        unit="day"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setWfhOpen(true); setWfhDate(''); setWfhReason('') }}
          >
            <Plus size={13} /> Declare WFH Day
          </Button>
        }
      >
        {companyWfhDays.length === 0 ? (
          <ScheduleEmpty>
            No company WFH days for {year}. Declare one when the office can't be used — a power cut, flooding, or similar.
          </ScheduleEmpty>
        ) : (
          <div className="divide-y divide-border-subtle">
            {companyWfhDays.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/1.5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-ui font-semibold text-[13px] text-text-1">{fmtDate(d.date)}</p>
                  <p className="font-ui text-[11px] text-text-4 mt-0.5 truncate">{d.reason}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold bg-service-dev/10 text-service-dev border border-service-dev/25 shrink-0">
                  Work From Home
                </span>
                <button
                  onClick={() => setWfhDeleteTarget(d.id)}
                  title="Remove company WFH day"
                  className="text-text-4 hover:text-error transition-colors p-1.5 rounded-sm hover:bg-error/10 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScheduleSection>

      {/* Add working Saturday modal */}
      {satPickerOpen && (
        <ModalShell onClose={() => setSatPickerOpen(false)} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">Mark Working Saturday</h3>
              <button onClick={() => setSatPickerOpen(false)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Saturday Date</label>
                <DatePicker
                  value={satDate}
                  onChange={setSatDate}
                  allowedDow={[6]}
                  placeholder="Pick a Saturday…"
                />
                <p className="text-[11px] font-ui text-text-4 mt-1.5">Only Saturdays are selectable.</p>
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
                  Note <span className="normal-case font-ui text-text-4">(optional)</span>
                </label>
                <input
                  value={satNote}
                  onChange={(e) => setSatNote(e.target.value)}
                  placeholder="e.g. Compensating for Eid holiday…"
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSatPickerOpen(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" disabled={!satDate || addSatMutation.isPending} onClick={handleAddSaturday}>
                <Check size={14} /> Save
              </Button>
            </div>
        </ModalShell>
      )}

      {/* Remove working Saturday confirm */}
      {satDeleteTarget && (
        <ModalShell onClose={() => setSatDeleteTarget(null)} size="sm" contentClassName="p-5 sm:p-6">
            <h3 className="font-display font-bold text-[16px] text-text-1 mb-2">Remove Working Saturday?</h3>
            <p className="font-ui text-[13px] text-text-3 mb-5">This Saturday will revert to a regular weekend day.</p>
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSatDeleteTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={removeSatMutation.isPending} onClick={() => handleRemoveSaturday(satDeleteTarget)}>
                <X size={14} /> Remove
              </Button>
            </div>
        </ModalShell>
      )}

      {/* Declare company WFH day modal */}
      {wfhOpen && (
        <ModalShell onClose={() => setWfhOpen(false)} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">Declare Company WFH Day</h3>
              <button onClick={() => setWfhOpen(false)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
                <DatePicker value={wfhDate} onChange={setWfhDate} placeholder="Pick a date…" />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
                <input
                  value={wfhReason}
                  onChange={(e) => setWfhReason(e.target.value)}
                  placeholder="e.g. Office power outage…"
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                />
              </div>
              <div className="flex items-start gap-2 px-3 py-2 bg-service-dev/8 border border-service-dev/20 rounded-md">
                <Home size={13} className="text-service-dev shrink-0 mt-0.5" />
                <p className="font-ui text-[11.5px] text-text-3">
                  Everyone's attendance for this date is marked <span className="text-service-dev font-semibold">WFH</span>, so no office check-in is needed.
                  Anyone already checked in, or on approved leave, is left as-is.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setWfhOpen(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" disabled={!wfhDate || !wfhReason.trim() || addWfhMutation.isPending} onClick={handleAddWfhDay}>
                <Check size={14} /> Declare
              </Button>
            </div>
        </ModalShell>
      )}

      {/* Remove company WFH day confirm */}
      {wfhDeleteTarget && (
        <ModalShell onClose={() => setWfhDeleteTarget(null)} size="sm" contentClassName="p-5 sm:p-6">
            <h3 className="font-display font-bold text-[16px] text-text-1 mb-2">Remove Company WFH Day?</h3>
            <p className="font-ui text-[13px] text-text-3 mb-5">
              The day goes back to a normal in-office working day and the WFH marks added by it are removed.
              Individually approved WFH for that date is kept.
            </p>
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setWfhDeleteTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={removeWfhMutation.isPending} onClick={() => handleRemoveWfhDay(wfhDeleteTarget)}>
                <X size={14} /> Remove
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ── Overtime tab ─────────────────────────────────────────────────────────── */

const OT_STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  rejected: { label: 'Rejected', cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
}

export function OvertimeTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [allMonths, setAllMonths] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: requests = [], isLoading } = useAllOvertimeRequests(
    statusFilter !== 'all' ? statusFilter : undefined,
  )
  const reviewMutation = useReviewOvertime()
  const deleteMut = useDeleteOvertime()

  // Overtime rows carry a `date` (YYYY-MM-DD), so scope the list to the selected
  // month client-side — the summary cards and table then reflect that month
  // without an extra query. "All months" falls back to the full list.
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const scoped = allMonths ? requests : requests.filter((r) => r.date.startsWith(monthPrefix))

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const pending  = scoped.filter((r) => r.status === 'pending').length
  const approved = scoped.filter((r) => r.status === 'approved').length
  const rejected = scoped.filter((r) => r.status === 'rejected').length

  const totalApprovedHours = scoped
    .filter((r) => r.status === 'approved')
    .reduce((acc, r) => acc + r.hours, 0)

  const handleApprove = async (id: string) => {
    if (!profile) return
    try {
      await reviewMutation.mutateAsync({ id, status: 'approved', reviewedBy: profile.id })
      toast('Overtime approved', 'success')
    } catch {
      toast('Failed to approve overtime', 'error')
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !profile) return
    try {
      await reviewMutation.mutateAsync({ id: rejectTarget, status: 'rejected', reviewedBy: profile.id, reviewNote: rejectNote.trim() || undefined })
      toast('Overtime rejected', 'error')
      setRejectTarget(null)
      setRejectNote('')
    } catch {
      toast('Failed to reject overtime', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast('Overtime request deleted', 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete overtime request', 'error')
    }
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',   value: pending,                              icon: Clock,        color: 'text-warning',      bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',         value: approved,                             icon: CheckCircle2, color: 'text-success',      bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',         value: rejected,                             icon: AlertTriangle,color: 'text-error',        bg: 'bg-error/10 border-error/20' },
          { label: 'Approved Hours',   value: `${totalApprovedHours.toFixed(1)}h`,  icon: Star,         color: 'text-service-mkt',  bg: 'bg-service-mkt/10 border-service-mkt/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('size-10 rounded-lg border flex items-center justify-center shrink-0', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[22px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <SectionToolbar icon={Hourglass} title="Overtime Requests" badge={pending}>
          <PeriodStepper
            icon={Calendar}
            label={allMonths ? 'All months' : `${MONTH_NAMES[month - 1]} ${year}`}
            onPrev={prevMonth}
            onNext={nextMonth}
            disablePrev={allMonths}
            disableNext={allMonths || isCurrentMonth}
            className={cn(allMonths && 'opacity-50')}
          >
            {!allMonths && isCurrentMonth && (
              <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
                Current
              </span>
            )}
          </PeriodStepper>
          <button
            type="button"
            onClick={() => setAllMonths((v) => !v)}
            aria-pressed={allMonths}
            className={cn(
              'h-8 px-3 rounded-sm border font-ui font-semibold text-[12px] transition-colors shrink-0',
              allMonths
                ? 'bg-brand-red/10 border-brand-red/30 text-brand-red'
                : 'bg-surface-1 border-border-default text-text-3 hover:text-text-1 hover:border-border-strong',
            )}
          >
            All months
          </button>
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',      label: 'All Status' },
              { value: 'pending',  label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </SectionToolbar>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 font-mono text-[12px] text-text-4">
            <span className="size-4 border-2 border-text-4 border-t-brand-red rounded-full animate-spin" /> Loading…
          </div>
        ) : scoped.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">
            No overtime requests {allMonths ? 'match this filter' : `for ${MONTH_NAMES[month - 1]} ${year}`}.
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                {['Employee', 'Date', 'Time', 'Hours', 'Reason', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scoped.map((req) => {
                const meta = OT_STATUS_META[req.status] ?? OT_STATUS_META['pending']
                const r = req as typeof req & { profiles?: { name: string; avatar_url: string | null } | null }
                return (
                  <tr key={req.id} className="border-b border-border-subtle hover:bg-white/1.5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.profiles?.name ?? '?'} src={r.profiles?.avatar_url ?? undefined} size="sm" />
                        <span className="font-ui font-medium text-[13px] text-text-1">{r.profiles?.name ?? req.profile_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">{fmtDate(req.date)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-text-1 whitespace-nowrap">
                      {fmtTime(req.start_time)} – {fmtTime(req.end_time)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-display font-bold text-[15px] text-service-mkt">{req.hours}h</span>
                    </td>
                    <td className="px-4 py-3 font-ui text-[12px] text-text-2 max-w-50">
                      <span className="line-clamp-2">{req.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', meta.cls)}>
                        <span className="size-1.5 rounded-full" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                      {req.review_note && (
                        <p className="font-ui text-[10.5px] text-text-4 mt-0.5 max-w-40 truncate italic">"{req.review_note}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={reviewMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors"
                            >
                              <ThumbsUp size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(req.id)}
                              disabled={reviewMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors"
                            >
                              <ThumbsDown size={12} /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="font-mono text-[11px] text-text-4">
                            {req.reviewed_at
                              ? new Date(req.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '—'}
                          </span>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteTarget({ id: req.id, name: r.profiles?.name ?? 'this employee' })} className="ml-0.5 text-text-4 hover:text-error transition-colors" aria-label="Delete overtime request">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden flex flex-col">
            {scoped.map((req) => {
              const meta = OT_STATUS_META[req.status] ?? OT_STATUS_META['pending']
              const r = req as typeof req & { profiles?: { name: string; avatar_url: string | null } | null }
              return (
                <div key={req.id} className="px-4 py-3.5 border-b border-border-subtle last:border-0 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={r.profiles?.name ?? '?'} src={r.profiles?.avatar_url ?? undefined} size="sm" />
                      <span className="font-ui font-medium text-[13px] text-text-1 truncate">{r.profiles?.name ?? req.profile_id.slice(0, 8)}</span>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border shrink-0', meta.cls)}>
                      <span className="size-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-text-2 pl-10.5">
                    <span className="text-text-1">{fmtDate(req.date)}</span>
                    <span>{fmtTime(req.start_time)} – {fmtTime(req.end_time)}</span>
                    <span className="font-display font-bold text-service-mkt">{req.hours}h</span>
                  </div>
                  {req.reason && <p className="font-ui text-[12px] text-text-3 pl-10.5">{req.reason}</p>}
                  {req.review_note && <p className="font-ui text-[11px] text-text-4 pl-10.5 italic">"{req.review_note}"</p>}
                  <div className="flex items-center gap-1.5 pl-10.5">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-success/10 border border-success/30 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 transition-colors"
                        >
                          <ThumbsUp size={12} /> Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(req.id)}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-error/10 border border-error/30 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 transition-colors"
                        >
                          <ThumbsDown size={12} /> Reject
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[11px] text-text-4">
                        Reviewed {req.reviewed_at
                          ? new Date(req.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                    )}
                    {isAdmin && (
                      <button onClick={() => setDeleteTarget({ id: req.id, name: r.profiles?.name ?? 'this employee' })} className="ml-auto text-text-4 hover:text-error transition-colors" aria-label="Delete overtime request">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <ModalShell onClose={() => { setRejectTarget(null); setRejectNote('') }} size="sm" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Reject Overtime</h3>
              <button onClick={() => { setRejectTarget(null); setRejectNote('') }} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="font-ui text-[13px] text-text-3 mb-4">Provide an optional reason so the employee understands the decision.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              autoFocus
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
            />
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setRejectTarget(null); setRejectNote('') }}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={reviewMutation.isPending} onClick={handleReject}>
                <X size={14} /> Reject
              </Button>
            </div>
        </ModalShell>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete overtime request?"
        message={
          <>
            This permanently deletes the overtime request for{' '}
            <span className="font-semibold text-text-1">{deleteTarget?.name}</span>. This cannot be undone.
          </>
        }
        isPending={deleteMut.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

/* ── Reports tab ──────────────────────────────────────────────────────────── */

interface EmployeeStat {
  profileId: string
  name: string
  avatar: string | null
  present: number
  late: number
  absent: number
  halfDay: number
  leave: number
  holiday: number
  totalCheckins: number   // rows with check_in != null
  totalMinutes: number    // sum of session durations (office hours, OOO time excluded)
  overtimeMinutes: number // approved overtime for the month
  earlyCount: number      // check_in before work_start
  onTimeCount: number     // check_in within grace
  avgCheckinMin: number   // average check_in minutes-since-midnight
  expectedMin: number     // required minutes over elapsed working days
  workedMin: number       // real worked minutes (capped + OT − excluded)
  overtimeMin: number     // minutes worked beyond work_end (past buffer)
  netMin: number          // workedMin − expectedMin (− = owed make-up)
}

function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function fmtMinutes(mins: number): string {
  if (!isFinite(mins)) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

function fmtTime(mins: number): string {
  if (!isFinite(mins)) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// Signed hours (e.g. "+2h 0m" surplus, "−1h 30m" owed make-up).
function fmtNet(mins: number): string {
  const rounded = Math.round(mins)
  if (rounded === 0) return '0h 0m'
  const sign = rounded > 0 ? '+' : '−'
  return `${sign}${fmtMinutes(Math.abs(rounded))}`
}

interface SortThProps {
  label: string
  col: keyof EmployeeStat
  sortKey: keyof EmployeeStat
  sortAsc: boolean
  onSort: (col: keyof EmployeeStat) => void
}

function SortTh({ label, col, sortKey, sortAsc, onSort }: SortThProps) {
  return (
    <th
      onClick={() => onSort(col)}
      className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider cursor-pointer select-none hover:text-text-1 transition-colors whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === col
          ? sortAsc
            ? <TrendingUp size={10} className="text-brand-red" />
            : <TrendingDown size={10} className="text-brand-red" />
          : <Minus size={10} className="text-text-4" />
        }
      </span>
    </th>
  )
}

export function ReportsTab() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [sortKey, setSortKey] = useState<keyof EmployeeStat>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: records = [], isLoading } = useMonthlyAttendance(year, month)
  const { data: settings } = useAttendanceSettings()
  const { data: activeProfiles = [] } = useActiveProfiles()
  const { data: holidays = [] } = useHolidays(year)
  const { data: workingSaturdays = [] } = useWorkingSaturdays(year)
  const { data: halfDayLeaves = [] } = useMonthlyHalfDayLeaves(year, month)
  const { data: monthlyOvertime = [] } = useMonthlyOvertime(year, month)

  const hhmmToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const workStartMin = settings ? hhmmToMin(settings.work_start_time) : 9 * 60
  const workEndMin   = settings ? hhmmToMin(settings.work_end_time) : 17 * 60
  const checkoutBufferMin = settings?.checkout_buffer_min ?? 30
  const graceMin = settings?.grace_period_min ?? 15
  const tz = settings?.timezone ?? 'Asia/Karachi'
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)

  // Half-day leave dates grouped by employee (forces half credit even when the
  // attendance row stayed 'present' because the employee checked in pre-approval).
  const halfDayByProfile = (() => {
    const map = new Map<string, Set<string>>()
    for (const h of halfDayLeaves) {
      if (!map.has(h.profileId)) map.set(h.profileId, new Set())
      map.get(h.profileId)!.add(h.date)
    }
    return map
  })()

  // Reusable working-day test for the hours engine.
  const isWorkingDay = (() => {
    const holidaySet = new Set(holidays.map((h) => h.date))
    const workingSatSet = new Set(workingSaturdays.map((s) => s.date))
    return (dateStr: string): boolean => {
      const [yy, mm, dd] = dateStr.split('-').map(Number)
      const dow = new Date(yy, mm - 1, dd).getDay()
      if (dow === 0) return false
      if (dow === 6 && !settings?.saturday_working && !workingSatSet.has(dateStr)) return false
      if (holidaySet.has(dateStr)) return false
      return true
    }
  })()

  // Compute working days for the entire month (for the header count + totalExpected)
  const workingDays = (() => {
    const holidaySet = new Set(holidays.map((h) => h.date))
    const workingSatSet = new Set(workingSaturdays.map((s) => s.date))
    const last = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= last; d++) {
      const dow = new Date(year, month - 1, d).getDay()
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (dow === 0) continue
      if (dow === 6 && !settings?.saturday_working && !workingSatSet.has(dateStr)) continue
      if (holidaySet.has(dateStr)) continue
      count++
    }
    return count
  })()

  // Working days that have already passed (used for absent calculation)
  const pastWorkingDaySet = (() => {
    const set = new Set<string>()
    const holidaySet = new Set(holidays.map((h) => h.date))
    const workingSatSet = new Set(workingSaturdays.map((s) => s.date))
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const last = new Date(year, month, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (dateStr >= todayStr) break
      const dow = new Date(year, month - 1, d).getDay()
      if (dow === 0) continue
      if (dow === 6 && !settings?.saturday_working && !workingSatSet.has(dateStr)) continue
      if (holidaySet.has(dateStr)) continue
      set.add(dateStr)
    }
    return set
  })()

  // Seed statsMap with every active employee so those with zero records still appear
  const statsMap = new Map<string, EmployeeStat>()
  for (const p of activeProfiles) {
    statsMap.set(p.id, {
      profileId: p.id, name: p.name, avatar: p.avatar_url ?? null,
      present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0,
      totalCheckins: 0, totalMinutes: 0, overtimeMinutes: 0, earlyCount: 0, onTimeCount: 0, avgCheckinMin: 0,
      expectedMin: 0, workedMin: 0, overtimeMin: 0, netMin: 0,
    })
  }

  // Track which dates each employee has any record (to detect missing days)
  const recordDates = new Map<string, Set<string>>()

  for (const rec of records) {
    const id   = rec.profile_id
    const name = rec.profiles?.name ?? rec.profile_id.slice(0, 8)

    // Ensure HR-marked employees that aren't in activeProfiles still show up
    if (!statsMap.has(id)) {
      statsMap.set(id, {
        profileId: id, name, avatar: rec.profiles?.avatar_url ?? null,
        present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0,
        totalCheckins: 0, totalMinutes: 0, overtimeMinutes: 0, earlyCount: 0, onTimeCount: 0, avgCheckinMin: 0,
        expectedMin: 0, workedMin: 0, overtimeMin: 0, netMin: 0,
      })
    }

    if (!recordDates.has(id)) recordDates.set(id, new Set())
    recordDates.get(id)!.add(rec.date)

    const s = statsMap.get(id)!
    switch (rec.status) {
      case 'present':  s.present++;  break
      case 'late':     s.late++;     break
      case 'absent':   s.absent++;   break
      case 'half_day': s.halfDay++;  break
      case 'leave':    s.leave++;    break
      case 'holiday':  s.holiday++;  break
    }

    if (rec.check_in) {
      const checkinMin = minutesSinceMidnight(rec.check_in)
      s.avgCheckinMin = (s.avgCheckinMin * s.totalCheckins + checkinMin) / (s.totalCheckins + 1)
      s.totalCheckins++
      if (checkinMin < workStartMin) s.earlyCount++
      else if (checkinMin <= workStartMin + graceMin) s.onTimeCount++
    }

    if (rec.check_in && rec.check_out) {
      // Office hours = worked span minus any out-of-office time recorded for the day.
      const diff = (new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000
        - (rec.excluded_minutes ?? 0)
      if (diff > 0) s.totalMinutes += diff
    }
  }

  // Absent = past working days with no attendance record at all
  for (const [profileId, s] of statsMap) {
    const empDates = recordDates.get(profileId)
    for (const dateStr of pastWorkingDaySet) {
      if (!empDates?.has(dateStr)) s.absent++
    }
  }

  // Fold approved overtime (logged in hours) into each employee's stats.
  for (const ot of monthlyOvertime) {
    const s = statsMap.get(ot.profile_id)
    if (s) s.overtimeMinutes += Math.round((ot.hours ?? 0) * 60)
  }

  // Monthly hours per employee (expected vs worked + overtime + net make-up).
  const recordsByProfile = new Map<string, typeof records>()
  for (const rec of records) {
    if (!recordsByProfile.has(rec.profile_id)) recordsByProfile.set(rec.profile_id, [])
    recordsByProfile.get(rec.profile_id)!.push(rec)
  }
  const toLocalMinutes = (iso: string) => isoToZonedMinutes(iso, tz)
  const emptyDates = new Set<string>()
  for (const [profileId, s] of statsMap) {
    const empRecords = (recordsByProfile.get(profileId) ?? []).map((r) => ({
      date: r.date, status: r.status, check_in: r.check_in, check_out: r.check_out,
      excluded_minutes: r.excluded_minutes,
    }))
    const h = computeEmployeeHours({
      records: empRecords,
      year, month,
      settings: { workStartMin, workEndMin, checkoutBufferMin },
      isWorkingDay,
      halfDayDates: halfDayByProfile.get(profileId) ?? emptyDates,
      todayStr,
      toLocalMinutes,
    })
    s.expectedMin  = h.expectedMin
    s.workedMin    = h.workedMin
    s.overtimeMin  = h.overtimeMin
    s.netMin       = h.netMin
  }

  const employeeStats = [...statsMap.values()]

  // Summary across all employees
  const totalPresent  = employeeStats.reduce((a, s) => a + s.present + s.late, 0)
  const totalAbsent   = employeeStats.reduce((a, s) => a + s.absent, 0)
  const totalLate     = employeeStats.reduce((a, s) => a + s.late, 0)
  const totalLeave    = employeeStats.reduce((a, s) => a + s.leave, 0)
  const totalExpected = employeeStats.length * workingDays
  const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0
  const onTimeRate     = totalPresent  > 0
    ? Math.round(((totalPresent - totalLate) / totalPresent) * 100)
    : 0

  // Sort
  const sorted = [...employeeStats].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const handleSort = (key: keyof EmployeeStat) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) } // default desc for numeric cols
  }

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
    setExpandedId(null)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
    setExpandedId(null)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <div className="flex flex-col gap-5">

      {/* Month navigator */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodStepper
          icon={Calendar}
          label={`${MONTH_NAMES[month - 1]} ${year}`}
          onPrev={prevMonth}
          onNext={nextMonth}
          disableNext={isCurrentMonth}
        >
          {isCurrentMonth && (
            <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
              Current
            </span>
          )}
        </PeriodStepper>
        <span className="font-ui text-[12px] text-text-4">
          {workingDays} working days · {employeeStats.length} employees
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          onClick={() => downloadCsv(
            `attendance-${year}-${String(month).padStart(2, '0')}`,
            ['Employee', 'Present', 'Late', 'Absent', 'Half Day', 'Leave', 'Avg Check-in', 'Avg Office Hours', 'Total Office Hours', 'Approved OT (h)', 'Expected', 'Worked', 'Overtime', 'Net', 'On-Time %'],
            sorted.map((s) => [
              s.name,
              s.present, s.late, s.absent, s.halfDay, s.leave,
              fmtTime(s.avgCheckinMin),
              fmtMinutes(s.totalCheckins > 0 ? s.totalMinutes / s.totalCheckins : NaN),
              fmtMinutes(s.totalMinutes),
              (s.overtimeMinutes / 60).toFixed(2),
              fmtMinutes(s.expectedMin),
              fmtMinutes(s.workedMin),
              fmtMinutes(s.overtimeMin),
              fmtNet(s.netMin),
              s.present + s.late > 0 ? Math.round(((s.present - s.late + s.earlyCount + s.onTimeCount) / (s.present + s.late)) * 100) : 0,
            ]),
          )}
        >
          <Download size={13} /> Export CSV
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: BarChart2,    color: attendanceRate >= 80 ? 'text-success' : attendanceRate >= 60 ? 'text-warning' : 'text-error', bg: attendanceRate >= 80 ? 'bg-success/10 border-success/20' : attendanceRate >= 60 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20' },
          { label: 'On-Time Rate',    value: `${onTimeRate}%`,    icon: CheckCircle2, color: onTimeRate >= 80 ? 'text-success' : onTimeRate >= 60 ? 'text-warning' : 'text-error', bg: onTimeRate >= 80 ? 'bg-success/10 border-success/20' : onTimeRate >= 60 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20' },
          { label: 'Late Check-ins',  value: totalLate,           icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Absences',        value: totalAbsent,         icon: AlertTriangle,color: 'text-error',   bg: 'bg-error/10 border-error/20' },
          { label: 'Leaves',          value: totalLeave,          icon: Home,         color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-3">
            <div className={cn('size-10 rounded-lg border flex items-center justify-center shrink-0', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[22px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[11.5px] text-text-3 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-employee breakdown table */}
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <Users size={14} className="text-text-3" />
          <span className="font-ui font-semibold text-[13px] text-text-1">Employee Breakdown</span>
          {/* <span className="font-mono text-[11px] text-text-4">Click column headers to sort · Click row to expand daily log</span> */}
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-text-4 font-mono text-[12px]">
            <span className="size-4 border-2 border-text-4 border-t-brand-red rounded-full animate-spin" /> Loading…
          </div>
        ) : employeeStats.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">
            No attendance records for {MONTH_NAMES[month - 1]} {year}.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap lg:whitespace-normal">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                <SortTh label="Employee"     col="name"         sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Present"      col="present"      sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Late"         col="late"         sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Absent"       col="absent"       sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Half Day"     col="halfDay"      sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Leave"        col="leave"        sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Avg Check-in" col="avgCheckinMin" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Office Hrs"   col="totalMinutes" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Approved OT"  col="overtimeMinutes" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Expected"     col="expectedMin"  sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Worked"       col="workedMin"    sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Overtime"     col="overtimeMin"  sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Net"          col="netMin"       sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Early"        col="earlyCount"   sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="On-Time %"    col="onTimeCount"  sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const totalDays   = s.present + s.late
                const onTimeTotal = s.earlyCount + s.onTimeCount
                const onTimePct   = totalDays > 0 ? Math.round((onTimeTotal / totalDays) * 100) : 0
                const latePct     = totalDays > 0 ? Math.round((s.late / totalDays) * 100) : 0
                const avgHours    = s.totalCheckins > 0 ? s.totalMinutes / s.totalCheckins : NaN
                const isExpanded  = expandedId === s.profileId
                const dayRecords  = records
                  .filter((r) => r.profile_id === s.profileId)
                  .sort((a, b) => a.date.localeCompare(b.date))

                return (
                  <React.Fragment key={s.profileId}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : s.profileId)}
                      className="border-b border-border-subtle hover:bg-white/2 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} src={s.avatar ?? undefined} size="sm" />
                          <span className="font-ui font-medium text-[13px] text-text-1">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-display font-bold text-[15px] text-success">{s.present}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold text-[15px] text-warning">{s.late}</span>
                          {latePct > 0 && (
                            <span className="font-mono text-[10px] text-text-4">({latePct}%)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-display font-bold text-[15px] text-error">{s.absent}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-service-design">{s.halfDay || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-service-dev">{s.leave || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-2">{s.totalCheckins > 0 ? fmtTime(s.avgCheckinMin) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-2" title={`Avg ${fmtMinutes(avgHours)}/day`}>
                        {s.totalMinutes > 0 ? fmtMinutes(s.totalMinutes) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-service-mkt">
                        {s.overtimeMinutes > 0 ? `+${(s.overtimeMinutes / 60).toFixed(1)}h` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-3">{fmtMinutes(s.expectedMin)}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-1">{fmtMinutes(s.workedMin)}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-service-mkt">{s.overtimeMin > 0 ? fmtMinutes(s.overtimeMin) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-mono text-[12px] font-semibold', s.netMin < 0 ? 'text-error' : 'text-success')}>
                          {fmtNet(s.netMin)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-mono text-[12px] text-success">
                          <TrendingUp size={11} /> {s.earlyCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                onTimePct >= 80 ? 'bg-success' : onTimePct >= 60 ? 'bg-warning' : 'bg-error',
                              )}
                              style={{ width: `${onTimePct}%` }}
                            />
                          </div>
                          <span className={cn(
                            'font-mono text-[12px] font-semibold',
                            onTimePct >= 80 ? 'text-success' : onTimePct >= 60 ? 'text-warning' : 'text-error',
                          )}>
                            {onTimePct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-4">
                        <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.profileId}-expanded`} className="border-b border-border-subtle bg-surface-2/50">
                        <td colSpan={16} className="px-6 py-3">
                          <div className="text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-2">
                            Daily log — {MONTH_NAMES[month - 1]} {year}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {dayRecords.map((r) => {
                              const dayNum = parseInt(r.date.split('-')[2], 10)
                              const checkinMin = r.check_in ? minutesSinceMidnight(r.check_in) : null
                              const isEarly    = checkinMin !== null && checkinMin < workStartMin
                              const isOnTime   = checkinMin !== null && !isEarly && checkinMin <= workStartMin + graceMin
                              const statusCls  =
                                r.status === 'present' ? (isEarly ? 'bg-success/20 border-success/40 text-success' : isOnTime ? 'bg-success/10 border-success/25 text-success' : 'bg-success/10 border-success/25 text-success') :
                                r.status === 'late'    ? 'bg-warning/15 border-warning/35 text-warning' :
                                r.status === 'absent'  ? 'bg-error/10 border-error/25 text-error' :
                                r.status === 'half_day'? 'bg-service-design/10 border-service-design/25 text-service-design' :
                                r.status === 'leave'   ? 'bg-service-dev/10 border-service-dev/25 text-service-dev' :
                                'bg-surface-3 border-border-default text-text-4'
                              const checkinLabel = r.check_in
                                ? new Date(r.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                : null
                              const statusLabel =
                                r.status === 'present'  ? 'Present'  :
                                r.status === 'late'     ? 'Late'     :
                                r.status === 'absent'   ? 'Absent'   :
                                r.status === 'half_day' ? 'Half Day' :
                                r.status === 'leave'    ? 'Leave'    :
                                r.status === 'holiday'  ? 'Holiday'  : r.status

                              return (
                                <div key={r.id} className="relative group">
                                  {/* Custom tooltip above the date */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <div className="bg-surface-3 border border-border-strong rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap text-center">
                                      {checkinLabel && (
                                        <p className="font-mono text-[11px] font-bold text-text-1">{checkinLabel}</p>
                                      )}
                                      <p className="font-ui text-[10px] text-text-3">{statusLabel}{isEarly ? ' · Early' : ''}</p>
                                    </div>
                                    {/* Arrow */}
                                    <div className="size-2 bg-surface-3 border-r border-b border-border-strong rotate-45 mx-auto -mt-1" />
                                  </div>
                                  <div className={cn('size-8 rounded-sm border flex items-center justify-center text-[11px] font-mono font-bold transition-colors', statusCls)}>
                                    {dayNum}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex items-center gap-4 mt-2.5 text-[10.5px] font-mono text-text-4">
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded-xs bg-success/20 border border-success/40 inline-block" /> Present</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded-xs bg-warning/15 border border-warning/35 inline-block" /> Late</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded-xs bg-error/10 border border-error/25 inline-block" /> Absent</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded-xs bg-service-design/10 border border-service-design/25 inline-block" /> Half Day</span>
                            <span className="flex items-center gap-1"><span className="size-2.5 rounded-xs bg-service-dev/10 border border-service-dev/25 inline-block" /> Leave</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Settings tab ─────────────────────────────────────────────────────────── */
export function SettingsTab() {
  const { data: settings, isLoading } = useAttendanceSettings()

  if (isLoading || !settings) {
    return <div className="bg-surface-1 border border-border-default rounded-xl p-8 animate-pulse h-48" />
  }

  return <SettingsForm key={settings.updated_at ?? 'attendance-settings'} settings={settings} />
}

function SettingsForm({ settings }: { settings: AttendanceSettings }) {
  const toast = useToast()
  const updateMutation = useUpdateAttendanceSettings()

  const [workStart, setWorkStart] = useState(() => settings.work_start_time.slice(0, 5))
  const [workEnd, setWorkEnd] = useState(() => settings.work_end_time.slice(0, 5))
  const [grace, setGrace] = useState(() => String(settings.grace_period_min))
  const [earlyCheckin, setEarlyCheckin] = useState(() => String(settings.early_checkin_min))
  const [checkoutBuffer, setCheckoutBuffer] = useState(() => String(settings.checkout_buffer_min))
  const [tz, setTz] = useState(() => settings.timezone)
  const [xp, setXp] = useState(() => String(settings.xp_on_time_checkin))
  const [ipCidr, setIpCidr] = useState(() => settings.office_ip_cidr ?? '')
  const [saturdayWorking, setSaturdayWorking] = useState(() => settings.saturday_working)
  const [autoCheckout, setAutoCheckout] = useState(() => settings.auto_checkout)

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        work_start_time: workStart,
        work_end_time: workEnd,
        grace_period_min: parseInt(grace, 10),
        early_checkin_min: parseInt(earlyCheckin, 10),
        checkout_buffer_min: parseInt(checkoutBuffer, 10),
        timezone: tz,
        xp_on_time_checkin: parseInt(xp, 10),
        office_ip_cidr: ipCidr.trim() || null,
        saturday_working: saturdayWorking,
        auto_checkout: autoCheckout,
      })
      toast('Attendance settings saved', 'success')
    } catch {
      toast('Failed to save settings', 'error')
    }
  }

  return (
    <div className="bg-surface-1 border border-border-default rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
        <div className="size-9 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
          <SettingsIcon size={16} className="text-brand-red" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-[15px] text-text-1">Attendance Settings</h3>
          <p className="font-ui text-[12px] text-text-4">Configure office hours, XP rewards, and network restrictions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-[13px] text-text-2">Work Hours</h4>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Work Start Time</label>
            <TimePicker
              value={workStart}
              onChange={setWorkStart}
              placeholder="Select start time…"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Work End Time</label>
            <TimePicker
              value={workEnd}
              onChange={setWorkEnd}
              minTime={workStart || undefined}
              placeholder="Select end time…"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Grace Period (minutes)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={grace}
              onChange={(e) => setGrace(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
            <p className="text-[11px] font-ui text-text-4 mt-1">
              Check-ins within {grace || '?'} min after start time are marked Late (not rejected)
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Early Check-In Window (minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={earlyCheckin}
              onChange={(e) => setEarlyCheckin(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
            <p className="text-[11px] font-ui text-text-4 mt-1">
              Employees may check in up to {earlyCheckin || '?'} min before start time (e.g. early arrivals)
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Checkout Buffer (minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={checkoutBuffer}
              onChange={(e) => setCheckoutBuffer(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
            <p className="text-[11px] font-ui text-text-4 mt-1">
              Checking out up to {checkoutBuffer || '?'} min after end time still counts as a full day; overtime accrues only beyond it
            </p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-surface-inset border border-border-default rounded-md">
            <div>
              <p className="font-ui font-semibold text-[13px] text-text-1">Saturday Working Day</p>
              <p className="font-ui text-[11px] text-text-4 mt-0.5">
                {saturdayWorking ? 'Every Saturday is a regular workday — check-in required' : 'Saturdays are off by default'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaturdayWorking((v) => !v)}
              className={cn(
                'relative shrink-0 rounded-full transition-colors duration-200',
                saturdayWorking ? 'bg-brand-red' : 'bg-surface-3 border border-border-strong',
              )}
              style={{ width: 40, height: 22 }}
            >
              <span
                className="absolute top-0.75 size-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{ left: 3, transform: saturdayWorking ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-display font-semibold text-[13px] text-text-2">Gamification & Network</h4>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP for Early / On-Time Check-In</label>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
            <p className="text-[11px] font-ui text-text-4 mt-1">
              Experience Points awarded automatically when an employee checks in by start time + grace (status “Present”).
            </p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-surface-inset border border-border-default rounded-md">
            <div>
              <p className="font-ui font-semibold text-[13px] text-text-1">Auto Check-Out</p>
              <p className="font-ui text-[11px] text-text-4 mt-0.5">
                {autoCheckout
                  ? 'Anyone still checked in at day end is auto-checked-out at work end time'
                  : 'Employees who forget to check out stay open until corrected'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoCheckout((v) => !v)}
              className={cn(
                'relative shrink-0 rounded-full transition-colors duration-200',
                autoCheckout ? 'bg-brand-red' : 'bg-surface-3 border border-border-strong',
              )}
              style={{ width: 40, height: 22 }}
            >
              <span
                className="absolute top-0.75 size-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{ left: 3, transform: autoCheckout ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Timezone</label>
            <TimezoneSelect value={tz} onChange={setTz} />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
              Office IP CIDR{' '}
              <span className="normal-case font-ui text-text-4 ml-1">(optional — leave blank to disable WiFi check)</span>
            </label>
            <input
              type="text"
              value={ipCidr}
              onChange={(e) => setIpCidr(e.target.value)}
              placeholder="203.101.45.0/24"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
            <p className="text-[11px] font-ui text-text-4 mt-1">
              {ipCidr ? 'Check-ins from outside this range will be rejected.' : 'WiFi enforcement is disabled.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save size={14} />
          {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
type Tab = 'records' | 'wfh' | 'leave' | 'exceptions' | 'devices' | 'holidays' | 'overtime' | 'reports' | 'settings'

export default function AttendancePage() {
  const [view, setView] = useState<Tab>('records')
  const tabStripRef = React.useRef<HTMLDivElement>(null)

  // Keep the selected tab centered within the horizontally scrollable strip.
  React.useEffect(() => {
    const container = tabStripRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return
    const target = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2
    const max = container.scrollWidth - container.clientWidth
    container.scrollTo({ left: Math.max(0, Math.min(target, max)), behavior: 'smooth' })
  }, [view])

  const { data: pendingWfhData = [] } = useAllWfhRequests('pending')
  const pendingWFH = pendingWfhData.length
  const { data: pendingLeaveData = [] } = useAllLeaveRequests('pending')
  const pendingLeave = pendingLeaveData.length
  const { data: devices = [] } = useEnrolledDevices()
  const pendingDevices = devices.filter((d) => !d.approved_by && d.is_active).length
  const { data: pendingExcData = [] } = useAllAttendanceExceptions({ status: 'pending' })
  const pendingExceptions = pendingExcData.length
  const { data: pendingOtData = [] } = useAllOvertimeRequests('pending')
  const pendingOvertime = pendingOtData.length

  // Only Super Admin / Admin / HR reach this view, and they get every feature.
  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'records',    label: 'Daily Records',    icon: Users },
    { id: 'wfh',        label: 'WFH Requests',     icon: Home,        badge: pendingWFH },
    { id: 'leave',      label: 'Leave',            icon: Plane,       badge: pendingLeave },
    { id: 'exceptions', label: 'Exceptions',       icon: AlertCircle, badge: pendingExceptions },
    { id: 'devices',    label: 'Enrolled Devices', icon: Smartphone,  badge: pendingDevices },
    { id: 'holidays',   label: 'Schedule',         icon: Palmtree },
    { id: 'overtime',   label: 'Overtime',         icon: Hourglass,   badge: pendingOvertime },
    { id: 'reports',    label: 'Reports',          icon: BarChart2 },
    { id: 'settings',   label: 'Settings',         icon: SettingsIcon },
  ]

  const effectiveView: Tab = view

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Attendance" />

      <div className="px-4 py-6 lg:p-6 flex flex-col gap-6 max-w-content mx-auto w-full">

        {/* Self Check-In Card */}
        <AttendanceCheckInCard />

        {/* Tab switcher */}
        <div ref={tabStripRef} className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar max-w-full scroll-smooth">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              data-active={effectiveView === id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-ui font-medium transition-colors relative shrink-0 whitespace-nowrap',
                effectiveView === id
                  ? 'bg-surface-3 text-text-1 shadow-sm'
                  : 'text-text-3 hover:text-text-2',
              )}
            >
              <Icon size={14} />
              {label}
              {badge != null && badge > 0 && (
                <span className="ml-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {effectiveView === 'records'    && <DailyRecordsTab />}
        {effectiveView === 'wfh'        && <WFHRequestsTab />}
        {effectiveView === 'leave'      && <LeaveTab />}
        {effectiveView === 'exceptions' && <ExceptionsTab />}
        {effectiveView === 'devices'    && <EnrolledDevicesTab />}
        {effectiveView === 'holidays'   && <HolidaysTab />}
        {effectiveView === 'overtime'   && <OvertimeTab />}
        {effectiveView === 'reports'    && <ReportsTab />}
        {effectiveView === 'settings'   && <SettingsTab />}
      </div>
    </div>
  )
}
