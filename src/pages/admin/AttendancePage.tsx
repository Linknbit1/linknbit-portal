import React, { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, Clock, LogOut, Users, Calendar,
  AlertTriangle, Wifi, Monitor, Search, Download, Plus, X, Check,
  Home, ChevronDown, ClipboardList, ThumbsUp, ThumbsDown, ShieldCheck,
  Smartphone, Settings as SettingsIcon, Shield, AlertCircle, Save,
  BarChart2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  Palmtree, Hourglass, Star,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { TimezoneSelect } from '../../components/ui/TimezoneSelect'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import {
  useMyTodayAttendance,
  useAllAttendance,
  useCheckIn,
  useMarkAttendance,
  useAdminCheckOut,
  useAttendanceSettings,
  useUpdateAttendanceSettings,
  useAllAttendanceExceptions,
  useReviewException,
  useMonthlyAttendance,
  useHolidays,
  useCreateHoliday,
  useCreateHolidayRange,
  useDeleteHoliday,
  useWorkingSaturdays,
  useAddWorkingSaturday,
  useRemoveWorkingSaturday,
  useAllOvertimeRequests,
  useReviewOvertime,
} from '../../hooks/useAttendance'
import type { AttendanceExceptionWithProfile } from '../../api/attendance'
import { useEnrolledDevices, useApproveDevice, useDeactivateDevice } from '../../hooks/useEnrolledDevices'
import { getDeviceFingerprint, getDeviceName } from '../../lib/deviceUtils'
import { WFH_REQUESTS } from '../../data/mock'
import type { WFHRequest, WFHStatus } from '../../types'
import type { AttendanceWithProfile } from '../../api/attendance'
import { cn } from '../../lib/cn'

/* ── Status chip meta ─────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  present:  { label: 'Present',  cls: 'bg-success/10 text-success border-success/30',     dot: '#22C55E' },
  late:     { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/30',     dot: '#F59E0B' },
  absent:   { label: 'Absent',   cls: 'bg-error/10 text-error border-error/30',           dot: '#F4364C' },
  half_day: { label: 'Half Day', cls: 'bg-service-design/10 text-service-design border-service-design/30', dot: '#A78BFA' },
  leave:    { label: 'Leave',    cls: 'bg-service-dev/10 text-service-dev border-service-dev/30', dot: '#22D3EE' },
  holiday:  { label: 'Holiday',  cls: 'bg-text-3/10 text-text-3 border-border-default',   dot: '#6B7280' },
}

const WFH_META: Record<WFHStatus, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  rejected: { label: 'Rejected', cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
}

function StatusChip({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['absent']
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

function WFHStatusChip({ status }: { status: WFHStatus }) {
  const m = WFH_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

/* ── Self Check-In card ───────────────────────────────────────────────────── */
function SelfCheckInCard() {
  const toast = useToast()
  const { data: today, isLoading } = useMyTodayAttendance()
  const checkInMutation = useCheckIn()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleCheckIn = async () => {
    try {
      const [fingerprint, name] = await Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())])
      const result = await checkInMutation.mutateAsync({ deviceFingerprint: fingerprint, deviceName: name })
      const msg = result.status === 'late' ? `Checked in (late) at ${time}` : `Checked in at ${time} — +10 XP earned!`
      toast(msg, result.status === 'late' ? 'warning' : 'success')
      if (result.device_flagged) {
        toast('Your device is not recognised. HR has been notified.', 'warning')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-in failed'
      if (code === 'outside_window') {
        toast(msg, 'error')
      } else if (code === 'wrong_network') {
        toast('You must be on the office WiFi to check in.', 'error')
      } else if (code === 'duplicate') {
        toast('Already checked in today.', 'warning')
      } else if (code === 'device_blocked') {
        toast('This device has been blocked. Contact HR to reactivate it.', 'error')
      } else {
        toast(msg || 'Check-in failed', 'error')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="w-24 h-24 rounded-full bg-surface-2 animate-pulse mx-auto" />
    )
  }

  if (today) {
    const checkedOut = Boolean(today.check_out)
    return (
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          'w-24 h-24 rounded-full border-2 flex items-center justify-center',
          today.status === 'present' ? 'bg-success/15 border-success/40' : 'bg-warning/15 border-warning/40',
        )}>
          <CheckCircle2 size={40} className={today.status === 'present' ? 'text-success' : 'text-warning'} />
        </div>
        <div className="text-center">
          <p className={cn('font-display font-bold text-[18px]', today.status === 'present' ? 'text-success' : 'text-warning')}>
            {today.status === 'late' ? 'Checked In (Late)' : 'Checked In'}
          </p>
          {today.check_in && (
            <p className="font-mono text-[13px] text-text-3 mt-0.5">
              {new Date(today.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {checkedOut && today.check_out && (
                <> → {new Date(today.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </p>
          )}
          {today.device_flagged && (
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/30 text-[11.5px] font-ui text-warning">
              <AlertCircle size={12} /> Device not recognised — HR notified
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleCheckIn}
        disabled={checkInMutation.isPending}
        className={cn(
          'w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          'border-brand-red/50 bg-brand-red/10 hover:bg-brand-red/20 hover:border-brand-red hover:scale-105 active:scale-95',
          checkInMutation.isPending && 'opacity-70 cursor-not-allowed',
        )}
      >
        {checkInMutation.isPending
          ? <span className="w-7 h-7 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          : <MapPin size={36} className="text-brand-red" />
        }
      </button>
      <div className="text-center">
        <p className="font-display font-bold text-[18px] text-text-1">Check In</p>
        <p className="font-mono text-[13px] text-text-3 mt-0.5">{time}</p>
      </div>
    </div>
  )
}

/* ── Mark Attendance modal ────────────────────────────────────────────────── */
interface MarkModalProps {
  open: boolean
  onClose: () => void
  dateFilter: string
}

function MarkModal({ open, onClose, dateFilter }: MarkModalProps) {
  const toast = useToast()
  const markMutation = useMarkAttendance()
  const [profileId, setProfileId] = useState('')
  const [status, setStatus] = useState('present')
  const [note, setNote] = useState('')

  const handleSave = async () => {
    if (!profileId) return
    try {
      await markMutation.mutateAsync({ profileId, date: dateFilter, status, note: note.trim() || undefined })
      toast('Attendance marked', 'success')
      onClose()
      setProfileId('')
      setNote('')
      setStatus('present')
    } catch {
      toast('Failed to mark attendance', 'error')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Mark Attendance</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Profile ID</label>
            <input
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="Paste employee UUID..."
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Status</label>
            <Select
              value={status}
              onChange={(v) => setStatus(v)}
              options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
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
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!profileId || markMutation.isPending}>
            <Check size={14} /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Daily Records tab ───────────────────────────────────────────────────── */
function DailyRecordsTab({ canManage }: { canManage: boolean }) {
  const toast = useToast()
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [markOpen, setMarkOpen] = useState(false)

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

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Present',  value: stats.present,  icon: CheckCircle2, color: 'text-success',         bg: 'bg-success/10 border-success/20' },
          { label: 'Late',     value: stats.late,     icon: Clock,        color: 'text-warning',         bg: 'bg-warning/10 border-warning/20' },
          { label: 'Absent',   value: stats.absent,   icon: AlertTriangle,color: 'text-error',           bg: 'bg-error/10 border-error/20' },
          { label: 'Half Day', value: stats.half_day, icon: Monitor,      color: 'text-service-design',  bg: 'bg-service-design/10 border-service-design/20' },
          { label: 'Leave',    value: stats.leave,    icon: Wifi,         color: 'text-service-dev',     bg: 'bg-service-dev/10 border-service-dev/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex flex-col gap-2">
            <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center', bg)}>
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <Calendar size={15} className="text-text-3 flex-shrink-0" />
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="Select date…"
            className="w-[160px]"
          />
          <div className="relative flex-1 max-w-[220px]">
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
            <Button size="sm" variant="secondary" onClick={() => toast('CSV exported', 'success')}>
              <Download size={13} /> Export
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setMarkOpen(true)}>
                <Plus size={13} /> Mark Attendance
              </Button>
            )}
          </div>
        </div>

        <table className="w-full">
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
                <tr key={rec.id} className="border-b border-border-subtle hover:bg-white/[0.015] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={rec.profiles?.name ?? '?'} size="sm" />
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
                    ) : rec.check_in && canManage ? (
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
                      <span className="font-mono text-[11px] text-text-3 truncate max-w-[120px] block">{rec.device_name}</span>
                    ) : (
                      <span className="font-mono text-[11px] text-text-4">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-ui text-[12px] text-text-3 max-w-[140px] truncate">
                    {rec.note ?? ''}
                  </td>
                  <td className="px-4 py-3">
                    {rec.wifi_validated && (
                      <Wifi size={13} className="text-success" aria-label="WiFi validated" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage && <MarkModal open={markOpen} onClose={() => setMarkOpen(false)} dateFilter={dateFilter} />}
    </>
  )
}

/* ── WFH Requests tab (mock — pending DB schema) ─────────────────────────── */
function WFHRequestsTab() {
  const toast = useToast()
  const [requests, setRequests] = useState<WFHRequest[]>(WFH_REQUESTS)
  const [grantOpen, setGrantOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<WFHRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<WFHStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  const filtered = requests.filter((r) => statusFilter === 'all' || r.status === statusFilter)

  const approve = (id: string) => {
    setRequests((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: 'approved', reviewedBy: 'HR', reviewedAt: new Date().toISOString() } : r
    ))
    toast('WFH request approved', 'success')
  }

  const reject = (id: string, note: string) => {
    setRequests((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: 'rejected', reviewedBy: 'HR', reviewedAt: new Date().toISOString(), note } : r
    ))
    toast('WFH request rejected', 'error')
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pending,  icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',       value: approved, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',       value: rejected, icon: AlertTriangle,color: 'text-error',   bg: 'bg-error/10 border-error/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', bg)}>
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <ClipboardList size={14} className="text-text-3" />
          <span className="font-ui font-semibold text-[13px] text-text-1">WFH Requests</span>
          <div className="ml-auto flex items-center gap-2">
            <Select
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as WFHStatus | 'all')}
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
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No WFH requests match this filter.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((req) => {
              const isExpanded = expandedId === req.id
              return (
                <div key={req.id} className="hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar name={req.userName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-ui font-medium text-[13px] text-text-1">{req.userName}</span>
                        {req.grantedDirectly && (
                          <span className="text-[10px] font-mono bg-service-dev/10 text-service-dev border border-service-dev/20 px-1.5 py-0.5 rounded-xs uppercase tracking-wide">HR Granted</span>
                        )}
                      </div>
                      <p className="text-[12px] font-ui text-text-3 truncate max-w-[340px]">{req.reason}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] font-mono text-text-2 flex-shrink-0">
                      <Calendar size={12} className="text-text-4" />
                      {req.date}
                    </div>
                    <div className="flex-shrink-0 text-[11.5px] font-mono text-text-4">{fmt(req.requestedAt)}</div>
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
                  </div>
                  {isExpanded && req.status !== 'pending' && (
                    <div className="px-5 pb-3.5 pt-0">
                      <div className="bg-surface-2 rounded-md px-4 py-3 text-[12px] font-ui text-text-3 flex gap-4 flex-wrap">
                        <span><span className="text-text-4 font-mono">Reviewed by</span> <span className="text-text-2 font-medium">{req.reviewedBy}</span></span>
                        {req.reviewedAt && <span><span className="text-text-4 font-mono">at</span> <span className="text-text-2">{fmt(req.reviewedAt)}</span></span>}
                        {req.note && <span className="w-full text-text-2 italic">"{req.note}"</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Grant WFH modal (simplified) */}
      {grantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGrantOpen(false)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Grant WFH</h3>
              <button onClick={() => setGrantOpen(false)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="text-[13px] font-ui text-text-3 mb-4">WFH request DB schema is pending Phase 4. Use Mark Attendance with status override for now.</p>
            <Button size="sm" onClick={() => setGrantOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[16px] text-text-1">Reject Request</h3>
              <button onClick={() => setRejectTarget(null)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <p className="text-[13px] font-ui text-text-2 mb-4">
              Rejecting WFH request for <span className="font-semibold text-text-1">{rejectTarget.userName}</span>.
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
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Enrolled Devices tab ─────────────────────────────────────────────────── */
function EnrolledDevicesTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
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
    const isShared = sharedFingerprints.has(d.device_fingerprint)
    const sharedWith = isShared
      ? (fingerprintMap.get(d.device_fingerprint) ?? [])
          .filter((other) => other.id !== d.id)
          .map((other) => other.profiles?.name ?? other.profile_id.slice(0, 8))
      : []

    return (
    <tr className={cn(
      'border-b border-border-subtle hover:bg-white/[0.015] transition-colors',
      isShared && 'bg-warning/[0.03]',
    )}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={d.profiles?.name ?? '?'} size="sm" />
          <span className="font-ui font-medium text-[13px] text-text-1">{d.profiles?.name ?? d.profile_id.slice(0, 8)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Smartphone size={13} className="text-text-4 flex-shrink-0" />
          <span className="font-ui text-[12.5px] text-text-1">{d.device_name}</span>
          {isShared && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-warning/15 border border-warning/30 text-warning text-[10px] font-mono font-semibold uppercase tracking-wide">
              <AlertTriangle size={9} /> Shared
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-text-4 mt-0.5 pl-5">{d.device_fingerprint.slice(0, 16)}…</p>
        {isShared && sharedWith.length > 0 && (
          <p className="font-ui text-[10.5px] text-warning/70 mt-0.5 pl-5">
            Also used by: {sharedWith.join(', ')}
          </p>
        )}
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
          {!d.approved_by && d.is_active && (
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
          {!d.is_active && (
            <button
              onClick={() => handleReactivate(d.id)}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-service-dev/10 border border-service-dev/30 text-service-dev text-[11.5px] font-ui font-semibold hover:bg-service-dev/20 transition-colors"
            >
              <CheckCircle2 size={12} /> Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',  value: pending.length,         icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',        value: approved.length,        icon: Shield,      color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Inactive',        value: inactive.length,        icon: Smartphone,  color: 'text-text-3',  bg: 'bg-surface-2 border-border-default' },
          { label: 'Shared Devices',  value: sharedDevicesCount,     icon: Users,       color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', bg)}>
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <Smartphone size={14} className="text-text-3" />
          <span className="font-ui font-semibold text-[13px] text-text-1">Enrolled Devices</span>
          {pending.length > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center">
              {pending.length}
            </span>
          )}
          <p className="ml-auto text-[12px] font-ui text-text-4">
            Approve devices employees used to check in from
          </p>
        </div>

        <table className="w-full">
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
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

/* ── Exceptions tab ───────────────────────────────────────────────────────── */
function ExceptionsTab() {
  const toast = useToast()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const filters = {
    type:   typeFilter   !== 'all' ? typeFilter   : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }

  const { data: exceptions = [], isLoading } = useAllAttendanceExceptions(filters)
  const reviewMutation = useReviewException()

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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pendingCount,  icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',       value: approvedCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',       value: rejectedCount, icon: AlertTriangle, color: 'text-error',  bg: 'bg-error/10 border-error/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', bg)}>
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <AlertCircle size={14} className="text-text-3" />
          <span className="font-ui font-semibold text-[13px] text-text-1">Exception Requests</span>
          <div className="ml-auto flex items-center gap-2">
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
          </div>
        </div>

        <table className="w-full">
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
                  <tr key={exc.id} className="border-b border-border-subtle hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={excWp.profiles?.name ?? '?'} size="sm" />
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
                    <td className="px-4 py-3 font-ui text-[12px] text-text-2 max-w-[160px]">
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
                      {exc.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
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
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-text-4">
                          {exc.reviewed_at
                            ? new Date(exc.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectNote('') }} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Holidays tab ─────────────────────────────────────────────────────────── */

const HOLIDAY_TYPE_META: Record<string, { label: string; cls: string; dot: string }> = {
  public_holiday: { label: 'Public Holiday', cls: 'bg-brand-red/10 text-brand-red border-brand-red/25',         dot: '#EE2737' },
  company_off:    { label: 'Company Off',     cls: 'bg-service-design/10 text-service-design border-service-design/25', dot: '#A78BFA' },
  optional:       { label: 'Optional',        cls: 'bg-service-dev/10 text-service-dev border-service-dev/25',   dot: '#22D3EE' },
}

function HolidaysTab() {
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

  const { data: holidays = [], isLoading } = useHolidays(year)
  const { data: workingSaturdays = [] } = useWorkingSaturdays(year)
  const createMutation = useCreateHoliday()
  const createRangeMutation = useCreateHolidayRange()
  const deleteMutation = useDeleteHoliday()
  const addSatMutation = useAddWorkingSaturday()
  const removeSatMutation = useRemoveWorkingSaturday()

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

      {/* Header row */}
      <div className="flex items-center gap-3">
        <button onClick={() => setYear((y) => y - 1)} className="w-8 h-8 rounded-sm bg-surface-1 border border-border-default flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-strong transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="bg-surface-1 border border-border-default rounded-lg px-5 py-2 flex items-center gap-2">
          <Palmtree size={14} className="text-brand-red" />
          <span className="font-display font-semibold text-[15px] text-text-1">{year} Holidays</span>
          <span className="ml-1 font-mono text-[11px] text-text-4">{holidays.length} day{holidays.length !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={() => setYear((y) => y + 1)} className="w-8 h-8 rounded-sm bg-surface-1 border border-border-default flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-strong transition-colors">
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => { setAddOpen(true); setAddMode('single'); setForm({ date: '', dateTo: '', name: '', type: 'public_holiday' }) }}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-sm bg-brand-red text-white text-[13px] font-ui font-semibold hover:bg-brand-red/90 transition-colors"
        >
          <Plus size={14} /> Add Holiday
        </button>
      </div>

      {/* Type legend */}
      <div className="flex items-center gap-3">
        {Object.entries(HOLIDAY_TYPE_META).map(([k, v]) => (
          <span key={k} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', v.cls)}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.dot }} />
            {v.label}
          </span>
        ))}
      </div>

      {/* Holiday list */}
      {isLoading ? (
        <div className="bg-surface-1 border border-border-default rounded-xl p-12 text-center font-mono text-[12px] text-text-4">Loading…</div>
      ) : holidays.length === 0 ? (
        <div className="bg-surface-1 border border-border-default rounded-xl p-16 text-center">
          <Palmtree size={32} className="text-text-4 mx-auto mb-3" />
          <p className="font-ui text-[14px] text-text-3">No holidays added for {year} yet.</p>
          <p className="font-ui text-[12px] text-text-4 mt-1">Click "Add Holiday" to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byMonth.map(({ month, items }) => (
            <div key={month} className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border-subtle bg-surface-2 flex items-center gap-2">
                <Calendar size={13} className="text-text-4" />
                <span className="font-display font-semibold text-[13px] text-text-2">{month} {year}</span>
                <span className="font-mono text-[11px] text-text-4">{items.length} holiday{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-border-subtle">
                {items.map((h) => {
                  const meta = HOLIDAY_TYPE_META[h.type] ?? HOLIDAY_TYPE_META['public_holiday']
                  return (
                    <div key={h.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.015] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                        <Palmtree size={16} className="text-text-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-ui font-semibold text-[13px] text-text-1">{h.name}</p>
                        <p className="font-mono text-[11px] text-text-4 mt-0.5">{fmtDate(h.date)}</p>
                      </div>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', meta.cls)}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                      <button
                        onClick={() => setDeleteTarget(h.id)}
                        className="text-text-4 hover:text-error transition-colors p-1.5 rounded-sm hover:bg-error/10"
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

      {/* Add holiday modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
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
                  <Calendar size={12} className="text-text-4 flex-shrink-0" />
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
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
          </div>
        </div>
      )}

      {/* ── Working Saturdays ─────────────────────────────────────────────── */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-[14px] text-text-1">Working Saturdays</h3>
            <p className="font-ui text-[12px] text-text-4 mt-0.5">Specific Saturdays that require check-in regardless of the global setting</p>
          </div>
          <button
            onClick={() => { setSatPickerOpen(true); setSatDate(''); setSatNote('') }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-surface-2 border border-border-default text-text-2 text-[12px] font-ui font-semibold hover:border-border-strong hover:text-text-1 transition-colors"
          >
            <Plus size={13} /> Mark Saturday
          </button>
        </div>

        {workingSaturdays.length === 0 ? (
          <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-6 text-center">
            <p className="font-ui text-[13px] text-text-4">No working Saturdays for {year}.</p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {workingSaturdays.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.015] transition-colors">
                  <div className="w-8 h-8 rounded-md bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                    <Calendar size={13} className="text-text-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[13px] text-text-1">
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {s.note && <p className="font-ui text-[11px] text-text-4 mt-0.5">{s.note}</p>}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-success/10 text-success border border-success/25">
                    Working Day
                  </span>
                  <button
                    onClick={() => setSatDeleteTarget(s.id)}
                    className="text-text-4 hover:text-error transition-colors p-1.5 rounded-sm hover:bg-error/10"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add working Saturday modal */}
      {satPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSatPickerOpen(false)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
          </div>
        </div>
      )}

      {/* Remove working Saturday confirm */}
      {satDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSatDeleteTarget(null)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-[16px] text-text-1 mb-2">Remove Working Saturday?</h3>
            <p className="font-ui text-[13px] text-text-3 mb-5">This Saturday will revert to a regular weekend day.</p>
            <div className="flex gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSatDeleteTarget(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={removeSatMutation.isPending} onClick={() => handleRemoveSaturday(satDeleteTarget)}>
                <X size={14} /> Remove
              </Button>
            </div>
          </div>
        </div>
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

function OvertimeTab() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const [statusFilter, setStatusFilter] = useState('all')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: requests = [], isLoading } = useAllOvertimeRequests(
    statusFilter !== 'all' ? statusFilter : undefined,
  )
  const reviewMutation = useReviewOvertime()

  const pending  = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  const totalApprovedHours = requests
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',   value: pending,                              icon: Clock,        color: 'text-warning',      bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',         value: approved,                             icon: CheckCircle2, color: 'text-success',      bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected',         value: rejected,                             icon: AlertTriangle,color: 'text-error',        bg: 'bg-error/10 border-error/20' },
          { label: 'Approved Hours',   value: `${totalApprovedHours.toFixed(1)}h`,  icon: Star,         color: 'text-service-mkt',  bg: 'bg-service-mkt/10 border-service-mkt/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', bg)}>
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
          <Hourglass size={14} className="text-text-3" />
          <span className="font-ui font-semibold text-[13px] text-text-1">Overtime Requests</span>
          {pending > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center">
              {pending}
            </span>
          )}
          <div className="ml-auto">
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
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 font-mono text-[12px] text-text-4">
            <span className="w-4 h-4 border-2 border-text-4 border-t-brand-red rounded-full animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No overtime requests match this filter.</div>
        ) : (
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
              {requests.map((req) => {
                const meta = OT_STATUS_META[req.status] ?? OT_STATUS_META['pending']
                const r = req as typeof req & { profiles?: { name: string; avatar_url: string | null } | null }
                return (
                  <tr key={req.id} className="border-b border-border-subtle hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.profiles?.name ?? '?'} size="sm" />
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
                    <td className="px-4 py-3 font-ui text-[12px] text-text-2 max-w-[200px]">
                      <span className="line-clamp-2">{req.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', meta.cls)}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                      {req.review_note && (
                        <p className="font-ui text-[10.5px] text-text-4 mt-0.5 max-w-[160px] truncate italic">"{req.review_note}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
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
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-text-4">
                          {req.reviewed_at
                            ? new Date(req.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectNote('') }} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reports tab ──────────────────────────────────────────────────────────── */

interface EmployeeStat {
  profileId: string
  name: string
  present: number
  late: number
  absent: number
  halfDay: number
  leave: number
  holiday: number
  totalCheckins: number   // rows with check_in != null
  totalMinutes: number    // sum of session durations
  earlyCount: number      // check_in before work_start
  onTimeCount: number     // check_in within grace
  avgCheckinMin: number   // average check_in minutes-since-midnight
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

function ReportsTab() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [sortKey, setSortKey] = useState<keyof EmployeeStat>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: records = [], isLoading } = useMonthlyAttendance(year, month)
  const { data: settings } = useAttendanceSettings()

  const workStartMin = settings
    ? (() => {
        const [h, m] = settings.work_start_time.split(':').map(Number)
        return h * 60 + m
      })()
    : 9 * 60  // fallback 9:00

  const graceMin = settings?.grace_period_min ?? 15

  // Compute working days in the selected month (Mon–Fri, no holidays in DB for now)
  const workingDays = (() => {
    const last = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= last; d++) {
      const dow = new Date(year, month - 1, d).getDay()
      if (dow !== 0 && dow !== 6) count++
    }
    return count
  })()

  // Aggregate per employee
  const statsMap = new Map<string, EmployeeStat>()

  for (const rec of records) {
    const id   = rec.profile_id
    const name = rec.profiles?.name ?? rec.profile_id.slice(0, 8)
    if (!statsMap.has(id)) {
      statsMap.set(id, {
        profileId: id, name,
        present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0,
        totalCheckins: 0, totalMinutes: 0, earlyCount: 0, onTimeCount: 0, avgCheckinMin: 0,
      })
    }
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
      const diff = (new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000
      if (diff > 0) s.totalMinutes += diff
    }
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
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-sm bg-surface-1 border border-border-default flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-strong transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="bg-surface-1 border border-border-default rounded-lg px-5 py-2 flex items-center gap-2">
          <Calendar size={14} className="text-brand-red" />
          <span className="font-display font-semibold text-[15px] text-text-1">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          {isCurrentMonth && (
            <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
              Current
            </span>
          )}
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded-sm bg-surface-1 border border-border-default flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
        <span className="ml-1 font-ui text-[12px] text-text-4">
          {workingDays} working days · {employeeStats.length} employees tracked
        </span>
        <button
          onClick={() => {
            const csvRows = [
              ['Employee', 'Present', 'Late', 'Absent', 'Half Day', 'Leave', 'Avg Check-in', 'Avg Hours', 'On-Time %'].join(','),
              ...sorted.map((s) => [
                s.name,
                s.present, s.late, s.absent, s.halfDay, s.leave,
                fmtTime(s.avgCheckinMin),
                fmtMinutes(s.totalCheckins > 0 ? s.totalMinutes / s.totalCheckins : NaN),
                s.present + s.late > 0 ? Math.round(((s.present - s.late + s.earlyCount + s.onTimeCount) / (s.present + s.late)) * 100) : 0,
              ].join(',')),
            ]
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url
            a.download = `attendance-${year}-${String(month).padStart(2, '0')}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface-1 border border-border-default text-[12px] font-ui font-medium text-text-2 hover:text-text-1 hover:border-border-strong transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: BarChart2,    color: attendanceRate >= 80 ? 'text-success' : attendanceRate >= 60 ? 'text-warning' : 'text-error', bg: attendanceRate >= 80 ? 'bg-success/10 border-success/20' : attendanceRate >= 60 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20' },
          { label: 'On-Time Rate',    value: `${onTimeRate}%`,    icon: CheckCircle2, color: onTimeRate >= 80 ? 'text-success' : onTimeRate >= 60 ? 'text-warning' : 'text-error', bg: onTimeRate >= 80 ? 'bg-success/10 border-success/20' : onTimeRate >= 60 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20' },
          { label: 'Late Check-ins',  value: totalLate,           icon: Clock,        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Absences',        value: totalAbsent,         icon: AlertTriangle,color: 'text-error',   bg: 'bg-error/10 border-error/20' },
          { label: 'Leaves',          value: totalLeave,          icon: Home,         color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', bg)}>
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
          <span className="font-mono text-[11px] text-text-4">Click column headers to sort · Click row to expand daily log</span>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-text-4 font-mono text-[12px]">
            <span className="w-4 h-4 border-2 border-text-4 border-t-brand-red rounded-full animate-spin" /> Loading…
          </div>
        ) : employeeStats.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">
            No attendance records for {MONTH_NAMES[month - 1]} {year}.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                <SortTh label="Employee"     col="name"         sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Present"      col="present"      sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Late"         col="late"         sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Absent"       col="absent"       sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Half Day"     col="halfDay"      sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Leave"        col="leave"        sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Avg Check-in" col="avgCheckinMin" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Avg Hours"    col="totalMinutes" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
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
                      className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} size="sm" />
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
                      <td className="px-4 py-3 font-mono text-[12px] text-text-2">{fmtTime(s.avgCheckinMin)}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-text-2">{fmtMinutes(avgHours)}</td>
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
                        <td colSpan={11} className="px-6 py-3">
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
                                    <div className="w-2 h-2 bg-surface-3 border-r border-b border-border-strong rotate-45 mx-auto -mt-1" />
                                  </div>
                                  <div className={cn('w-8 h-8 rounded-sm border flex items-center justify-center text-[11px] font-mono font-bold transition-colors', statusCls)}>
                                    {dayNum}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex items-center gap-4 mt-2.5 text-[10.5px] font-mono text-text-4">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-success/20 border border-success/40 inline-block" /> Present</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-warning/15 border border-warning/35 inline-block" /> Late</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-error/10 border border-error/25 inline-block" /> Absent</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-service-design/10 border border-service-design/25 inline-block" /> Half Day</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-service-dev/10 border border-service-dev/25 inline-block" /> Leave</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Settings tab ─────────────────────────────────────────────────────────── */
function SettingsTab() {
  const toast = useToast()
  const { data: settings, isLoading } = useAttendanceSettings()
  const updateMutation = useUpdateAttendanceSettings()

  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [grace, setGrace] = useState('')
  const [tz, setTz] = useState('')
  const [xp, setXp] = useState('')
  const [ipCidr, setIpCidr] = useState('')
  const [saturdayWorking, setSaturdayWorking] = useState(false)

  // Sync form state when settings load
  useEffect(() => {
    if (settings) {
      setWorkStart(settings.work_start_time.slice(0, 5))
      setWorkEnd(settings.work_end_time.slice(0, 5))
      setGrace(String(settings.grace_period_min))
      setTz(settings.timezone)
      setXp(String(settings.xp_on_time_checkin))
      setIpCidr(settings.office_ip_cidr ?? '')
      setSaturdayWorking(settings.saturday_working)
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        work_start_time: workStart,
        work_end_time: workEnd,
        grace_period_min: parseInt(grace, 10),
        timezone: tz,
        xp_on_time_checkin: parseInt(xp, 10),
        office_ip_cidr: ipCidr.trim() || null,
        saturday_working: saturdayWorking,
      })
      toast('Attendance settings saved', 'success')
    } catch {
      toast('Failed to save settings', 'error')
    }
  }

  if (isLoading) {
    return <div className="bg-surface-1 border border-border-default rounded-xl p-8 animate-pulse h-48" />
  }

  return (
    <div className="bg-surface-1 border border-border-default rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
        <div className="w-9 h-9 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
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
                'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0',
                saturdayWorking ? 'bg-brand-red' : 'bg-surface-3 border border-border-strong',
              )}
              style={{ minWidth: '2.5rem', height: '1.375rem' }}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  saturdayWorking ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-display font-semibold text-[13px] text-text-2">Gamification & Network</h4>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP for On-Time Check-In</label>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
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
type Tab = 'records' | 'wfh' | 'exceptions' | 'devices' | 'holidays' | 'overtime' | 'reports' | 'settings'

const MGMT = ['super_admin', 'admin', 'hr']
const CAN_SETTINGS = ['super_admin', 'admin']

export default function AttendancePage() {
  const { profile } = useAuthContext()
  const role = profile?.role ?? ''
  const canManage  = MGMT.includes(role)
  const canSettings = CAN_SETTINGS.includes(role)

  const [view, setView] = useState<Tab>('records')
  const pendingWFH = WFH_REQUESTS.filter((r) => r.status === 'pending').length
  const { data: devices = [] } = useEnrolledDevices()
  const pendingDevices = devices.filter((d) => !d.approved_by && d.is_active).length
  const { data: pendingExcData = [] } = useAllAttendanceExceptions({ status: 'pending' })
  const pendingExceptions = pendingExcData.length
  const { data: pendingOtData = [] } = useAllOvertimeRequests('pending')
  const pendingOvertime = pendingOtData.length

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'records', label: 'Daily Records', icon: Users },
    ...(canManage ? [
      { id: 'wfh'        as Tab, label: 'WFH Requests',    icon: Home,        badge: pendingWFH },
      { id: 'exceptions' as Tab, label: 'Exceptions',       icon: AlertCircle, badge: pendingExceptions },
      { id: 'devices'    as Tab, label: 'Enrolled Devices', icon: Smartphone,  badge: pendingDevices },
      { id: 'holidays'   as Tab, label: 'Holidays',         icon: Palmtree },
      { id: 'overtime'   as Tab, label: 'Overtime',         icon: Hourglass,   badge: pendingOvertime },
      { id: 'reports'    as Tab, label: 'Reports',          icon: BarChart2 },
    ] : []),
    ...(canSettings ? [{ id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon }] : []),
  ]

  // Clamp active tab to allowed set (e.g. after role change in dev)
  const allowedIds = new Set(tabs.map((t) => t.id))
  const effectiveView: Tab = allowedIds.has(view) ? view : 'records'

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Attendance" />

      <div className="p-6 flex flex-col gap-6 max-w-content mx-auto w-full">

        {/* Self Check-In Card */}
        <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="font-display font-bold text-[18px] text-text-1">Your Attendance</h2>
            <p className="font-mono text-[12px] text-text-4 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <SelfCheckInCard />
          <div className="flex items-center gap-6 text-[12px] font-mono text-text-3">
            <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office Network Required</span>
            <span className="flex items-center gap-1.5"><Home size={12} className="text-service-dev" /> WFH needs HR approval</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 self-start">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-ui font-medium transition-colors relative',
                effectiveView === id
                  ? 'bg-surface-3 text-text-1 shadow-sm'
                  : 'text-text-3 hover:text-text-2',
              )}
            >
              <Icon size={14} />
              {label}
              {badge != null && badge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {effectiveView === 'records'    && <DailyRecordsTab canManage={canManage} />}
        {effectiveView === 'wfh'        && <WFHRequestsTab />}
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
