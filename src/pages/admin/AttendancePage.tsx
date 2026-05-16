import { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, Clock, LogOut, Users, Calendar,
  AlertTriangle, Wifi, Monitor, Search,
  Download, Plus, X, Check,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { ATTENDANCE_RECORDS, USERS } from '../../data/mock'
import type { AttendanceRecord, AttendanceStatus } from '../../types'
import { cn } from '../../lib/cn'

const STATUS_META: Record<AttendanceStatus, { label: string; cls: string; dot: string }> = {
  present:  { label: 'Present',  cls: 'bg-success/10 text-success border-success/30',   dot: '#22C55E' },
  late:     { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/30',   dot: '#F59E0B' },
  absent:   { label: 'Absent',   cls: 'bg-error/10 text-error border-error/30',         dot: '#F4364C' },
  remote:   { label: 'Remote',   cls: 'bg-service-dev/10 text-service-dev border-service-dev/30', dot: '#22D3EE' },
  half_day: { label: 'Half Day', cls: 'bg-service-design/10 text-service-design border-service-design/30', dot: '#A78BFA' },
}

function StatusChip({ status }: { status: AttendanceStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-ui font-semibold border', m.cls)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

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
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!userId}>
            <Check size={14} /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---- Main Page ---- */
export default function AttendancePage() {
  const toast = useToast()
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
            <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office Network</span>
            <span className="flex items-center gap-1.5"><Monitor size={12} className="text-service-dev" /> Remote Available</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
            { label: 'Late', value: stats.late, icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
            { label: 'Absent', value: stats.absent, icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10 border-error/20' },
            { label: 'Remote', value: stats.remote, icon: Wifi, color: 'text-service-dev', bg: 'bg-service-dev/10 border-service-dev/20' },
            { label: 'Half Day', value: stats.half_day, icon: Users, color: 'text-service-design', bg: 'bg-service-design/10 border-service-design/20' },
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
          {/* Toolbar */}
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
                ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label, dot: v.dot })),
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

          {/* Table */}
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
                      <td className="px-4 py-3"><StatusChip status={rec.status} /></td>
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
      </div>

      <MarkModal open={markOpen} onClose={() => setMarkOpen(false)} onSave={handleMarkSave} />
    </div>
  )
}
