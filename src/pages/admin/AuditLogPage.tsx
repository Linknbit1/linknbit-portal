import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  ShieldAlert, AlertTriangle, Info, X, ChevronRight, Radio, ArrowUp,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { SeverityChip } from '../../components/shared/SeverityChip'
import { DateGroupHeading } from '../../components/shared/MonthFilter'
import { useAuditLog, useMarkAuditSeen } from '../../hooks/useAuditLog'
import { useRealtimeAuditLog } from '../../hooks/realtime/useRealtimeAuditLog'
import { useFeatureAccess } from '../../hooks/useRoleFlags'
import { useElementHeight } from '../../hooks/useElementHeight'
import { useAllPeople } from '../../hooks/usePeople'
import { cn } from '../../lib/cn'
import { groupByDate, isoDayKey } from '../../lib/dateGroups'
import { scrollAncestorToTop } from '../../lib/scroll'
import type { AuditLogRow } from '../../api/auditLog'
import type { AuditLogFilters, AuditModule, AuditSeverity } from '../../types'
import { PersonLink } from '../../components/shared/PersonLink'

// Two columns on mobile (icon + event); the rest fold in on desktop.
const ROW_GRID =
  'grid grid-cols-[18px_minmax(0,1fr)_18px] md:grid-cols-[128px_92px_minmax(0,1fr)_128px_18px] items-center gap-x-3'

const MODULE_OPTIONS = [
  { value: 'all', label: 'All modules' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'standup', label: 'Standup' },
  { value: 'gamification', label: 'Gamification' },
  { value: 'projects', label: 'Projects' },
  { value: 'chat', label: 'Chat' },
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
  standup:      'text-success border-success/25 bg-success/10',
  gamification: 'text-service-design border-[rgba(167,139,250,0.22)] bg-[rgba(167,139,250,0.1)]',
  projects:     'text-service-mkt border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.1)]',
  chat:         'text-info border-info/25 bg-info/10',
  access:       'text-brand-red border-[rgba(238,39,55,0.22)] bg-[rgba(238,39,55,0.1)]',
}
const MODULE_LABEL: Record<string, string> = {
  attendance: 'Attendance', standup: 'Standup', gamification: 'Gamification',
  projects: 'Projects', chat: 'Chat', access: 'Access',
}

const SEVERITY_ICON: Record<string, typeof Info> = { danger: ShieldAlert, warning: AlertTriangle, info: Info }

/**
 * Three sticky layers stack under the 64px Topbar: filter toolbar, column header,
 * then the day heading.
 *
 * Only the toolbar is measured (into `--audit-toolbar-h` on the page wrapper) —
 * it wraps to more rows as the window narrows, and it is always displayed, which
 * is the case a ResizeObserver reports reliably. The column header is a fixed
 * single line pinned to `COLHEAD_H`, and it disappears below `md`; a measured
 * height would go stale there, because an element switching to `display: none`
 * does not dependably deliver a resize. So the day heading mirrors the header's
 * own `hidden md:grid` with a plain responsive variant instead: no header below
 * `md`, no offset for one.
 */
const COLHEAD_H = 'h-8' /* 2rem — keep in step with the offset below */
const STICKY_COLHEAD_TOP = 'top-[calc(4rem+var(--audit-toolbar-h))]'
const STICKY_DATE_TOP =
  'top-[calc(4rem+var(--audit-toolbar-h))] md:top-[calc(4rem+var(--audit-toolbar-h)+2rem)]'

