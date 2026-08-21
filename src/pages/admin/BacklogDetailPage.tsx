import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock, Users, FolderKanban, AlertTriangle, Info } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { QueryError } from '../../components/ui/QueryError'
import { PersonLink } from '../../components/shared/PersonLink'
import { useToast } from '../../components/ui/toast-context'
import {
  useProjectBacklog, useEmployeeBacklog, useProjectDetail, useEmployeeDetail,
} from '../../hooks/useReports'
import { RangePicker, VarianceChip, ExportButton } from '../../components/reports/ReportControls'
import { resolvePreset, type DateRange, type RangePreset } from '../../components/reports/reportRange'
import { downloadCsv } from '../../lib/csv'
import { formatMinutes } from '../../lib/duration'
import { cn } from '../../lib/cn'

/**
 * One project, or one person, in full.
 *
 * The range lives in the URL rather than in state, so a link to this screen
 * carries the window it was read in — "look at Cricket Sansar for August" is a
 * link somebody can paste, not an instruction to fiddle with a date picker.
 */
function useUrlRange(): {
  preset: RangePreset
  setPreset: (p: RangePreset) => void
  custom: DateRange
  setCustom: (r: DateRange) => void
  range: DateRange
} {
  const [params, setParams] = useSearchParams()

  const preset = (params.get('preset') as RangePreset) || 'month'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  const custom: DateRange = {
    from: from || resolvePreset('month').from,
    to: to || resolvePreset('month').to,
  }
  const range = preset === 'custom' ? custom : resolvePreset(preset as Exclude<RangePreset, 'custom'>)

  const write = (next: Partial<{ preset: RangePreset; from: string; to: string }>) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v)
      else merged.delete(k)
    }
    // replace, not push: stepping through ranges should not bury the back button.
    setParams(merged, { replace: true })
  }

  return {
    preset,
    setPreset: (p) => write({ preset: p }),
    custom,
    setCustom: (r) => write({ preset: 'custom', from: r.from, to: r.to }),
    range,
  }
}

/* ── Project ─────────────────────────────────────────────────────────────── */

export default function ProjectBacklogDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { preset, setPreset, custom, setCustom, range } = useUrlRange()

  const { data: summaryRows = [] } = useProjectBacklog(range.from, range.to)
  const { data: rows = [], isLoading, error } = useProjectDetail(id, range.from, range.to)
  const summary = summaryRows.find((r) => r.project_id === id)

  const totals = useMemo(() => rows.reduce(
    (a, r) => ({ timer: a.timer + r.timer_minutes, standup: a.standup + r.standup_minutes }),
    { timer: 0, standup: 0 },
  ), [rows])

  const exportCsv = () => {
    if (rows.length === 0) { toast('Nothing to export', 'error'); return }
    downloadCsv(
      `project-backlog_${(summary?.project_name ?? 'project').replace(/\W+/g, '-')}_${range.from}_to_${range.to}.csv`,
      ['Person', 'Timer (minutes)', 'Standup (minutes)', 'Variance (minutes)', 'Tasks'],
      rows.map((r) => [
        r.profile_name ?? '', r.timer_minutes, r.standup_minutes, r.variance_minutes, r.tasks,
      ]),
    )
    toast(`Exported ${rows.length} people`, 'success')
  }

  return (
    <DetailShell
      backLabel="Project backlog"
      title={summary?.project_name ?? 'Project'}
      subtitle={summary?.client_name ?? undefined}
      preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom}
      onExport={exportCsv} exportDisabled={rows.length === 0}
      summary={[
        { label: 'Tracked on the timer', value: formatMinutes(totals.timer), icon: Clock },
        { label: 'Accounted for in standups', value: formatMinutes(totals.standup), icon: Users },
        { label: 'People involved', value: String(rows.length), icon: Users },
        ...(summary?.budget
          ? [{ label: 'Budget', value: Number(summary.budget).toLocaleString(), icon: FolderKanban }]
          : []),
      ]}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <QueryError error={error} label="This report" />
      ) : rows.length === 0 ? (
        <Empty label="Nobody recorded time on this project in this range." />
      ) : (
        <Table head={['Person', 'Timer', 'Standup', 'Variance', 'Tasks']}>
          {rows.map((r) => (
            <Row key={r.profile_id}>
              <Cell>
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.profile_name ?? ''} src={r.avatar_url ?? undefined} size="sm" personId={r.profile_id} />
                  <PersonLink personId={r.profile_id} className="truncate font-ui text-[13px] font-medium text-text-1">
                    {r.profile_name}
                  </PersonLink>
                </span>
              </Cell>
              <Num>{formatMinutes(r.timer_minutes)}</Num>
              <Num>{formatMinutes(r.standup_minutes)}</Num>
              <Cell align="right"><VarianceChip minutes={r.variance_minutes} /></Cell>
              <Num muted>{r.tasks}</Num>
            </Row>
          ))}
        </Table>
      )}
    </DetailShell>
  )
}

