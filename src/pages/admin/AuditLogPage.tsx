import { useMemo, useState } from 'react'
import {
  ShieldAlert, AlertTriangle, Info, Filter, X, ChevronRight,
  Radio, CalendarClock,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Toggle } from '../../components/ui/Toggle'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { SeverityChip } from '../../components/shared/SeverityChip'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useRealtimeAuditLog } from '../../hooks/realtime/useRealtimeAuditLog'
import { useFeatureAccess } from '../../hooks/useRoleFlags'
import { usePeople } from '../../hooks/usePeople'
import { cn } from '../../lib/cn'
import type { AuditLogRow } from '../../api/auditLog'
import type { AuditLogFilters, AuditModule, AuditSeverity } from '../../types'

const MODULE_OPTIONS = [
  { value: 'all', label: 'All modules' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'gamification', label: 'Gamification' },
  { value: 'projects', label: 'Projects' },
  { value: 'access', label: 'Access' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'danger', label: 'Danger' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

const MODULE_LABEL: Record<string, string> = {
  attendance: 'Attendance', gamification: 'Gamification', projects: 'Projects', access: 'Access',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Fields to show in the expanded diff, per operation. */
function diffKeys(row: AuditLogRow): string[] {
  const drop = new Set(['updated_at', 'id'])
  if (row.operation === 'UPDATE') {
    return (row.changed_fields ?? []).filter((k) => !drop.has(k))
  }
  const source = (row.operation === 'DELETE' ? row.old_values : row.new_values) as Record<string, unknown> | null
  if (!source) return []
  return Object.keys(source).filter((k) => !drop.has(k))
}

interface DetailProps { row: AuditLogRow }

const AuditDetail = ({ row }: DetailProps) => {
  const oldV = (row.old_values ?? {}) as Record<string, unknown>
  const newV = (row.new_values ?? {}) as Record<string, unknown>
  const context = (row.context ?? {}) as Record<string, unknown>
  const keys = diffKeys(row)
  const contextKeys = Object.keys(context)

  return (
    <div className="border-t border-border-subtle bg-surface-inset/40 px-4 py-3.5 space-y-3.5">
      {row.flagged && row.flag_reason && (
        <div className="flex items-start gap-2 rounded-md border border-[rgba(238,39,55,0.3)] bg-[rgba(238,39,55,0.08)] px-3 py-2">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-brand-red" />
          <p className="font-ui text-[12.5px] leading-relaxed text-text-1">{row.flag_reason}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] uppercase tracking-wide text-text-4">
        <span>module · {row.module}</span>
        <span>table · {row.table_name}</span>
        <span>op · {row.operation}</span>
        <span>actor · {row.actor_role ?? 'unknown'} / {row.actor_kind}</span>
        {row.record_id && <span>record · {row.record_id.slice(0, 8)}</span>}
      </div>

      {contextKeys.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-4">Context</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {contextKeys.map((k) => (
              <div key={k} className="flex gap-2 font-mono text-[11.5px]">
                <span className="text-text-4">{k}:</span>
                <span className="text-text-2 break-all">{renderValue(context[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {keys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-mono text-[11.5px]">
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
                    <td className="py-1 pr-4 text-text-4 break-all line-through decoration-text-4/40">{renderValue(oldV[k])}</td>
                  )}
                  <td className="py-1 text-text-1 break-all">
                    {renderValue(row.operation === 'DELETE' ? oldV[k] : newV[k])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const SEVERITY_ICON: Record<string, typeof Info> = {
  danger: ShieldAlert, warning: AlertTriangle, info: Info,
}

interface RowProps { row: AuditLogRow; expanded: boolean; onToggle: () => void }

const AuditRow = ({ row, expanded, onToggle }: RowProps) => {
  const Icon = SEVERITY_ICON[row.severity] ?? Info
  return (
    <div
      className={cn(
        'rounded-lg border bg-surface-1 transition-colors',
        row.flagged ? 'border-[rgba(238,39,55,0.28)]' : 'border-border-default',
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon
          size={16}
          className={cn(
            'shrink-0',
            row.severity === 'danger' ? 'text-brand-red'
              : row.severity === 'warning' ? 'text-service-mkt' : 'text-text-4',
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[13.5px] text-text-1">{row.summary}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10.5px] text-text-4">
            <span className="uppercase tracking-wide">{MODULE_LABEL[row.module] ?? row.module}</span>
            <span>·</span>
            <span>{row.action}</span>
            <span>·</span>
            <span title={absoluteTime(row.created_at)}>{relativeTime(row.created_at)}</span>
          </div>
        </div>
        <SeverityChip severity={row.severity} className="hidden sm:inline-flex" />
        <ChevronRight
          size={16}
          className={cn('shrink-0 text-text-4 transition-transform', expanded && 'rotate-90')}
        />
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
    () => [
      { value: '', label: 'All actors' },
      ...(people ?? []).map((p) => ({ value: p.id, label: p.name ?? p.email ?? p.id })),
    ],
    [people],
  )

  const stats = useMemo(() => {
    const list = rows ?? []
    return {
      total: list.length,
      danger: list.filter((r) => r.severity === 'danger').length,
      warning: list.filter((r) => r.severity === 'warning').length,
      flagged: list.filter((r) => r.flagged).length,
    }
  }, [rows])

  const patch = (p: Partial<AuditLogFilters>) => setFilters((f) => ({ ...f, ...p }))
  const clear = () => setFilters({ module: 'all', severity: 'all' })

  const hasActiveFilters =
    (filters.module && filters.module !== 'all') ||
    (filters.severity && filters.severity !== 'all') ||
    filters.flaggedOnly || filters.actorId || filters.from || filters.to

  return (
    <>
      <Topbar title="Audit Log" />
      <div className="mx-auto max-w-content px-4 py-6 sm:px-8">
        {/* Intro + live indicator */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl font-ui text-body-sm/relaxed text-text-3">
            Every flaggable action across attendance, gamification and projects — who did it,
            for whom, and what changed. Flagged entries are likely attempts to game the system.
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-1 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wide text-text-3">
            <Radio size={12} className="text-service-dev" /> Live
          </span>
        </div>

        {/* Stat row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Events shown" value={stats.total} tone="neutral" />
          <StatTile label="Danger" value={stats.danger} tone="danger" />
          <StatTile label="Warning" value={stats.warning} tone="warning" />
          <StatTile label="Flagged" value={stats.flagged} tone="danger" />
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border-default bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-1.5 self-center font-ui text-[12px] text-text-4">
            <Filter size={13} /> Filters
          </div>
          <Select
            value={filters.module ?? 'all'}
            onChange={(v) => patch({ module: v as AuditModule | 'all' })}
            options={MODULE_OPTIONS}
            size="sm"
          />
          <Select
            value={filters.severity ?? 'all'}
            onChange={(v) => patch({ severity: v as AuditSeverity | 'all' })}
            options={SEVERITY_OPTIONS}
            size="sm"
          />
          <Select
            value={filters.actorId ?? ''}
            onChange={(v) => patch({ actorId: v || undefined })}
            options={actorOptions}
            size="sm"
          />
          <div className="flex items-center gap-1.5">
            <CalendarClock size={13} className="text-text-4" />
            <DatePicker value={filters.from ?? ''} onChange={(v) => patch({ from: v || undefined })} placeholder="From" className="w-36" />
            <span className="text-text-4">–</span>
            <DatePicker value={filters.to ?? ''} onChange={(v) => patch({ to: v || undefined })} placeholder="To" className="w-36" />
          </div>
          <Toggle
            checked={!!filters.flaggedOnly}
            onChange={(v) => patch({ flaggedOnly: v || undefined })}
            label="Flagged only"
          />
          <span className="self-center font-ui text-[12px] text-text-3">Flagged only</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="ml-auto">
              <X size={13} /> Clear
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : (rows ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
            <ShieldAlert size={28} className="mb-3 text-text-4" />
            <p className="font-ui text-[14px] font-semibold text-text-2">No matching activity</p>
            <p className="mt-1 font-ui text-[12.5px] text-text-4">
              {hasActiveFilters ? 'Try widening the filters.' : 'Actions will appear here as they happen.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {(rows ?? []).map((row) => (
              <AuditRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

interface StatTileProps { label: string; value: number; tone: 'neutral' | 'warning' | 'danger' }

const StatTile = ({ label, value, tone }: StatTileProps) => (
  <div className="rounded-lg border border-border-default bg-surface-1 px-4 py-3">
    <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">{label}</p>
    <p
      className={cn(
        'mt-1 font-display text-[22px] font-bold tabular-nums',
        tone === 'danger' ? 'text-brand-red' : tone === 'warning' ? 'text-service-mkt' : 'text-text-1',
      )}
    >
      {value}
    </p>
  </div>
)

export default AuditLogPage
