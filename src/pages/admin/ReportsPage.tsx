import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Users, Clock, Info, Search, ChevronRight } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Tabs } from '../../components/ui/Tabs'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { QueryError } from '../../components/ui/QueryError'
import { useToast } from '../../components/ui/toast-context'
import { useProjectBacklog, useEmployeeBacklog } from '../../hooks/useReports'
import { downloadCsv } from '../../lib/csv'
import { formatMinutes } from '../../lib/duration'
import { cn } from '../../lib/cn'
import { RangePicker, VarianceChip, ExportButton } from '../../components/reports/ReportControls'
import { useReportRange, type DateRange, type RangePreset } from '../../components/reports/reportRange'
import { TimesheetContent } from './TimesheetPage'
import { ReportsTab as AttendanceReports } from './AttendancePage'

/**
 * Carry the range through to the detail screen, so opening a project keeps the
 * window you were reading — and the resulting URL is worth pasting to somebody.
 */
function detailHref(base: string, preset: RangePreset, custom: DateRange): string {
  const params = new URLSearchParams({ preset })
  if (preset === 'custom') {
    params.set('from', custom.from)
    params.set('to', custom.to)
  }
  return `${base}?${params.toString()}`
}

type Tab = 'projects' | 'people' | 'timesheet' | 'attendance'

/**
 * Backlog reporting.
 *
 * Two reports, one shape: a range across the top, a table underneath, and the
 * same three time columns in the same order every time — what the timer
 * recorded, what the standups accounted for, and the gap between them.
 *
 * The two figures are never added. They measure the same hours by different
 * means and disagree by hours a day; the gap is the finding, and a total would
 * erase it. Every table says so once, at the top, rather than in a footnote
 * nobody reads.
 */
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('projects')

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Reports" />
      <div className="flex flex-col gap-5 p-4 lg:px-8 lg:py-7">
        {/* One door for reporting. These four used to be three separate sidebar
            rows in three different sections, so finding a number meant already
            knowing which module produced it. */}
        <Tabs
          tabs={[
            { key: 'projects', label: 'Project backlog' },
            { key: 'people', label: 'Employee backlog' },
            { key: 'timesheet', label: 'Timesheet' },
            { key: 'attendance', label: 'Attendance' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as Tab)}
        />

        {tab === 'projects' ? <ProjectBacklog />
          : tab === 'people' ? <EmployeeBacklog />
          : tab === 'timesheet' ? <TimesheetContent />
          : <AttendanceReports />}
      </div>
    </div>
  )
}

/** Said once per table, because a reader who misses it will misread every row. */
function TwoClocksNote() {
  return (
    <p className="flex items-start gap-2 rounded-md border border-border-subtle bg-surface-2/40 px-3 py-2.5 font-ui text-[11.5px] text-text-3">
      <Info size={13} className="mt-0.5 shrink-0 text-text-4" />
      <span>
        <span className="font-medium text-text-2">Timer</span> is time actually tracked against a task.{' '}
        <span className="font-medium text-text-2">Standup</span> is what people wrote up at the end of the
        day. They measure the same hours two different ways and routinely disagree, so they are shown
        separately and never added. The <span className="font-medium text-text-2">variance</span> between
        them is the number worth looking at.
      </span>
    </p>
  )
}