/* ── Employee ────────────────────────────────────────────────────────────── */

export function EmployeeBacklogDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { preset, setPreset, custom, setCustom, range } = useUrlRange()

  const { data: summaryRows = [] } = useEmployeeBacklog(range.from, range.to)
  const { data: rows = [], isLoading, error } = useEmployeeDetail(id, range.from, range.to)
  const summary = summaryRows.find((r) => r.profile_id === id)

  const exportCsv = () => {
    if (rows.length === 0) { toast('Nothing to export', 'error'); return }
    downloadCsv(
      `employee-backlog_${(summary?.profile_name ?? 'person').replace(/\W+/g, '-')}_${range.from}_to_${range.to}.csv`,
      ['Project', 'Client', 'Timer (minutes)', 'Standup (minutes)', 'Variance (minutes)', 'Tasks'],
      rows.map((r) => [
        r.project_name ?? '', r.client_name ?? '',
        r.timer_minutes, r.standup_minutes, r.variance_minutes, r.tasks,
      ]),
    )
    toast(`Exported ${rows.length} projects`, 'success')
  }

  const shortfall = summary && summary.required_minutes > 0
    ? summary.standup_minutes - summary.required_minutes
    : 0

  return (
    <DetailShell
      backLabel="Employee backlog"
      title={summary?.profile_name ?? 'Person'}
      subtitle={summary?.role?.replace(/_/g, ' ')}
      avatar={{ name: summary?.profile_name ?? '', url: summary?.avatar_url ?? undefined, id }}
      preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom}
      onExport={exportCsv} exportDisabled={rows.length === 0}
      summary={[
        { label: 'Tracked on the timer', value: formatMinutes(summary?.timer_minutes ?? 0), icon: Clock },
        { label: 'Accounted for in standups', value: formatMinutes(summary?.standup_minutes ?? 0), icon: Users },
        { label: 'Required', value: formatMinutes(summary?.required_minutes ?? 0), icon: Info },
        { label: 'Projects', value: String(rows.length), icon: FolderKanban },
      ]}
    >
      {/* The two figures that only make sense for a person. */}
      {summary && (summary.makeup_balance_minutes > 0 || shortfall < 0) && (
        <div className="flex flex-col gap-2">
          {summary.makeup_balance_minutes > 0 && (
            <Callout tone="warning">
              <span className="font-semibold">{formatMinutes(summary.makeup_balance_minutes)}</span> of
              make-up time still owed — unpaid hours from an approved exception.
              {summary.made_up_minutes > 0 && (
                <> {formatMinutes(summary.made_up_minutes)} of {formatMinutes(summary.unpaid_minutes)} has
                been worked back so far.</>
              )}
            </Callout>
          )}
          {shortfall < 0 && (
            <Callout tone="error">
              <span className="font-semibold">{formatMinutes(-shortfall)}</span> short of the hours
              required over this range.
            </Callout>
          )}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <QueryError error={error} label="This report" />
      ) : rows.length === 0 ? (
        <Empty label="No time recorded in this range." />
      ) : (
        <Table head={['Project', 'Timer', 'Standup', 'Variance', 'Tasks']}>
          {rows.map((r) => (
            <Row key={r.project_id ?? 'other'}>
              <Cell>
                {r.project_id ? (
                  <Link to={`/admin/projects/${r.project_id}`} className="block truncate font-ui text-[13px] font-medium text-text-1 hover:text-brand-red">
                    {r.project_name}
                  </Link>
                ) : (
                  /* Ad-hoc standup work — real hours with no project behind them. */
                  <span className="block truncate font-ui text-[13px] italic text-text-3">{r.project_name}</span>
                )}
                {r.client_name && <span className="block font-ui text-[11px] text-text-4">{r.client_name}</span>}
              </Cell>
              <Num>{formatMinutes(r.timer_minutes)}</Num>
              <Num>{formatMinutes(r.standup_minutes)}</Num>
              <Cell align="right"><VarianceChip minutes={r.variance_minutes} /></Cell>
              <Num muted>{r.tasks}</Num>
            </Row>
          ))}
        </Table>
      )}
    </DetailShell>
  )
}