/** Falls back to a de-slugged action if a row predates readable summaries. */
function headline(row: AuditLogRow): string {
  if (row.summary && row.summary.trim()) return row.summary
  const s = row.action.replace(/\./g, ' ').replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Plain-English verb for an action, for the "What happened" line. */
function actionPhrase(action: string): string {
  const s = action.replace(/^[a-z_]+\./, '').replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const roleLabel = (role: string | null, kind: string) =>
  (role && role !== 'unknown' ? role : kind).replace(/_/g, ' ')

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

/** Layman "who / what / for what" trio. */
const FactCell = ({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) => (
  <div>
    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">{label}</p>
    <p className={cn('mt-0.5 font-ui text-[12.5px]', muted ? 'text-text-3' : 'text-text-1')}>{value}</p>
  </div>
)

const AuditDetail = ({ row }: { row: AuditLogRow }) => {
  const oldV = (row.old_values ?? {}) as Record<string, unknown>
  const newV = (row.new_values ?? {}) as Record<string, unknown>
  const context = (row.context ?? {}) as Record<string, unknown>
  const keys = diffKeys(row)
  const contextKeys = Object.keys(context)
  const forWhat = row.target_name ?? row.subject_name ?? '—'

  return (
    <div className="space-y-3.5 border-t border-border-subtle bg-surface-inset/40 px-4 py-3.5">
      {row.flagged && row.flag_reason && (
        <div className="flex items-start gap-2 rounded-md border border-[rgba(238,39,55,0.3)] bg-[rgba(238,39,55,0.08)] px-3 py-2">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-brand-red" />
          <div>
            <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-brand-red">Why this is flagged</p>
            <p className="mt-0.5 font-ui text-[12.5px]/relaxed text-text-1">{row.flag_reason}</p>
          </div>
        </div>
      )}

      {/* Layman: who / what / for what */}
      <div className="grid gap-3 rounded-md border border-border-subtle bg-surface-1/50 px-3.5 py-3 sm:grid-cols-3">
        <FactCell
          label="Who did it"
          value={
            <>
              {row.actor_id
                ? <PersonLink personId={row.actor_id}>{row.actor_name ?? 'System'}</PersonLink>
                : (row.actor_name ?? 'System')}
              {' · '}{roleLabel(row.actor_role, row.actor_kind)}
            </>
          }
        />
        <FactCell label="What happened" value={actionPhrase(row.action)} />
        <FactCell label="For / on" value={forWhat} muted={forWhat === '—'} />
      </div>

      {/* Technical footer */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] uppercase tracking-wide text-text-4">
        <span>when · {absolute(row.created_at)}</span>
        <span>module · {row.module}</span>
        <span>table · {row.table_name}</span>
        <span>op · {row.operation}</span>
        <span>action · {row.action}</span>
        <span>log id · {row.id.slice(0, 8)}</span>
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
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-4">What changed</p>
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

        {/* event — the readable sentence */}
        <div className="min-w-0">
          <p className="truncate font-ui text-[13px] text-text-1">{headline(row)}</p>
          {/* mobile meta line (columns are hidden below md) */}
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-text-4 md:hidden">
            {MODULE_LABEL[row.module] ?? row.module} · {relativeTime(row.created_at)}
          </p>
          {row.flagged && row.flag_reason && (
            <p className="mt-0.5 truncate font-ui text-[11px] text-brand-red md:hidden">{row.flag_reason}</p>
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
  /** Rows that landed while the page was open, held back until the viewer asks. */
  const [pendingCount, setPendingCount] = useState(0)

  const [toolbarRef, toolbarH] = useElementHeight<HTMLDivElement>()

  const { allowed } = useFeatureAccess('can_view_audit_log')
  useRealtimeAuditLog(allowed, useCallback(() => setPendingCount((n) => n + 1), []))

  // Opening the page clears the "new logs" badge — everything here is now seen.
  const markSeen = useMarkAuditSeen()
  useEffect(() => { if (allowed) markSeen() }, [allowed, markSeen])

  const {
    data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useAuditLog(filters)
  // Departed staff included on purpose: investigating what someone did before
  // they left is exactly what this filter is for.
  const { data: people } = useAllPeople()

  const actorOptions = useMemo(
    () => [{ value: '', label: 'All actors' }, ...(people ?? []).map((p) => ({ value: p.id, label: p.name ?? p.email ?? p.id }))],
    [people],
  )

  const patch = (p: Partial<AuditLogFilters>) => setFilters((f) => ({ ...f, ...p }))
  const clear = () => setFilters({ module: 'all', severity: 'all' })
  const hasActiveFilters =
    (filters.module && filters.module !== 'all') || (filters.severity && filters.severity !== 'all') ||
    filters.flaggedOnly || filters.actorId || filters.from || filters.to

  const pages = data?.pages
  // Offset paging can repeat a row when an insert lands mid-scroll (it never
  // skips one — the table is append-only), so the id wins over the window.
  const list = useMemo(() => {
    const seen = new Set<string>()
    const out: AuditLogRow[] = []
    for (const page of pages ?? []) {
      for (const row of page.rows) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        out.push(row)
      }
    }
    return out
  }, [pages])

  const total = pages?.[0]?.total ?? null
  const groups = useMemo(() => groupByDate(list, (r) => [isoDayKey(r.created_at)]), [list])

  const pageRef = useRef<HTMLDivElement>(null)
  const showNewEntries = () => {
    setPendingCount(0)
    void refetch()
    scrollAncestorToTop(pageRef.current)
  }

  // Auto-load the next page as the end of the list comes into view; the button
  // below it stays as the keyboard- and screen-reader-reachable equivalent.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) void fetchNextPage() },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, list.length])

  // Custom properties are outside React's CSSProperties; this cast is the only
  // way to hand a measured sticky offset to Tailwind's arbitrary calc() values.
  const stickyVars = { '--audit-toolbar-h': `${toolbarH}px` } as CSSProperties

  return (
    <>
      <Topbar title="Audit Log" />

      <div ref={pageRef} className="w-full px-4 pb-10 sm:px-6" style={stickyVars}>
        {/* Sticky toolbar — sits directly under the Topbar */}
        <div ref={toolbarRef} className="sticky top-16 z-30 -mx-4 border-b border-border-default bg-bg-base px-4 py-3 sm:-mx-6 sm:px-6">
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

        <div className="my-4 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl font-ui text-body-sm/relaxed text-text-3">
            Every action people take across attendance, gamification, projects and chat — who did it, what happened, and
            for whom. Automated system actions aren't logged. <span className="text-brand-red">Flagged</span> rows are
            likely attempts to game the system.
          </p>
          {total !== null && list.length > 0 && (
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-4">
              {list.length.toLocaleString()} of {total.toLocaleString()}
            </span>
          )}
        </div>

        {/* New rows arrive live but never reflow the list mid-read — the viewer asks. */}
        {pendingCount > 0 && (
          <button
            onClick={showNewEntries}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 font-ui text-[12px] font-medium text-text-1 transition-colors hover:bg-surface-3 motion-reduce:transition-none"
          >
            <ArrowUp size={13} className="text-service-dev" />
            {pendingCount === 1 ? '1 new entry' : `${pendingCount} new entries`}
          </button>
        )}

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
          // overflow-clip, not overflow-hidden: hidden makes this a scroll
          // container, which would confine every sticky child to it and stop the
          // headers from pinning to the viewport.
          <div className="overflow-clip rounded-xl border border-border-default bg-surface-1">
            {/* Column header (desktop) — pins under the filter toolbar */}
            <div
              className={cn(
                ROW_GRID, STICKY_COLHEAD_TOP, COLHEAD_H,
                'sticky z-20 hidden border-b border-border-default bg-surface-2 px-4 font-mono text-[10px] uppercase tracking-wider text-text-4 md:grid',
              )}
            >
              <span>Time</span>
              <span>Severity</span>
              <span>What happened</span>
              <span>Module</span>
              <span />
            </div>

            {groups.map((group) => (
              <div key={group.date}>
                <DateGroupHeading
                  date={group.date}
                  count={group.items.length}
                  className={cn(STICKY_DATE_TOP, 'px-4')}
                />
                <div className="divide-y divide-border-subtle">
                  {group.items.map((row) => (
                    <AuditRow
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {list.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center pt-5">
            {hasNextPage ? (
              <Button
                variant="secondary"
                size="sm"
                loading={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading' : 'Load older entries'}
              </Button>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-4">
                End of the log
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default AuditLogPage
