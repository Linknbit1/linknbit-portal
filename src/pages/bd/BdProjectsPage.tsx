import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Columns, Calendar, Plus, Search, ChevronRight, AlertCircle, SlidersHorizontal,
  Trash2, Pencil, LayoutGrid, CheckSquare, Users,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { AvatarGroup } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StatusChip } from '../../components/shared/StatusChip'
import { ChannelChip } from '../../components/shared/BdChips'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER, BD_PROJECT_COLUMNS } from '../../constants/bd'
import { useBd } from '../../context/BdContext'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue, PROJECT_STATUS_LABELS } from '../../lib/utils'
import { BdProjectFormModal } from './BdProjectFormModal'
import type { BdProject, BdChannel, ProjectStatus } from '../../types'

type ViewMode = 'cards' | 'list' | 'kanban'

/** No Backlog view — that lens is time tracking, which BD does not do. */
const VIEWS: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'list', label: 'Table', icon: List },
  { key: 'kanban', label: 'Board', icon: Columns },
]

const PROJECT_SORT = [
  { value: 'recent', label: 'Newest' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'progress', label: 'Progress' },
]

function sortProjects(list: BdProject[], sort: string): BdProject[] {
  const arr = [...list]
  switch (sort) {
    case 'deadline': arr.sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')); break
    case 'name': arr.sort((a, b) => a.name.localeCompare(b.name)); break
    case 'progress': arr.sort((a, b) => b.progress - a.progress); break
    default: break
  }
  return arr
}

