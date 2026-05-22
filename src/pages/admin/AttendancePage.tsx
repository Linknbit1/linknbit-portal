import { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, Clock, LogOut, Users, Calendar,
  AlertTriangle, Wifi, Monitor, Search, Download, Plus, X, Check,
  Home, ChevronDown, ClipboardList, ThumbsUp, ThumbsDown, ShieldCheck,
  Smartphone, Settings as SettingsIcon, Shield, AlertCircle, Save,
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
      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
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

  const DeviceRow = ({ d }: { d: typeof devices[number] }) => (
    <tr className="border-b border-border-subtle hover:bg-white/[0.015] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={d.profiles?.name ?? '?'} size="sm" />
          <span className="font-ui font-medium text-[13px] text-text-1">{d.profiles?.name ?? d.profile_id.slice(0, 8)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Smartphone size={13} className="text-text-4 flex-shrink-0" />
          <span className="font-ui text-[12.5px] text-text-1">{d.device_name}</span>
        </div>
        <p className="font-mono text-[10px] text-text-4 mt-0.5 pl-5">{d.device_fingerprint.slice(0, 16)}…</p>
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

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pending.length,  icon: AlertCircle,  color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved',       value: approved.length, icon: Shield,        color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Inactive',       value: inactive.length, icon: Smartphone,    color: 'text-text-3',  bg: 'bg-surface-2 border-border-default' },
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

  // Sync form state when settings load
  useEffect(() => {
    if (settings) {
      setWorkStart(settings.work_start_time.slice(0, 5))
      setWorkEnd(settings.work_end_time.slice(0, 5))
      setGrace(String(settings.grace_period_min))
      setTz(settings.timezone)
      setXp(String(settings.xp_on_time_checkin))
      setIpCidr(settings.office_ip_cidr ?? '')
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
type Tab = 'records' | 'wfh' | 'exceptions' | 'devices' | 'settings'

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

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'records', label: 'Daily Records', icon: Users },
    ...(canManage ? [
      { id: 'wfh'        as Tab, label: 'WFH Requests',    icon: Home,        badge: pendingWFH },
      { id: 'exceptions' as Tab, label: 'Exceptions',       icon: AlertCircle, badge: pendingExceptions },
      { id: 'devices'    as Tab, label: 'Enrolled Devices', icon: Smartphone,  badge: pendingDevices },
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
        {effectiveView === 'settings'   && <SettingsTab />}
      </div>
    </div>
  )
}