function ProjectBacklog() {
  const toast = useToast()
  const { preset, setPreset, custom, setCustom, range } = useReportRange('month')
  const { data: rows = [], isLoading, error } = useProjectBacklog(range.from, range.to)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.project_name?.toLowerCase().includes(q) || r.client_name?.toLowerCase().includes(q),
    )
  }, [rows, search])

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({
      timer: acc.timer + r.timer_minutes,
      standup: acc.standup + r.standup_minutes,
    }),
    { timer: 0, standup: 0 },
  ), [filtered])

  const exportCsv = () => {
    if (filtered.length === 0) { toast('Nothing to export', 'error'); return }
    downloadCsv(
      `project-backlog_${range.from}_to_${range.to}.csv`,
      ['Project', 'Client', 'Status', 'Budget', 'Timer (minutes)', 'Standup (minutes)', 'Variance (minutes)', 'People', 'Tasks'],
      filtered.map((r) => [
        r.project_name ?? '', r.client_name ?? '', r.status ?? '',
        r.budget ?? '',
        r.timer_minutes, r.standup_minutes, r.variance_minutes, r.people, r.tasks,
      ]),
    )
    toast(`Exported ${filtered.length} projects`, 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <RangePicker
        preset={preset} onPreset={setPreset}
        custom={custom} onCustom={setCustom}
        actions={<ExportButton onExport={exportCsv} disabled={filtered.length === 0} />}
      />
      <TwoClocksNote />

      <SummaryRow
        items={[
          { label: 'Projects with activity', value: String(filtered.length), icon: FolderKanban },
          { label: 'Tracked on the timer', value: formatMinutes(totals.timer), icon: Clock },
          { label: 'Accounted for in standups', value: formatMinutes(totals.standup), icon: Users },
        ]}
      />

      <SearchBox value={search} onChange={setSearch} placeholder="Search project or client…" />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <QueryError error={error} label="This report" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No time recorded against any project in this range." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-1">
          <table className="w-full min-w-216">
            <thead>
              <tr className="border-b border-border-subtle">
                <Th>Project</Th>
                <Th align="right">Timer</Th>
                <Th align="right">Standup</Th>
                <Th align="right">Variance</Th>
                <Th align="right">People</Th>
                <Th align="right">Tasks</Th>
                <Th align="right">Budget</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.project_id} className="group border-b border-border-subtle last:border-0 hover:bg-surface-2/40">
                  <td className="px-4 py-3">
                    <Link
                      to={detailHref(`/reports/project/${r.project_id}`, preset, custom)}
                      className="flex items-center gap-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-ui text-[13px] font-medium text-text-1 group-hover:text-brand-red">
                          {r.project_name}
                        </span>
                        {r.client_name && (
                          <span className="block font-ui text-[11px] text-text-4">{r.client_name}</span>
                        )}
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-text-4 group-hover:text-brand-red" />
                    </Link>
                  </td>
                  <Td>{formatMinutes(r.timer_minutes)}</Td>
                  <Td>{formatMinutes(r.standup_minutes)}</Td>
                  <td className="px-4 py-3 text-right"><VarianceChip minutes={r.variance_minutes} /></td>
                  <Td muted>{r.people}</Td>
                  <Td muted>{r.tasks}</Td>
                  {/* Only what exists: there is no cost rate in the system, so no
                      margin is implied by showing the budget beside the hours. */}
                  <Td muted>{r.budget ? Number(r.budget).toLocaleString() : '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmployeeBacklog() {
  const toast = useToast()
  const { preset, setPreset, custom, setCustom, range } = useReportRange('month')
  const { data: rows = [], isLoading, error } = useEmployeeBacklog(range.from, range.to)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => r.profile_name?.toLowerCase().includes(q)) : rows
  }, [rows, search])

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({
      timer: acc.timer + r.timer_minutes,
      standup: acc.standup + r.standup_minutes,
      late: acc.late + r.standups_late,
    }),
    { timer: 0, standup: 0, late: 0 },
  ), [filtered])

  const exportCsv = () => {
    if (filtered.length === 0) { toast('Nothing to export', 'error'); return }
    downloadCsv(
      `employee-backlog_${range.from}_to_${range.to}.csv`,
      ['Person', 'Role', 'Timer (minutes)', 'Standup (minutes)', 'Variance (minutes)', 'Required (minutes)',
       'Unpaid (minutes)', 'Made up (minutes)', 'Make-up owed (minutes)',
       'Standups submitted', 'Late', 'Projects'],
      filtered.map((r) => [
        r.profile_name ?? '', r.role ?? '',
        r.timer_minutes, r.standup_minutes, r.variance_minutes, r.required_minutes,
        r.unpaid_minutes, r.made_up_minutes, r.makeup_balance_minutes,
        r.standups_submitted, r.standups_late, r.projects,
      ]),
    )
    toast(`Exported ${filtered.length} people`, 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <RangePicker
        preset={preset} onPreset={setPreset}
        custom={custom} onCustom={setCustom}
        actions={<ExportButton onExport={exportCsv} disabled={filtered.length === 0} />}
      />
      <TwoClocksNote />

      <SummaryRow
        items={[
          { label: 'People', value: String(filtered.length), icon: Users },
          { label: 'Tracked on the timer', value: formatMinutes(totals.timer), icon: Clock },
          { label: 'Late standups', value: String(totals.late), icon: Info },
        ]}
      />

      <SearchBox value={search} onChange={setSearch} placeholder="Search people…" />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <QueryError error={error} label="This report" />
      ) : filtered.length === 0 ? (
        <EmptyState label="Nobody has recorded time in this range." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-1">
          <table className="w-full min-w-232">
            <thead>
              <tr className="border-b border-border-subtle">
                <Th>Person</Th>
                <Th align="right">Timer</Th>
                <Th align="right">Standup</Th>
                <Th align="right">Variance</Th>
                <Th align="right">Required</Th>
                <Th align="right">Make-up</Th>
                <Th align="right">Standups</Th>
                <Th align="right">Projects</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                // Only meaningful once something was owed — a window of holidays
                // owes nothing and must not read as a 100% shortfall.
                const shortfall = r.required_minutes > 0 ? r.standup_minutes - r.required_minutes : 0
                return (
                  <tr key={r.profile_id} className="group border-b border-border-subtle last:border-0 hover:bg-surface-2/40">
                    <td className="px-4 py-3">
                      <Link
                        to={detailHref(`/reports/employee/${r.profile_id}`, preset, custom)}
                        className="flex items-center gap-2.5"
                      >
                        <Avatar name={r.profile_name ?? ''} src={r.avatar_url ?? undefined} size="sm" personId={r.profile_id} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-ui text-[13px] font-medium text-text-1 group-hover:text-brand-red">
                            {r.profile_name}
                          </span>
                          <span className="font-mono text-[10px] capitalize text-text-4">
                            {r.role?.replace(/_/g, ' ')}
                          </span>
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-text-4 group-hover:text-brand-red" />
                      </Link>
                    </td>
                    <Td>{formatMinutes(r.timer_minutes)}</Td>
                    <Td>{formatMinutes(r.standup_minutes)}</Td>
                    <td className="px-4 py-3 text-right"><VarianceChip minutes={r.variance_minutes} /></td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[12.5px] text-text-2">
                        {formatMinutes(r.required_minutes)}
                      </span>
                      {r.required_minutes > 0 && shortfall !== 0 && (
                        <span className={cn(
                          'ml-1.5 font-mono text-[10.5px]',
                          shortfall < 0 ? 'text-error' : 'text-text-4',
                        )}>
                          {shortfall < 0 ? `−${formatMinutes(-shortfall)}` : `+${formatMinutes(shortfall)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.makeup_balance_minutes > 0 ? (
                        <span
                          className="font-mono text-[12.5px] font-semibold text-error"
                          title="Unpaid time from an approved exception, still to be worked back"
                        >
                          {formatMinutes(r.makeup_balance_minutes)}
                        </span>
                      ) : r.unpaid_minutes > 0 ? (
                        <span className="font-mono text-[11.5px] text-success" title="All unpaid time has been worked back">
                          cleared
                        </span>
                      ) : (
                        <span className="font-mono text-[12.5px] text-text-4">-</span>
                      )}
                    </td>
                    <Td muted>
                      {r.standups_submitted}
                      {r.standups_late > 0 && (
                        <span className="ml-1 text-warning">({r.standups_late} late)</span>
                      )}
                    </Td>
                    <Td muted>{r.projects}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Small shared pieces ─────────────────────────────────────────────────── */

function SummaryRow({ items }: {
  items: { label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-1 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
            <i.icon size={15} className="text-text-3" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[18px] font-bold text-text-1">{i.value}</span>
            <span className="block font-ui text-[11.5px] text-text-4">{i.label}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-xs">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border-default bg-surface-inset pl-7.5 pr-2.5 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
      />
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={cn(
      'px-4 py-2.5 font-ui text-[11px] font-semibold uppercase tracking-wider text-text-4',
      align === 'right' ? 'text-right' : 'text-left',
    )}>
      {children}
    </th>
  )
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={cn(
      'px-4 py-3 text-right font-mono text-[12.5px]',
      muted ? 'text-text-3' : 'text-text-1',
    )}>
      {children}
    </td>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-default py-14 text-center font-ui text-[13px] text-text-4">
      {label}
    </div>
  )
}