export default function BdProjectsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { projects, tasks, deleteProject, people } = useBd()

  const [view, setView] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [deadlineFrom, setDeadlineFrom] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showAdv, setShowAdv] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BdProject | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BdProject | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = projects.filter((p) => {
      // No membership check here any more. It used to live in this filter and
      // never fired — it was skipped for anyone with `can_manage_bd`, which every
      // BD rep holds — and it could only ever hide rows the server had already
      // sent. Scoping is now a SELECT policy on bd_projects, so what arrives is
      // already only the campaigns this person is on.
      return (
        (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)) &&
        (!channelFilter || p.channels.includes(channelFilter as BdChannel)) &&
        (!statusFilter || p.status === statusFilter) &&
        (!ownerFilter || p.ownerId === ownerFilter) &&
        (!deadlineFrom || (!!p.deadline && p.deadline >= deadlineFrom)) &&
        (!deadlineTo || (!!p.deadline && p.deadline <= deadlineTo))
      )
    })
    return sortProjects(list, sortBy)
  }, [projects, search, channelFilter, statusFilter, ownerFilter, deadlineFrom, deadlineTo, sortBy])

  // Live counts beat the stored one — tasks move between projects.
  const taskCountOf = (id: string) => tasks.filter((t) => t.projectId === id).length

  const channelOptions = [{ value: '', label: 'All channels' }, ...CHANNEL_ORDER.map((c) => ({ value: c, label: CHANNEL_CONFIG[c].label }))]
  const statusOptions = [{ value: '', label: 'All statuses' }, ...BD_PROJECT_COLUMNS.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))]
  const ownerOptions = [{ value: '', label: 'All owners' }, ...people.map((p) => ({ value: p.id, label: p.name }))]

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (p: BdProject) => { setEditing(p); setShowForm(true) }
  // Opens the project's own page — the form modal is now create-only, the same
  // split the delivery Projects page uses.
  const openProject = (p: BdProject) => navigate(`/bd/projects/${p.id}`)

  return (
    <div className={cn('flex flex-1 flex-col', view === 'kanban' && 'min-h-0')}>
      <Topbar title="Projects" />
      <div className={cn('flex flex-col gap-5 p-4 lg:px-8 lg:py-7', view === 'kanban' && 'min-h-0 flex-1')}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-ui text-[13px] text-text-3">
            {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
          <Button size="sm" className="ml-auto" iconLeft={<Plus size={15} />} onClick={openNew}>New Project</Button>
        </div>

        {/* View switcher */}
        <div className="flex w-fit items-center gap-1 overflow-x-auto rounded-lg border border-border-default bg-surface-1 p-1 no-scrollbar">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-ui text-[12.5px] font-medium transition-colors',
                view === v.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
              )}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" iconLeft={<Search size={14} />} className="w-full sm:w-56" />
          <Select value={channelFilter} onChange={setChannelFilter} options={channelOptions} size="sm" />
          <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} size="sm" />
          <Select value={sortBy} onChange={setSortBy} options={PROJECT_SORT} size="sm" label="Sort" />
          <button
            onClick={() => setShowAdv((v) => !v)}
            className={cn('flex h-8 items-center gap-1.5 rounded-sm border px-2.5 font-ui text-[11.5px] transition-colors', showAdv || deadlineFrom || deadlineTo || ownerFilter ? 'border-border-focus bg-surface-2 text-text-1' : 'border-border-default text-text-3 hover:text-text-1')}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>

        {showAdv && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-1 p-2.5">
            <span className="self-center font-mono text-[10px] uppercase tracking-wider text-text-4">Deadline between</span>
            <DatePicker value={deadlineFrom} onChange={setDeadlineFrom} placeholder="From" className="w-full sm:w-40" />
            <DatePicker value={deadlineTo} onChange={setDeadlineTo} placeholder="To" minDate={deadlineFrom || undefined} className="w-full sm:w-40" />
            <Select value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} size="sm" />
            {(deadlineFrom || deadlineTo || ownerFilter) && (
              <button onClick={() => { setDeadlineFrom(''); setDeadlineTo(''); setOwnerFilter('') }} className="h-8 rounded-sm px-2.5 text-[11.5px] text-text-3 transition-colors hover:text-error">Clear</button>
            )}
          </div>
        )}

        {projects.length === 0 ? (
          <EmptyState onNew={openNew} />
        ) : (
          <>
            {view === 'cards' && <CardsView projects={filtered} taskCountOf={taskCountOf} onOpen={openProject} onEdit={openEdit} onDelete={setPendingDelete} />}
            {view === 'list' && <ListView projects={filtered} taskCountOf={taskCountOf} onOpen={openProject} onEdit={openEdit} onDelete={setPendingDelete} />}
            {view === 'kanban' && <KanbanView projects={filtered} onOpen={openProject} />}
          </>
        )}
      </div>

      {showForm && (
        <BdProjectFormModal
          key={editing?.id ?? 'new'}
          open
          project={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project?"
        message={
          <span>
            <strong className="text-text-1">{pendingDelete?.name}</strong> will be deleted, along with its{' '}
            {pendingDelete ? taskCountOf(pendingDelete.id) : 0} task
            {pendingDelete && taskCountOf(pendingDelete.id) !== 1 ? 's' : ''}.
          </span>
        }
        confirmLabel="Delete project"
        danger
        onConfirm={() => {
          if (!pendingDelete) return
          deleteProject(pendingDelete.id)
          toast('Project deleted', 'success')
          setPendingDelete(null)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3"><Columns size={22} /></span>
      <p className="font-ui text-[14px] text-text-2">No projects yet</p>
      <p className="max-w-[44ch] font-ui text-[12.5px]/relaxed text-text-4">
        A BD project is a campaign or initiative. An outreach push, a deal desk, a referral programme. Tasks hang off it.
      </p>
      <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={onNew}>Create your first project</Button>
    </div>
  )
}

interface ViewProps {
  projects: BdProject[]
  taskCountOf: (id: string) => number
  onOpen: (project: BdProject) => void
  onEdit: (project: BdProject) => void
  onDelete: (project: BdProject) => void
}

// ── Cards view (default) ─────────────────────────────────────────────
function CardsView({ projects, taskCountOf, onOpen, onEdit, onDelete }: ViewProps) {
  if (projects.length === 0) {
    return <div className="py-16 text-center font-ui text-[13px] text-text-4">No projects match your filters.</div>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} taskCount={taskCountOf(p.id)} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

function ProjectCard({ project: p, taskCount, onOpen, onEdit, onDelete }: { project: BdProject; taskCount: number; onOpen: (p: BdProject) => void; onEdit: (p: BdProject) => void; onDelete: (p: BdProject) => void }) {
  const { avatarOf } = useBd()
  const overdue = !!p.deadline && isOverdue(p.deadline) && p.status !== 'completed'

  return (
    <article
      onClick={() => onOpen(p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) } }}
      aria-label={p.name}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border-default bg-surface-1 shadow-sm transition-colors hover:border-border-strong focus:outline-none focus-visible:border-border-focus"
    >
      <div className="border-b border-border-subtle bg-[linear-gradient(135deg,rgba(224,20,20,0.055),rgba(34,211,238,0.045)_58%,rgba(20,29,42,0)_100%)] p-4">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {p.channels.map((c) => <ChannelChip key={c} channel={c} />)}
          </div>
          {overdue && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-error">
              <AlertCircle size={10} className="shrink-0" /> Overdue
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(p) }}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-0 transition-opacity hover:bg-surface-3 hover:text-text-1 focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Edit ${p.name}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(p) }}
            className="-mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
        <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-text-1">{p.name}</p>
        <p className="mt-1 truncate font-ui text-[12px] text-text-3">{p.ownerName}</p>
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
              <p className="font-ui text-[12.5px] font-semibold text-text-1">{taskCount}</p>
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
            <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: avatarOf(m.id) }))} max={4} size="xs" />
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
function ListView({ projects, taskCountOf, onOpen, onEdit, onDelete }: ViewProps) {
  const { avatarOf } = useBd()
  return (
    <div className="overflow-x-auto rounded-md border border-border-default bg-surface-1">
      <table className="w-full min-w-[860px] text-left">
        <thead>
          <tr className="border-b border-border-default font-mono text-[10.5px] uppercase tracking-wider text-text-4">
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-4 py-2.5 font-medium">Owner</th>
            <th className="px-4 py-2.5 font-medium">Channels</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="w-40 px-4 py-2.5 font-medium">Progress</th>
            <th className="px-4 py-2.5 font-medium">Deadline</th>
            <th className="px-4 py-2.5 font-medium">Team</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const taskCount = taskCountOf(p.id)
            return (
              <tr key={p.id} onClick={() => onOpen(p)} className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3">
                  <p className="font-ui text-[13px] font-semibold text-text-1">{p.name}</p>
                  <p className="font-mono text-[10.5px] text-text-4">{taskCount} task{taskCount !== 1 ? 's' : ''}</p>
                </td>
                <td className="px-4 py-3 text-[12.5px] text-text-2">{p.ownerName}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.channels.map((c) => <ChannelChip key={c} channel={c} />)}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusChip status={p.status} type="project" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} className="flex-1" />
                    <span className="w-8 text-right font-mono text-[11px] text-text-3">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.deadline
                    ? <span className={cn('font-mono text-[12px]', isOverdue(p.deadline) && p.status !== 'completed' ? 'text-error' : 'text-text-3')}>{formatDate(p.deadline)}</span>
                    : <span className="text-[12px] text-text-4">-</span>}
                </td>
                <td className="px-4 py-3">
                  {p.members.length > 0
                    ? <AvatarGroup users={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: avatarOf(m.id) }))} max={4} size="xs" />
                    : <span className="text-[12px] text-text-4">-</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(p) }}
                      className="inline-flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(p) }}
                      className="inline-flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-error/10 hover:text-error"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={15} className="self-center text-text-4" />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Kanban view ──────────────────────────────────────────────────────
