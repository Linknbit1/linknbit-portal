import { useMemo, useState } from 'react'
import {
  ShieldAlert, AlertTriangle, Info, X, ChevronRight, Radio, ArrowRight,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Skeleton } from '../../components/ui/Skeleton'
import { SeverityChip } from '../../components/shared/SeverityChip'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useRealtimeAuditLog } from '../../hooks/realtime/useRealtimeAuditLog'
import { useFeatureAccess } from '../../hooks/useRoleFlags'
import { usePeople } from '../../hooks/usePeople'
import { cn } from '../../lib/cn'
import type { AuditLogRow } from '../../api/auditLog'
import type { AuditLogFilters, AuditModule, AuditSeverity } from '../../types'

// Shared grid template so the header row and every data row align column-for-column.
const ROW_GRID =
  'grid grid-cols-[20px_minmax(0,1fr)_auto] md:grid-cols-[132px_96px_minmax(0,1fr)_168px_150px_128px_20px] items-center gap-x-3'

const MODULE_OPTIONS = [
  { value: 'all', label: 'All modules' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'gamification', label: 'Gamification' },
  { value: 'projects', label: 'Projects' },
  { value: 'access', label: 'Access' },
]

const SEVERITY_SEGMENTS: { value: AuditSeverity | 'all'; label: string; active: string }[] = [
  { value: 'all',     label: 'All',     active: 'bg-surface-3 text-text-1' },
  { value: 'danger',  label: 'Danger',  active: 'bg-[rgba(238,39,55,0.16)] text-brand-red' },
  { value: 'warning', label: 'Warning', active: 'bg-[rgba(251,191,36,0.16)] text-service-mkt' },
  { value: 'info',    label: 'Info',    active: 'bg-surface-3 text-text-1' },
]

const MODULE_CHIP: Record<string, string> = {
  attendance:   'text-service-dev border-[rgba(34,211,238,0.22)] bg-[rgba(34,211,238,0.1)]',
  gamification: 'text-service-design border-[rgba(167,139,250,0.22)] bg-[rgba(167,139,250,0.1)]',
  projects:     'text-service-mkt border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.1)]',
  access:       'text-brand-red border-[rgba(238,39,55,0.22)] bg-[rgba(238,39,55,0.1)]',
}
const MODULE_LABEL: Record<string, string> = {
  attendance: 'Attendance', gamification: 'Gamification', projects: 'Projects', access: 'Access',
}

const SEVERITY_ICON: Record<string, typeof Info> = { danger: ShieldAlert, warning: AlertTriangle, info: Info }

