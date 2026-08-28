import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCanAccess, useCanManageProjects } from '../../hooks/useRoleFlags'
import {
  List, Columns, Calendar, Plus, Search, ChevronRight, AlertCircle, SlidersHorizontal, Trash2,
  LayoutGrid, CheckSquare, Users, History,
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
import { useDeleteProject, useProjectDeleteImpact, useProjects } from '../../hooks/useProjects'
import { useServices } from '../../hooks/useServices'
import { useToast } from '../../components/ui/toast-context'
import { useScopedProjects } from '../../hooks/useScopeFilter'
import { TimeBacklog } from '../../components/shared/TimeBacklog'
import { useStatusOverrides } from '../../hooks/useStatusLabels'
import { ScopeNotice } from '../../components/shared/ScopeNotice'
import { ScopeSwitch } from '../../components/shared/ScopeSwitch'
import { ProjectFormModal } from './ProjectFormModal'
import type { ProjectListItem } from '../../api/projects'
import type { ProjectStatus as AppProjectStatus } from '../../types'

type ViewMode = 'cards' | 'list' | 'backlog'

// No board of projects. A board is for moving one thing through stages, and a
// project's stages live inside it, per service. Dragging a whole project between
// status columns was a second way to set a field the project page already owns,
// on a screen whose job is finding a project rather than working one.
const VIEWS: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'list', label: 'Table', icon: List },
  { key: 'backlog', label: 'Backlog', icon: History },
]

/** Backlog is a management lens, so it only appears for roles granted it. */
const backlogVisible = (canViewBacklog: boolean) =>
  VIEWS.filter((v) => v.key !== 'backlog' || canViewBacklog)

