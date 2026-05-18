import { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, Clock, LogOut, Users, Calendar,
  AlertTriangle, Wifi, Monitor, Search,
  Download, Plus, X, Check, Home, ChevronDown,
  ClipboardList, ThumbsUp, ThumbsDown, ShieldCheck,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { ATTENDANCE_RECORDS, USERS, WFH_REQUESTS } from '../../data/mock'
import type { AttendanceRecord, AttendanceStatus, WFHRequest, WFHStatus } from '../../types'
import { cn } from '../../lib/cn'

/* ---- Status chips ---- */
const ATTENDANCE_META: Record<AttendanceStatus, { label: string; cls: string; dot: string }> = {
  present:  { label: 'Present',  cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  late:     { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  absent:   { label: 'Absent',   cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
  remote:   { label: 'Remote',   cls: 'bg-service-dev/10 text-service-dev border-service-dev/30', dot: '#22D3EE' },
  half_day: { label: 'Half Day', cls: 'bg-service-design/10 text-service-design border-service-design/30', dot: '#A78BFA' },
}

const WFH_META: Record<WFHStatus, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  rejected: { label: 'Rejected', cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
}

function AttendanceStatusChip({ status }: { status: AttendanceStatus }) {
  const m = ATTENDANCE_META[status]
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

/* ---- Self Check-In ---- */
function CheckInButton() {
  const toast = useToast()
  const [checked, setChecked] = useState(false)
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleCheckIn = async () => {
    if (checked) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setChecked(true)
    setLoading(false)
    toast('Check-in recorded at ' + time, 'success')
  }

  if (checked) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-[18px] text-success">Checked In</p>
          <p className="font-mono text-[13px] text-text-3 mt-0.5">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className={cn(
          'w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          'border-brand-red/50 bg-brand-red/10 hover:bg-brand-red/20 hover:border-brand-red hover:scale-105 active:scale-95',
          loading && 'opacity-70 cursor-not-allowed',
        )}
      >
        {loading
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

/* ---- Mark Attendance Modal ---- */
function MarkModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (rec: Partial<AttendanceRecord>) => void
}) {
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState<AttendanceStatus>('present')
  const [note, setNote] = useState('')

  const employees = USERS.filter((u) => u.role !== 'client_owner' && u.role !== 'client_member' && u.role !== 'super_admin')

  const handleSave = () => {
    if (!userId) return
    const user = USERS.find((u) => u.id === userId)
    onSave({
      userId,
      userName: user?.name ?? '',
      date: new Date().toISOString().split('T')[0],
      status,
      method: 'admin',
      note: note.trim() || undefined,
    })
    onClose()
    setUserId('')
    setNote('')
    setStatus('present')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Mark Attendance</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Team Member</label>
            <Select
              value={userId}
              onChange={(v) => setUserId(v)}
              options={[
                { value: '', label: 'Select member...' },
                ...employees.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Status</label>
            <Select
              value={status}
              onChange={(v) => setStatus(v as AttendanceStatus)}
              options={Object.entries(ATTENDANCE_META).map(([k, v]) => ({ value: k, label: v.label }))}
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
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!userId}>
            <Check size={14} /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---- Grant WFH Modal (HR directly grants without a request) ---- */
function GrantWFHModal({
  open,
  onClose,
  onGrant,
}: {
  open: boolean
  onClose: () => void
  onGrant: (req: WFHRequest) => void
}) {
  const [userId, setUserId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const employees = USERS.filter((u) => u.role !== 'client_owner' && u.role !== 'client_member' && u.role !== 'super_admin')

  const handleGrant = () => {
    if (!userId) return
    const user = USERS.find((u) => u.id === userId)
    onGrant({
      id: 'wfh_' + Date.now(),
      userId,
      userName: user?.name ?? '',
      date,
      requestedAt: new Date().toISOString(),
      reason: note.trim() || 'HR-granted WFH.',
      status: 'approved',
      reviewedBy: 'HR',
      reviewedAt: new Date().toISOString(),
      grantedDirectly: true,
    })
    onClose()
    setUserId('')
    setNote('')
    setDate(new Date().toISOString().split('T')[0])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-service-dev/15 flex items-center justify-center">
              <ShieldCheck size={15} className="text-service-dev" />
            </div>
            <h3 className="font-display font-bold text-[16px] text-text-1">Grant WFH</h3>
          </div>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] font-ui text-text-3 mb-5">
          Directly approve work-from-home for an employee without requiring a request.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Employee</label>
            <Select
              value={userId}
              onChange={(v) => setUserId(v)}
              options={[
                { value: '', label: 'Select employee...' },
                ...employees.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">WFH Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason / Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Client call from home, coordinated via WhatsApp..."
              rows={2}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1 bg-service-dev/15 text-service-dev border-service-dev/40 hover:bg-service-dev/25" onClick={handleGrant} disabled={!userId}>
            <ShieldCheck size={14} /> Grant WFH
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---- Reject with note modal ---- */
function RejectModal({
  open,
  name,
  onClose,
  onReject,
}: {
  open: boolean
  name: string
  onClose: () => void
  onReject: (note: string) => void
}) {
  const [note, setNote] = useState('')

  const handleReject = () => {
    onReject(note.trim())
    setNote('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[16px] text-text-1">Reject Request</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-[13px] font-ui text-text-2 mb-4">
          Rejecting WFH request for <span className="font-semibold text-text-1">{name}</span>. Add a reason so they understand.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for rejection..."
          rows={3}
          className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
          autoFocus
        />
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="danger" className="flex-1" onClick={handleReject}>
            <X size={14} /> Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---- WFH Requests Tab ---- */
function WFHRequestsTab() {
  const toast = useToast()
  const [requests, setRequests] = useState<WFHRequest[]>(WFH_REQUESTS)
  const [grantOpen, setGrantOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<WFHRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<WFHStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === 'pending').length
  const approvedToday = requests.filter((r) => r.status === 'approved').length
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

  const handleGrant = (req: WFHRequest) => {
    setRequests((prev) => [...prev, req])
    toast(`WFH granted for ${req.userName} on ${req.date}`, 'success')
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
          { label: 'Approved', value: approvedToday, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
          { label: 'Rejected', value: rejected, icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10 border-error/20' },
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
          <div className="py-16 text-center font-ui text-[13px] text-text-4">
            No WFH requests match this filter.
          </div>
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
                          <span className="text-[10px] font-mono bg-service-dev/10 text-service-dev border border-service-dev/20 px-1.5 py-0.5 rounded-xs uppercase tracking-wide">
                            HR Granted
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-ui text-text-3 truncate max-w-[340px]">{req.reason}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] font-mono text-text-2 flex-shrink-0">
                      <Calendar size={12} className="text-text-4" />
                      {req.date}
                    </div>

                    <div className="flex-shrink-0 text-[11.5px] font-mono text-text-4">
                      {fmt(req.requestedAt)}
                    </div>

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
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="ml-1 text-text-4 hover:text-text-1 transition-colors"
                      >
                        <ChevronDown size={15} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                    )}
                  </div>

                  {/* Expanded review details */}
                  {isExpanded && req.status !== 'pending' && (
                    <div className="px-5 pb-3.5 pt-0">
                      <div className="bg-surface-2 rounded-md px-4 py-3 text-[12px] font-ui text-text-3 flex gap-4 flex-wrap">
                        <span>
                          <span className="text-text-4 font-mono">Reviewed by</span>{' '}
                          <span className="text-text-2 font-medium">{req.reviewedBy}</span>
                        </span>
                        {req.reviewedAt && (
                          <span>
                            <span className="text-text-4 font-mono">at</span>{' '}
                            <span className="text-text-2">{fmt(req.reviewedAt)}</span>
                          </span>
                        )}
                        {req.note && (
                          <span className="w-full text-text-2 italic">"{req.note}"</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <GrantWFHModal open={grantOpen} onClose={() => setGrantOpen(false)} onGrant={handleGrant} />
      {rejectTarget && (
        <RejectModal
          open
          name={rejectTarget.userName}
          onClose={() => setRejectTarget(null)}
          onReject={(note) => reject(rejectTarget.id, note)}
        />
      )}
    </div>
  )
}

/* ---- Main Page ---- */
export default function AttendancePage() {
  const toast = useToast()
  const [view, setView] = useState<'records' | 'wfh'>('records')
  const [records, setRecords] = useState<AttendanceRecord[]>(ATTENDANCE_RECORDS)
  const [dateFilter, setDateFilter] = useState('2026-05-16')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [markOpen, setMarkOpen] = useState(false)

  const todayRecords = records.filter((r) => r.date === dateFilter)

  const filtered = todayRecords.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search && !r.userName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    present: todayRecords.filter((r) => r.status === 'present').length,
    late: todayRecords.filter((r) => r.status === 'late').length,
    absent: todayRecords.filter((r) => r.status === 'absent').length,
    remote: todayRecords.filter((r) => r.status === 'remote').length,
    half_day: todayRecords.filter((r) => r.status === 'half_day').length,
  }

  const pendingWFH = WFH_REQUESTS.filter((r) => r.status === 'pending').length

  const handleMarkSave = (rec: Partial<AttendanceRecord>) => {
    const id = 'a' + (records.length + 1)
    setRecords((prev) => [
      ...prev.filter((r) => !(r.userId === rec.userId && r.date === rec.date)),
      { ...rec, id } as AttendanceRecord,
    ])
    toast(`Attendance marked for ${rec.userName}`, 'success')
  }

  const handleCheckOut = (id: string) => {
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, checkOut: t } : r))
    toast('Check-out recorded at ' + t, 'success')
  }

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
          <CheckInButton />
          <div className="flex items-center gap-6 text-[12px] font-mono text-text-3">
            <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office Network Required</span>
            <span className="flex items-center gap-1.5"><Home size={12} className="text-service-dev" /> WFH needs HR approval</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 self-start">
          <button
            onClick={() => setView('records')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-ui font-medium transition-colors',
              view === 'records'
                ? 'bg-surface-3 text-text-1 shadow-sm'
                : 'text-text-3 hover:text-text-2',
            )}
          >
            <Users size={14} />
            Daily Records
          </button>
          <button
            onClick={() => setView('wfh')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-ui font-medium transition-colors relative',
              view === 'wfh'
                ? 'bg-surface-3 text-text-1 shadow-sm'
                : 'text-text-3 hover:text-text-2',
            )}
          >
            <Home size={14} />
            WFH Requests
            {pendingWFH > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-[10px] font-bold text-amber-900 flex items-center justify-center">
                {pendingWFH}
              </span>
            )}
          </button>
        </div>

        {/* Daily Records view */}
        {view === 'records' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
                { label: 'Late', value: stats.late, icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
                { label: 'Absent', value: stats.absent, icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10 border-error/20' },
                { label: 'Remote', value: stats.remote, icon: Wifi, color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20' },
                { label: 'Half Day', value: stats.half_day, icon: Monitor, color: 'text-service-design', bg: 'bg-service-design/10 border-service-design/20' },
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

            {/* Attendance Table */}
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
                <Calendar size={15} className="text-text-3 flex-shrink-0" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-surface-inset border border-border-default rounded-md px-2.5 py-1.5 text-[12.5px] font-mono text-text-1 outline-none focus:border-border-focus"
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
                  onChange={(v) => setStatusFilter(v as AttendanceStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    ...Object.entries(ATTENDANCE_META).map(([k, v]) => ({ value: k, label: v.label, dot: v.dot })),
                  ]}
                />

                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toast('CSV exported', 'success')}>
                    <Download size={13} /> Export
                  </Button>
                  <Button size="sm" onClick={() => setMarkOpen(true)}>
                    <Plus size={13} /> Mark Attendance
                  </Button>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-2">
                    {['Member', 'Status', 'Check In', 'Check Out', 'Duration', 'Method', 'Note', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center font-mono text-[12px] text-text-4">
                        No records for this date / filter
                      </td>
                    </tr>
                  ) : (
                    filtered.map((rec) => {
                      let duration = '—'
                      if (rec.checkIn && rec.checkOut) {
                        const [ih, im] = rec.checkIn.split(':').map(Number)
                        const [oh, om] = rec.checkOut.split(':').map(Number)
                        const mins = (oh * 60 + om) - (ih * 60 + im)
                        duration = `${Math.floor(mins / 60)}h ${mins % 60}m`
                      }
                      return (
                        <tr key={rec.id} className="border-b border-border-subtle hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={rec.userName} size="sm" />
                              <span className="font-ui font-medium text-[13px] text-text-1">{rec.userName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><AttendanceStatusChip status={rec.status} /></td>
                          <td className="px-4 py-3 font-mono text-[12.5px] text-text-1">{rec.checkIn ?? '—'}</td>
                          <td className="px-4 py-3">
                            {rec.checkOut ? (
                              <span className="font-mono text-[12.5px] text-text-1">{rec.checkOut}</span>
                            ) : rec.checkIn ? (
                              <button
                                onClick={() => handleCheckOut(rec.id)}
                                className="flex items-center gap-1 text-[11.5px] font-ui font-semibold text-warning hover:text-warning/80 transition-colors"
                              >
                                <LogOut size={12} /> Check Out
                              </button>
                            ) : (
                              <span className="font-mono text-[12.5px] text-text-4">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px] text-text-2">{duration}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'font-mono text-[11px] uppercase tracking-wider',
                              rec.method === 'office' ? 'text-success' : rec.method === 'remote' ? 'text-service-dev' : 'text-text-3',
                            )}>
                              {rec.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-ui text-[12px] text-text-3 max-w-[160px] truncate">
                            {rec.note ?? ''}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setRecords((prev) => prev.map((r) =>
                                  r.id === rec.id
                                    ? { ...r, status: 'present' as AttendanceStatus }
                                    : r
                                ))
                                toast('Record updated', 'success')
                              }}
                              className="text-[11px] font-ui font-semibold text-text-3 hover:text-text-1 transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* WFH Requests view */}
        {view === 'wfh' && <WFHRequestsTab />}
      </div>

      <MarkModal open={markOpen} onClose={() => setMarkOpen(false)} onSave={handleMarkSave} />
    </div>
  )
}
