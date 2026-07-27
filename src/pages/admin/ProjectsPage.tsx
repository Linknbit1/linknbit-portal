import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCanManageProjects } from '../../hooks/useRoleFlags'
import {
  List, Columns, Calendar, Flag, Plus, Search, ChevronRight, AlertCircle, SlidersHorizontal, Trash2,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { usePeople } from '../../hooks/usePeople'
import { AvatarGroup } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Skeleton } from '../../components/ui/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue, PROJECT_STATUS_LABELS } from '../../lib/utils'
import { useDeleteProject, useProjectDeleteImpact, useProjects, useUpdateProjectStatus } from '../../hooks/useProjects'
import { useServices } from '../../hooks/useServices'
import { useApprovals } from '../../hooks/useApprovals'
import { useToast } from '../../components/ui/toast-context'
import { ProjectFormModal } from './ProjectFormModal'
import type { ProjectListItem, ProjectStatus } from '../../api/projects'
import type { ProjectStatus as AppProjectStatus } from '../../types'

type ViewMode = 'list' | 'kanban' | 'timeline' | 'milestones'

const VIEWS: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: 'list', label: 'List', icon: List },
  { key: 'kanban', label: 'Board', icon: Columns },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
  { key: 'milestones', label: 'Milestones', icon: Flag },
]

const KANBAN_COLUMNS: AppProjectStatus[] = ['in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']
const PROJECT_SORT = [
  { value: 'recent', label: 'Newest' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'progress', label: 'Progress' },
]