function humanize(action: string): string {
  const s = action.replace(/\./g, ' ').replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
const timeHM = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const dateMD = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const absolute = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function diffKeys(row: AuditLogRow): string[] {
  const drop = new Set(['updated_at', 'id'])
  if (row.operation === 'UPDATE') return (row.changed_fields ?? []).filter((k) => !drop.has(k))
  const src = (row.operation === 'DELETE' ? row.old_values : row.new_values) as Record<string, unknown> | null
  return src ? Object.keys(src).filter((k) => !drop.has(k)) : []
}

const ModuleChip = ({ module }: { module: string }) => (
  <span className={cn('inline-flex items-center rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide', MODULE_CHIP[module] ?? 'text-text-3 border-border-default bg-surface-2')}>
    {MODULE_LABEL[module] ?? module}
  </span>
)

const AuditDetail = ({ row }: { row: AuditLogRow }) => {
  const oldV = (row.old_values ?? {}) as Record<string, unknown>
  const newV = (row.new_values ?? {}) as Record<string, unknown>
  const context = (row.context ?? {}) as Record<string, unknown>
  const keys = diffKeys(row)
  const contextKeys = Object.keys(context)

  return (
    <div className="space-y-3.5 border-t border-border-subtle bg-surface-inset/40 px-4 py-3.5">
      {row.flagged && row.flag_reason && (
        <div className="flex items-start gap-2 rounded-md border border-[rgba(238,39,55,0.3)] bg-[rgba(238,39,55,0.08)] px-3 py-2">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-brand-red" />
          <p className="font-ui text-[12.5px]/relaxed text-text-1">{row.flag_reason}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] uppercase tracking-wide text-text-4">
        <span>module · {row.module}</span>
        <span>table · {row.table_name}</span>
        <span>op · {row.operation}</span>
        <span>actor · {row.actor_role ?? 'unknown'} / {row.actor_kind}</span>
        <span>when · {absolute(row.created_at)}</span>
        {row.record_id && <span>record · {row.record_id.slice(0, 8)}</span>}
      </div>

      {contextKeys.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-4">Context</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {contextKeys.map((k) => (
              <div key={k} className="flex gap-2 font-mono text-[11.5px]">
                <span className="text-text-4">{k}:</span>
                <span className="break-all text-text-2">{renderValue(context[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {keys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-105 border-collapse font-mono text-[11.5px]">
            <thead>
              <tr className="text-left text-text-4">
                <th className="py-1 pr-4 font-medium">Field</th>
                {row.operation === 'UPDATE' && <th className="py-1 pr-4 font-medium">Before</th>}
                <th className="py-1 font-medium">{row.operation === 'DELETE' ? 'Removed value' : row.operation === 'INSERT' ? 'Value' : 'After'}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k} className="border-t border-border-subtle align-top">
                  <td className="py-1 pr-4 text-text-3">{k}</td>
                  {row.operation === 'UPDATE' && (
                    <td className="break-all py-1 pr-4 text-text-4 line-through decoration-text-4/40">{renderValue(oldV[k])}</td>
                  )}
                  <td className="break-all py-1 text-text-1">{renderValue(row.operation === 'DELETE' ? oldV[k] : newV[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface RowProps { row: AuditLogRow; expanded: boolean; onToggle: () => void }

const AuditRow = ({ row, expanded, onToggle }: RowProps) => {
  const Icon = SEVERITY_ICON[row.severity] ?? Info
  const iconTone = row.severity === 'danger' ? 'text-brand-red' : row.severity === 'warning' ? 'text-service-mkt' : 'text-text-4'

  return (
    <div className={cn(row.flagged && 'bg-[rgba(238,39,55,0.035)]')}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          ROW_GRID,
          'w-full px-4 py-2.5 text-left transition-colors motion-reduce:transition-none',
          row.flagged ? 'hover:bg-[rgba(238,39,55,0.06)]' : 'hover:bg-surface-2',
        )}
      >
        {/* col 1 (mobile): severity dot */}
        <Icon size={15} className={cn('shrink-0 md:hidden', iconTone)} />

        {/* col 1 (md): time */}
        <div className="hidden md:block" title={absolute(row.created_at)}>
          <p className="font-mono text-[11.5px] tabular-nums text-text-2">{timeHM(row.created_at)}</p>
          <p className="font-mono text-[10px] text-text-4">{dateMD(row.created_at)}</p>
        </div>

        {/* col 2 (md): severity chip */}
        <div className="hidden md:flex"><SeverityChip severity={row.severity} /></div>

        {/* event (always) */}
        <div className="min-w-0">
          <p className="truncate font-ui text-[13px] text-text-1">{humanize(row.action)}</p>
          {/* mobile context (columns are hidden below md) */}
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-text-4 md:hidden">
            {row.actor_name}{row.subject_name ? ` → ${row.subject_name}` : ''} · {MODULE_LABEL[row.module] ?? row.module} · {relativeTime(row.created_at)}
          </p>
          <p className="mt-0.5 hidden truncate font-mono text-[10.5px] text-text-4 md:block">{row.action}</p>
          {row.flagged && row.flag_reason && (
            <p className="mt-0.5 truncate font-ui text-[11px] text-brand-red">{row.flag_reason}</p>
          )}
        </div>

        {/* actor (md) */}
        <div className="hidden min-w-0 md:block">
          <p className="truncate font-ui text-[12.5px] text-text-2">{row.actor_name ?? '—'}</p>
          <p className="truncate font-mono text-[10px] text-text-4">{row.actor_role ?? row.actor_kind}</p>
        </div>

        {/* subject (md) */}
        <div className="hidden min-w-0 items-center gap-1 md:flex">
          {row.subject_name ? (
            <>
              <ArrowRight size={11} className="shrink-0 text-text-4" />
              <span className="truncate font-ui text-[12.5px] text-text-2">{row.subject_name}</span>
            </>
          ) : (
            <span className="font-mono text-[11px] text-text-4">—</span>
          )}
        </div>

        {/* module (md) */}
        <div className="hidden md:flex"><ModuleChip module={row.module} /></div>

        {/* chevron (always) */}
        <ChevronRight size={16} className={cn('shrink-0 justify-self-end text-text-4 transition-transform motion-reduce:transition-none', expanded && 'rotate-90')} />
      </button>
      {expanded && <AuditDetail row={row} />}
    </div>
  )
}

const AuditLogPage = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({ module: 'all', severity: 'all' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { allowed } = useFeatureAccess('can_view_audit_log')
  useRealtimeAuditLog(allowed)

  const { data: rows, isLoading } = useAuditLog(filters)
  const { data: people } = usePeople()

  const actorOptions = useMemo(
    () => [{ value: '', label: 'All actors' }, ...(people ?? []).map((p) => ({ value: p.id, label: p.name ?? p.email ?? p.id }))],
    [people],
  )

  const stats = useMemo(() => {
    const list = rows ?? []
    return {
      total: list.length,
      danger: list.filter((r) => r.severity === 'danger').length,
      flagged: list.filter((r) => r.flagged).length,
    }
  }, [rows])

  const patch = (p: Partial<AuditLogFilters>) => setFilters((f) => ({ ...f, ...p }))
  const clear = () => setFilters({ module: 'all', severity: 'all' })
  const hasActiveFilters =
    (filters.module && filters.module !== 'all') || (filters.severity && filters.severity !== 'all') ||
    filters.flaggedOnly || filters.actorId || filters.from || filters.to

  const list = rows ?? []

  return (
    <>
      <Topbar title="Audit Log" />

      <div className="w-full px-4 pb-10 sm:px-6">
        {/* Sticky toolbar — sits directly under the Topbar */}
        <div className="sticky top-16 z-30 -mx-4 border-b border-border-default bg-bg-base px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Severity segmented control */}
            <div className="inline-flex items-center rounded-md border border-border-default bg-surface-inset p-0.5">
              {SEVERITY_SEGMENTS.map((s) => {
                const on = (filters.severity ?? 'all') === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => patch({ severity: s.value })}
                    className={cn(
                      'rounded-sm px-2.5 py-1 font-ui text-[12px] font-medium transition-colors motion-reduce:transition-none',
                      on ? s.active : 'text-text-3 hover:text-text-1',
                    )}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>

            <span className="hidden h-5 w-px bg-border-default sm:block" />

            <Select value={filters.module ?? 'all'} onChange={(v) => patch({ module: v as AuditModule | 'all' })} options={MODULE_OPTIONS} size="sm" />
            <Select value={filters.actorId ?? ''} onChange={(v) => patch({ actorId: v || undefined })} options={actorOptions} size="sm" />

            <div className="flex items-center gap-1.5">
              <DatePicker value={filters.from ?? ''} onChange={(v) => patch({ from: v || undefined })} placeholder="From" className="w-32" />
              <span className="text-text-4">–</span>
              <DatePicker value={filters.to ?? ''} onChange={(v) => patch({ to: v || undefined })} placeholder="To" className="w-32" />
            </div>

            <button
              onClick={() => patch({ flaggedOnly: filters.flaggedOnly ? undefined : true })}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-ui text-[12px] font-medium transition-colors motion-reduce:transition-none',
                filters.flaggedOnly
                  ? 'border-[rgba(238,39,55,0.4)] bg-[rgba(238,39,55,0.1)] text-brand-red'
                  : 'border-border-default text-text-3 hover:text-text-1',
              )}
            >
              <ShieldAlert size={13} /> Flagged
            </button>

            <div className="ml-auto flex items-center gap-3">
              <p className="font-mono text-[11px] text-text-4">
                <span className="text-text-2">{stats.total}</span> shown
                {stats.danger > 0 && <> · <span className="text-brand-red">{stats.danger} danger</span></>}
                {stats.flagged > 0 && <> · <span className="text-brand-red">{stats.flagged} flagged</span></>}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-1 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text-3">
                <Radio size={11} className="text-service-dev" /> Live
              </span>
              {hasActiveFilters && (
                <button onClick={clear} className="inline-flex items-center gap-1 font-ui text-[12px] text-text-3 transition-colors hover:text-text-1 motion-reduce:transition-none">
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mb-4 mt-4 max-w-3xl font-ui text-body-sm/relaxed text-text-3">
          Every flaggable action across attendance, gamification and projects — who did it, for whom, and what
          changed. <span className="text-brand-red">Flagged</span> rows are likely attempts to game the system.
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default py-20 text-center">
            <ShieldAlert size={30} className="mb-3 text-text-4" />
            <p className="font-ui text-[14px] font-semibold text-text-2">No matching activity</p>
            <p className="mt-1 font-ui text-[12.5px] text-text-4">
              {hasActiveFilters ? 'Try widening the filters.' : 'Actions will appear here as they happen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
            {/* Column header (desktop) */}
            <div className={cn(ROW_GRID, 'hidden border-b border-border-default bg-surface-2/50 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-text-4 md:grid')}>
              <span>Time</span>
              <span>Severity</span>
              <span>Event</span>
              <span>Actor</span>
              <span>Subject</span>
              <span>Module</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {list.map((row) => (
                <AuditRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default AuditLogPage