function KanbanView({ projects, onOpen }: { projects: BdProject[]; onOpen: (p: BdProject) => void }) {
  const toast = useToast()
  const { moveProjectStatus } = useBd()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const handleDrop = (status: ProjectStatus) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const project = projects.find((p) => p.id === id)
    if (!project || project.status === status) return
    moveProjectStatus(id, status)
    toast(`${project.name} → ${PROJECT_STATUS_LABELS[status]}`, 'success')
  }

  return (
    <div className="flex min-h-80 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:snap-none lg:gap-3">
      {BD_PROJECT_COLUMNS.map((status) => {
        const items = projects.filter((p) => p.status === status)
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(status) }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={() => handleDrop(status)}
            className={cn(
              'flex h-full snap-start flex-col rounded-lg border p-2.5 transition-colors',
              'w-[86vw] shrink-0 sm:w-80',
              dragOver === status ? 'border-brand-red bg-brand-red/5' : 'border-border-default bg-surface-1/60',
            )}
          >
            <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
              <StatusChip status={status} type="project" />
              <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-text-3">{items.length}</span>
            </div>
            <div className="min-h-2 flex-1 space-y-2 overflow-y-auto overscroll-y-contain">
              {items.map((p) => (
                <div
                  key={p.id}
                  draggable
                  data-no-pan
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpen(p)}
                  className={cn(
                    'cursor-grab rounded-md border border-border-default bg-surface-1 p-3 transition-[transform,opacity,border-color] duration-150 hover:border-border-strong active:cursor-grabbing',
                    dragId === p.id ? 'scale-[0.98] opacity-40' : 'opacity-100',
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {p.channels.map((c) => <ChannelChip key={c} channel={c} compact />)}
                  </div>
                  <p className="font-ui text-body-sm/snug font-medium text-text-1">{p.name}</p>
                  <p className="mt-1 truncate font-ui text-[11px] text-text-4">{p.ownerName}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar value={p.progress} size="xs" className="flex-1" />
                    <span className="font-mono text-[10.5px] text-text-4">{p.progress}%</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="py-4 text-center text-[11px] text-text-4">Empty</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