/** Every project status, in workflow order. Drives the status filter. */
const PROJECT_STATUSES: AppProjectStatus[] = ['todo', 'in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']
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
  const [view, setView] = useState<ViewMode>('cards')
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
  const canViewBacklog = useCanAccess('can_view_backlog')

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

  // Me Mode narrows to projects you are staffed on or manage.
  const shown = useScopedProjects(filtered)
  // Renames from Settings → Statuses drive the filter and the board headings.
  const projectStatusMeta = useStatusOverrides('project')

  const serviceOptions = [{ value: '', label: 'All services' }, ...services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))]
  const statusOptions = [{ value: '', label: 'All statuses' }, ...PROJECT_STATUSES.map((s) => ({ value: s, label: projectStatusMeta[s]?.label ?? PROJECT_STATUS_LABELS[s] }))]
  // Managers who have left but still hold projects are listed too — otherwise the
  // one filter that would find the projects needing a new owner can't name them.
  const departedManagers = useMemo(() => {
    const byId = new Map<string, ProjectListItem['manager']>()
    for (const p of projects) {
      if (p.manager && p.manager.is_active === false) byId.set(p.manager.id, p.manager)
    }
    return [...byId.values()]
  }, [projects])
  const managerOptions = [
    { value: '', label: 'All managers' },
    ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
    ...departedManagers.flatMap((m) => m
      ? [{ value: m.id, label: `${m.name}, deactivated`, avatar: { name: m.name, url: m.avatar_url } }]
      : []),
  ]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Projects" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-ui text-[13px] text-text-3">{shown.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          {canManageProjects && (
            <Button size="sm" className="ml-auto" iconLeft={<Plus size={15} />} onClick={() => setShowNew(true)}>New Project</Button>
          )}
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 w-fit overflow-x-auto no-scrollbar">
          {backlogVisible(canViewBacklog).map((v) => (
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

        {/* Filters. Scope leads: it is the broadest of them, and it belongs with
            the other filters rather than in the Topbar — it only applies here. */}
        <div className="flex flex-wrap items-center gap-2">
          <ScopeSwitch size="sm" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" iconLeft={<Search size={14} />} className="w-full sm:w-56" />
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

        <ScopeNotice shown={shown.length} total={filtered.length} />

        {showAdv && (
          <div className="flex flex-wrap items-center gap-2 bg-surface-1 border border-border-default rounded-lg p-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-4 self-center">Deadline between</span>
            <DatePicker value={deadlineFrom} onChange={setDeadlineFrom} placeholder="From" className="w-full sm:w-40" />
            <DatePicker value={deadlineTo} onChange={setDeadlineTo} placeholder="To" minDate={deadlineFrom || undefined} className="w-full sm:w-40" />
            <Select value={managerFilter} onChange={setManagerFilter} options={managerOptions} size="sm" />
            {(deadlineFrom || deadlineTo || managerFilter) && (
              <button onClick={() => { setDeadlineFrom(''); setDeadlineTo(''); setManagerFilter('') }} className="h-8 px-2.5 rounded-sm text-[11.5px] text-text-3 hover:text-error transition-colors">Clear</button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className={cn(view === 'cards' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3' : 'space-y-2')}>
            {Array.from({ length: view === 'cards' ? 6 : 5 }).map((_, i) => <Skeleton key={i} className={view === 'cards' ? 'h-52 rounded-lg' : 'h-16'} />)}
          </div>
        ) : view === 'backlog' && canViewBacklog ? (
          /* Time history across every project the viewer can see. Rendered ahead
             of the empty state because it is about logged time, not projects. */
          <TimeBacklog groupBy="project" />
        ) : projects.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} canCreate={canManageProjects} />
        ) : (
          <>
            {view === 'cards' && <CardsView projects={shown} onOpen={(id) => navigate(`/projects/${id}`)} onDelete={setPendingDelete} canDelete={canManageProjects} />}
            {view === 'list' && <ListView projects={shown} onOpen={(id) => navigate(`/projects/${id}`)} onDelete={setPendingDelete} canDelete={canManageProjects} />}
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

// ── Cards view (default) ─────────────────────────────────────────────
function CardsView({ projects, onOpen, onDelete, canDelete }: { projects: ProjectListItem[]; onOpen: (id: string) => void; onDelete: (project: ProjectListItem) => void; canDelete: boolean }) {
  if (projects.length === 0) {
    return <div className="py-16 text-center font-ui text-[13px] text-text-4">No projects match your filters.</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={onDelete} canDelete={canDelete} />
      ))}
    </div>
  )
}

function ProjectCard({ project: p, onOpen, onDelete, canDelete }: { project: ProjectListItem; onOpen: (id: string) => void; onDelete: (project: ProjectListItem) => void; canDelete: boolean }) {
  const overdue = !!p.deadline && isOverdue(p.deadline) && p.status !== 'completed'

  return (
    <article
      onClick={() => onOpen(p.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p.id) } }}
      aria-label={p.name}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border-default bg-surface-1 shadow-sm transition-colors hover:border-border-strong focus:outline-none focus-visible:border-border-focus"
    >
      <div className="border-b border-border-subtle bg-[linear-gradient(135deg,rgba(224,20,20,0.055),rgba(34,211,238,0.045)_58%,rgba(20,29,42,0)_100%)] p-4">
        {/* items-center so the overdue pill and the delete button share a baseline
            — the pill used to sit half a step lower than the button. */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {p.services.map((s) => <ServiceChip key={s.id} service={s.slug} />)}
          </div>
          {overdue && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-error">
              <AlertCircle size={10} className="shrink-0" /> Overdue
            </span>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(p) }}
              className="-mr-1 size-7 shrink-0 rounded-sm inline-flex items-center justify-center text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Delete ${p.name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <p className="mt-2.5 font-display text-[15px] font-bold leading-snug text-text-1 line-clamp-2">{p.name}</p>
        <p className="mt-1 truncate font-ui text-[12px] text-text-3">{p.client?.name ?? 'No client'}</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusChip status={p.status} type="project" />
          <span className="font-mono text-[11px] text-text-3">{p.progress}%</span>
        </div>
        <ProgressBar value={p.progress} />

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2/35 px-3 py-2">
            <CheckSquare size={14} className="shrink-0 text-text-4" />
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Tasks</p>
              <p className="font-ui text-[12.5px] font-semibold text-text-1">{p.task_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2/35 px-3 py-2">
            <Calendar size={14} className="shrink-0 text-text-4" />
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Deadline</p>
              <p className={cn('truncate font-ui text-[12.5px] font-semibold', overdue ? 'text-error' : 'text-text-1')}>
                {p.deadline ? formatDate(p.deadline) : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
          {p.members.length > 0 ? (
            <div onClick={(e) => e.stopPropagation()}>
              <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url ?? undefined }))} max={4} size="xs" linkToProfile />
            </div>
          ) : (
            <span className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-4"><Users size={12} /> No members</span>
          )}
          <ChevronRight size={15} className="shrink-0 text-text-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </article>
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
              <td className="px-4 py-3 text-[12.5px] text-text-2">{p.client?.name ?? '-'}</td>
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
                  : <span className="text-text-4 text-[12px]">-</span>}
              </td>
              <td className="px-4 py-3">
                {p.members.length > 0
                  ? <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url ?? undefined }))} max={4} size="xs" linkToProfile />
                  : <span className="text-text-4 text-[12px]">-</span>}
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