/* ── The frame both share ────────────────────────────────────────────────── */

interface DetailShellProps {
  backLabel: string
  title: string
  subtitle?: string
  avatar?: { name: string; url?: string; id: string }
  preset: RangePreset
  setPreset: (p: RangePreset) => void
  custom: DateRange
  setCustom: (r: DateRange) => void
  onExport: () => void
  exportDisabled: boolean
  summary: { label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]
  children: React.ReactNode
}

function DetailShell({
  backLabel, title, subtitle, avatar, preset, setPreset, custom, setCustom,
  onExport, exportDisabled, summary, children,
}: DetailShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <Topbar title={title} back />
      <div className="flex flex-col gap-5 p-4 lg:px-8 lg:py-7">
        <Link
          to="/admin/reports"
          className="flex w-fit items-center gap-1.5 font-ui text-[12px] text-text-3 transition-colors hover:text-text-1"
        >
          <ArrowLeft size={13} /> {backLabel}
        </Link>

        <div className="flex items-center gap-3">
          {avatar && <Avatar name={avatar.name} src={avatar.url} size="lg" personId={avatar.id} />}
          <div className="min-w-0">
            <h2 className="truncate font-display text-[22px] font-bold text-text-1">{title}</h2>
            {subtitle && <p className="font-ui text-[13px] capitalize text-text-3">{subtitle}</p>}
          </div>
        </div>

        <RangePicker
          preset={preset} onPreset={setPreset}
          custom={custom} onCustom={setCustom}
          actions={<ExportButton onExport={onExport} disabled={exportDisabled} />}
        />

        <p className="flex items-start gap-2 rounded-md border border-border-subtle bg-surface-2/40 px-3 py-2.5 font-ui text-[11.5px] text-text-3">
          <Info size={13} className="mt-0.5 shrink-0 text-text-4" />
          <span>
            <span className="font-medium text-text-2">Timer</span> is time tracked against a task;{' '}
            <span className="font-medium text-text-2">Standup</span> is what was written up at the end of
            the day. They are never added together — the{' '}
            <span className="font-medium text-text-2">variance</span> between them is the number worth
            reading.
          </span>
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-1 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
                <s.icon size={15} className="text-text-3" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[17px] font-bold text-text-1">{s.value}</span>
                <span className="block font-ui text-[11px] text-text-4">{s.label}</span>
              </span>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  )
}

function Callout({ tone, children }: { tone: 'warning' | 'error'; children: React.ReactNode }) {
  return (
    <p className={cn(
      'flex items-start gap-2 rounded-md border px-3 py-2.5 font-ui text-[12px]',
      tone === 'warning' ? 'border-warning/30 bg-warning/8 text-warning' : 'border-error/30 bg-error/8 text-error',
    )}>
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-1">
      <table className="w-full min-w-160">
        <thead>
          <tr className="border-b border-border-subtle">
            {head.map((h, i) => (
              <th
                key={h}
                className={cn(
                  'px-4 py-2.5 font-ui text-[11px] font-semibold uppercase tracking-wider text-text-4',
                  i === 0 ? 'text-left' : 'text-right',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b border-border-subtle last:border-0 hover:bg-surface-2/40">{children}</tr>
)

const Cell = ({ children, align }: { children: React.ReactNode; align?: 'right' }) => (
  <td className={cn('px-4 py-3', align === 'right' && 'text-right')}>{children}</td>
)

const Num = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <td className={cn('px-4 py-3 text-right font-mono text-[12.5px]', muted ? 'text-text-3' : 'text-text-1')}>
    {children}
  </td>
)

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-default py-14 text-center font-ui text-[13px] text-text-4">
      {label}
    </div>
  )
}