function sortProjects(list: ProjectListItem[], sort: string): ProjectListItem[] {
  const arr = [...list]
  switch (sort) {
    case 'deadline': arr.sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')); break
    case 'name': arr.sort((a, b) => a.name.localeCompare(b.name)); break
    case 'progress': arr.sort((a, b) => b.progress - a.progress); break
    default: break
  }
  return arr
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [deadlineFrom, setDeadlineFrom] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showAdv, setShowAdv] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProjectListItem | null>(null)

  // Mirrors p_projects_insert and delete_project_cascade, which read the same flag.
  const canManageProjects = useCanManageProjects()

  const { data: projects = [], isLoading } = useProjects()
  const { data: people = [] } = usePeople()
  const deleteProject = useDeleteProject()
  const { data: deleteImpact, isLoading: deleteImpactLoading } = useProjectDeleteImpact(pendingDelete?.id)
  const toast = useToast()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = projects.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || (p.client?.name ?? '').toLowerCase().includes(q)) &&
      (!serviceFilter || p.services.some((s) => s.slug === serviceFilter)) &&
      (!statusFilter || p.status === statusFilter) &&
      (!managerFilter || p.manager_id === managerFilter) &&
      (!deadlineFrom || (!!p.deadline && p.deadline >= deadlineFrom)) &&
      (!deadlineTo || (!!p.deadline && p.deadline <= deadlineTo)))
    return sortProjects(list, sortBy)
  }, [projects, search, serviceFilter, statusFilter, managerFilter, deadlineFrom, deadlineTo, sortBy])

  const serviceOptions = [{ value: '', label: 'All services' }, ...services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))]
  const statusOptions = [{ value: '', label: 'All statuses' }, ...KANBAN_COLUMNS.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))]
  const managerOptions = [{ value: '', label: 'All managers' }, ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Projects" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Projects</h2>
            <p className="font-ui text-[13px] text-text-3">{filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          {canManageProjects && (
            <Button size="sm" className="ml-auto" iconLeft={<Plus size={15} />} onClick={() => setShowNew(true)}>New Project</Button>
          )}
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 w-fit overflow-x-auto no-scrollbar">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 rounded-md font-ui font-medium text-[12.5px] whitespace-nowrap transition-colors',
                view === v.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" iconLeft={<Search size={14} />} className="w-56" />
          <Select value={serviceFilter} onChange={setServiceFilter} options={serviceOptions} size="sm" />
          <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} size="sm" />
          <Select value={sortBy} onChange={setSortBy} options={PROJECT_SORT} size="sm" label="Sort" />
          <button
            onClick={() => setShowAdv((v) => !v)}
            className={cn('h-8 px-2.5 rounded-sm border flex items-center gap-1.5 font-ui text-[11.5px] transition-colors', showAdv || deadlineFrom || deadlineTo || managerFilter ? 'border-border-focus text-text-1 bg-surface-2' : 'border-border-default text-text-3 hover:text-text-1')}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>

        {showAdv && (
          <div className="flex flex-wrap items-center gap-2 bg-surface-1 border border-border-default rounded-lg p-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-4 self-center">Deadline between</span>
            <DatePicker value={deadlineFrom} onChange={setDeadlineFrom} placeholder="From" className="w-40" />
            <DatePicker value={deadlineTo} onChange={setDeadlineTo} placeholder="To" minDate={deadlineFrom || undefined} className="w-40" />
            <Select value={managerFilter} onChange={setManagerFilter} options={managerOptions} size="sm" />
            {(deadlineFrom || deadlineTo || managerFilter) && (
              <button onClick={() => { setDeadlineFrom(''); setDeadlineTo(''); setManagerFilter('') }} className="h-8 px-2.5 rounded-sm text-[11.5px] text-text-3 hover:text-error transition-colors">Clear</button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : projects.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} canCreate={canManageProjects} />
        ) : (
          <>
            {view === 'list' && <ListView projects={filtered} onOpen={(id) => navigate(`/admin/projects/${id}`)} onDelete={setPendingDelete} canDelete={canManageProjects} />}
            {view === 'kanban' && <KanbanView projects={filtered} onOpen={(id) => navigate(`/admin/projects/${id}`)} />}
            {view === 'timeline' && <TimelineView projects={filtered} onOpen={(id) => navigate(`/admin/projects/${id}`)} />}
            {view === 'milestones' && <MilestonesView onOpen={(id) => navigate(`/admin/projects/${id}`)} />}
          </>
        )}
      </div>

      {showNew && <ProjectFormModal onClose={() => setShowNew(false)} />}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project?"
        message={
          <DeleteImpactMessage
            subject={pendingDelete?.name ?? ''}
            loading={deleteImpactLoading}
            lines={[
              ['Tasks', deleteImpact?.tasks],
              ['Stages', deleteImpact?.stages],
              ['Comments', deleteImpact?.comments],
              ['Attachments', deleteImpact?.attachments],
              ['Subtasks', deleteImpact?.subtasks],
            ]}
          />
        }
        confirmLabel="Delete project"
        danger
        isPending={deleteProject.isPending || deleteImpactLoading}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteProject.mutate(pendingDelete.id, {
            onSuccess: () => { toast('Project deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

function EmptyState({ onNew, canCreate }: { onNew: () => void; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3"><Columns size={22} /></span>
      <p className="font-ui text-[14px] text-text-2">No projects yet</p>
      {canCreate && (
        <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={onNew}>Create your first project</Button>
      )}
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────────
function ListView({ projects, onOpen, onDelete, canDelete }: { projects: ProjectListItem[]; onOpen: (id: string) => void; onDelete: (project: ProjectListItem) => void; canDelete: boolean }) {
  return (
    <div className="bg-surface-1 border border-border-default rounded-md overflow-x-auto">
      <table className="w-full text-left min-w-[860px]">
        <thead>
          <tr className="border-b border-border-default text-[10.5px] font-mono uppercase tracking-wider text-text-4">
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-4 py-2.5 font-medium">Client</th>
            <th className="px-4 py-2.5 font-medium">Service</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium w-40">Progress</th>
            <th className="px-4 py-2.5 font-medium">Deadline</th>
            <th className="px-4 py-2.5 font-medium">Team</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} onClick={() => onOpen(p.id)} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 cursor-pointer">
              <td className="px-4 py-3">
                <p className="font-ui font-semibold text-[13px] text-text-1">{p.name}</p>
                <p className="font-mono text-[10.5px] text-text-4">{p.task_count} task{p.task_count !== 1 ? 's' : ''}</p>
              </td>
              <td className="px-4 py-3 text-[12.5px] text-text-2">{p.client?.name ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  {p.services.map((s) => <ServiceChip key={s.id} service={s.slug} />)}
                </div>
              </td>
              <td className="px-4 py-3"><StatusChip status={p.status} type="project" /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar value={p.progress} className="flex-1" />
                  <span className="font-mono text-[11px] text-text-3 w-8 text-right">{p.progress}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {p.deadline
                  ? <span className={cn('text-[12px] font-mono', isOverdue(p.deadline) && p.status !== 'completed' ? 'text-error' : 'text-text-3')}>{formatDate(p.deadline)}</span>
                  : <span className="text-text-4 text-[12px]">—</span>}
              </td>
              <td className="px-4 py-3">
                {p.members.length > 0
                  ? <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url ?? undefined }))} max={4} size="xs" linkToProfile />
                  : <span className="text-text-4 text-[12px]">—</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {canDelete && <button
                    onClick={(e) => { e.stopPropagation(); onDelete(p) }}
                    className="size-7 rounded-sm inline-flex items-center justify-center text-text-3 hover:text-error hover:bg-error/10"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={13} />
                  </button>}
                  <ChevronRight size={15} className="text-text-4 self-center" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeleteImpactMessage({
  subject, loading, lines,
}: {
  subject: string
  loading: boolean
  lines: [string, number | undefined][]
}) {
  return (
    <div className="space-y-3">
      <p><strong className="text-text-1">{subject}</strong> will be deleted after confirmation.</p>
      {loading ? (
        <p className="text-text-3">Checking linked records...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {lines.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border-default bg-surface-2 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4">{label}</p>
              <p className="font-display text-[18px] font-bold text-text-1">{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-text-3">Related task comments, files, stages, subtasks, and assignee links will be removed before the project leaves active lists.</p>
    </div>
  )
}

// ── Kanban view ──────────────────────────────────────────────────────
function KanbanView({ projects, onOpen }: { projects: ProjectListItem[]; onOpen: (id: string) => void }) {
  const toast = useToast()
  const updateStatus = useUpdateProjectStatus()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const byStatus = (status: AppProjectStatus) => projects.filter((p) => p.status === status)

  const handleDrop = (status: ProjectStatus) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const project = projects.find((p) => p.id === id)
    if (!project || project.status === status) return
    updateStatus.mutate({ id, status }, {
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not move project', 'error'),
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((status) => {
        const items = byStatus(status)
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(status) }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={() => handleDrop(status)}
            className={cn(
              'w-72 shrink-0 rounded-lg border p-2.5 transition-colors',
              dragOver === status ? 'border-brand-red bg-brand-red/5' : 'border-border-default bg-surface-1/60',
            )}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="font-ui font-semibold text-[12px] text-text-2">{PROJECT_STATUS_LABELS[status]}</span>
              <span className="font-mono text-[10.5px] text-text-4">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpen(p.id)}
                  className={cn(
                    'bg-surface-1 border border-border-default rounded-md p-3 cursor-pointer hover:border-border-strong transition-colors',
                    dragId === p.id && 'opacity-50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {p.services.map((s) => <ServiceChip key={s.id} service={s.slug} showDot={false} />)}
                    </div>
                    {p.deadline && isOverdue(p.deadline) && p.status !== 'completed' && <AlertCircle size={13} className="text-error shrink-0" />}
                  </div>
                  <p className="font-ui font-semibold text-body-sm/snug text-text-1">{p.name}</p>
                  {p.client?.name && <p className="font-ui text-[11.5px] text-text-3 mt-0.5">{p.client.name}</p>}
                  <ProgressBar value={p.progress} className="mt-2.5" />
                  <div className="flex items-center justify-between mt-2.5">
                    {p.members.length > 0
                      ? <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url ?? undefined }))} max={3} size="xs" linkToProfile />
                      : <span />}
                    <span className="font-mono text-[10.5px] text-text-4">{p.progress}%</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-[11.5px] text-text-4 py-4">Empty</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Timeline view ────────────────────────────────────────────────────
function TimelineView({ projects, onOpen }: { projects: ProjectListItem[]; onOpen: (id: string) => void }) {
  const [now] = useState(() => Date.now())
  const withDates = projects.filter((p) => p.start_date && p.deadline)
  if (withDates.length === 0) {
    return <div className="py-12 text-center font-ui text-[13px] text-text-4">No projects have a start date and deadline set.</div>
  }

  const times = withDates.flatMap((p) => [new Date(p.start_date!).getTime(), new Date(p.deadline!).getTime()])
  const min = Math.min(...times)
  const max = Math.max(...times)
  const span = Math.max(max - min, 1)
  const todayPct = ((now - min) / span) * 100

  return (
    <div className="bg-surface-1 border border-border-default rounded-md p-4 space-y-2.5 overflow-hidden">
      <div className="flex items-center justify-between font-mono text-[10.5px] text-text-4 px-1">
        <span>{formatDate(new Date(min).toISOString())}</span>
        <span>{formatDate(new Date(max).toISOString())}</span>
      </div>
      <div className="relative space-y-2">
        {todayPct >= 0 && todayPct <= 100 && (
          <div className="absolute inset-y-0 w-px bg-brand-red/60 z-10" style={{ left: `${todayPct}%` }} />
        )}
        {withDates.map((p) => {
          const start = new Date(p.start_date!).getTime()
          const end = new Date(p.deadline!).getTime()
          const left = ((start - min) / span) * 100
          const width = Math.max(((end - start) / span) * 100, 2)
          // A bar is one row, so it takes the colour of the project's first service.
          const color = p.services[0]?.color ?? serviceColor('')
          return (
            <div key={p.id} onClick={() => onOpen(p.id)} className="relative h-9 cursor-pointer group">
              <div className="absolute inset-0 rounded bg-surface-2/40" />
              <div
                className="absolute inset-y-1 rounded flex items-center px-2 gap-2 overflow-hidden group-hover:brightness-110 transition-all"
                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: `${color}2A`, border: `1px solid ${color}66` }}
              >
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-ui font-semibold text-[11.5px] text-text-1 truncate">{p.name}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Resolve a service colour for the timeline bars (fallbacks match ServiceChip).
const SERVICE_COLORS: Record<string, string> = { design: '#A78BFA', development: '#22D3EE', marketing: '#FBBF24' }
function serviceColor(slug: string): string { return SERVICE_COLORS[slug] ?? '#8A93A3' }

// ── Milestones view (approvals across projects) ──────────────────────
function MilestonesView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: approvals = [], isLoading } = useApprovals()

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
  if (approvals.length === 0) {
    return <div className="py-12 text-center font-ui text-[13px] text-text-4">No approval milestones yet. Request client approval on a stage to see it here.</div>
  }

  return (
    <div className="space-y-2">
      {approvals.map((a) => (
        <div
          key={a.id}
          onClick={() => onOpen(a.project_id)}
          className="flex items-center gap-3 bg-surface-1 border border-border-default rounded-md px-4 py-3 cursor-pointer hover:border-border-strong transition-colors"
        >
          <span className="size-9 rounded-lg bg-surface-2 flex items-center justify-center text-text-3 shrink-0"><Flag size={16} /></span>
          <div className="flex-1 min-w-0">
            <p className="font-ui font-semibold text-[13px] text-text-1 truncate">{a.project?.name ?? 'Project'}</p>
            <p className="font-ui text-[11.5px] text-text-3 capitalize">{a.type} approval{a.submitted_by_profile ? ` · by ${a.submitted_by_profile.name}` : ''}</p>
          </div>
          <StatusChip status={a.status} type="approval" />
        </div>
      ))}
    </div>
  )
}
