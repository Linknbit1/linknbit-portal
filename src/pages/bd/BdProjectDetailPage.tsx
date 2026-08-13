import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Columns, Users, Send, SlidersHorizontal, Pencil, Trash2, Plus, Calendar,
  UserCircle, CheckSquare, Target, type LucideIcon,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Tabs } from '../../components/ui/Tabs'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/toast-context'
import { StatusChip } from '../../components/shared/StatusChip'
import { ChannelChip } from '../../components/shared/BdChips'
import { CHANNEL_CONFIG, CHANNEL_ORDER, BD_PROJECT_COLUMNS } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import { formatCompactCurrency, formatDate, isOverdue, PROJECT_STATUS_LABELS } from '../../lib/utils'
import { BD_REPS } from '../../data/bdMock'
import { BdTaskBoard } from './BdTaskBoard'
import { TaskDrawer } from './TaskDrawer'
import type { BdChannel, BdProject, ProjectStatus, TaskStatus } from '../../types'

const TABS = [
  { key: 'board', label: 'Board', icon: Columns },
  { key: 'outreach', label: 'Outreach', icon: Send },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'settings', label: 'Settings', icon: SlidersHorizontal },
] as const

type ProjectTab = typeof TABS[number]['key']

/** Click-to-rename heading — the same affordance as the task drawer. */
function EditableTitle({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSave(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label="Project name"
        className="w-full rounded-sm border border-border-focus bg-surface-inset px-2 py-1 font-display text-[19px] font-bold text-text-1 outline-none sm:text-[22px]"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Rename project"
      className="group -mx-2 flex w-full items-start gap-2 rounded-sm px-2 py-1 text-left transition-colors hover:bg-surface-2"
    >
      <h1 className="font-display text-[19px] font-bold wrap-break-word text-text-1 sm:text-[22px]">{value}</h1>
      <Pencil size={13} className="mt-2 shrink-0 text-text-4 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100" />
    </button>
  )
}

function Meta({ icon: Icon, label, value, danger }: { icon: LucideIcon; label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-text-4">{label}</p>
      <p className={cn('flex items-center gap-1.5 truncate font-ui text-[13px]', danger ? 'text-error' : 'text-text-1')}>
        <Icon size={13} className="shrink-0 text-text-4" /> {value}
      </p>
    </div>
  )
}

/**
 * A BD project — an outreach campaign — and everything hanging off it.
 *
 * Mirrors the delivery project page (summary header, tabbed body) but scoped to
 * what a campaign actually has: its tasks, the channel effort it produced, its
 * team. Every field edits in place; there is no edit modal, matching the task
 * drawer.
 */
export default function BdProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    projects, tasks, activities, leads, patchProject, deleteProject, saveTask,
    viewerRepId, viewerName,
  } = useBd()

  const [tab, setTab] = useState<ProjectTab>('board')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const project = projects.find((p) => p.id === id)
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === id), [tasks, id])

  /** Effort on the channels this campaign runs — what it actually produced. */
  const campaignActivity = useMemo(() => {
    if (!project) return []
    return activities.filter((a) => project.channels.includes(a.channel))
  }, [activities, project])

  if (!project) {
    return (
      <div className="flex flex-1 flex-col">
        <Topbar title="Project" back="/bd/projects" />
        <div className="p-10 text-center font-ui text-text-3">Project not found.</div>
      </div>
    )
  }

  const patch = (next: Partial<BdProject>) => patchProject(project.id, next)
  const overdue = !!project.deadline && isOverdue(project.deadline) && project.status !== 'completed'
  const done = projectTasks.filter((t) => t.status === 'completed' || t.status === 'approved').length
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null

  const addTask = (status: TaskStatus = 'todo') => {
    const taskId = randomUUID()
    saveTask({
      id: taskId,
      title: 'New task',
      assigneeId: viewerRepId,
      assigneeName: viewerName,
      status,
      priority: 'medium',
      dueDate: null,
      projectId: project.id,
      projectName: project.name,
      recurrence: 'once',
      createdBy: viewerName,
      checklist: [],
    })
    setOpenTaskId(taskId)
  }

  const toggleChannel = (channel: BdChannel) =>
    patch({
      channels: project.channels.includes(channel)
        ? project.channels.filter((c) => c !== channel)
        : [...project.channels, channel],
    })

  const toggleMember = (repId: string) => {
    const rep = BD_REPS.find((r) => r.id === repId)
    if (!rep) return
    patch({
      members: project.members.some((m) => m.id === repId)
        ? project.members.filter((m) => m.id !== repId)
        : [...project.members, { id: rep.id, name: rep.name }],
    })
  }

  return (
    <div className={cn('flex flex-1 flex-col', tab === 'board' && 'min-h-0')}>
      <Topbar title={project.name} back="/bd/projects" />
      <div className={cn('flex flex-col gap-5 p-4 lg:px-8 lg:py-7', tab === 'board' && 'min-h-0 flex-1 overflow-hidden')}>
        {/* ── Summary ── */}
        <div className="shrink-0 rounded-xl border border-border-default bg-surface-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <EditableTitle value={project.name} onSave={(name) => patch({ name })} />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {project.channels.map((c) => <ChannelChip key={c} channel={c} />)}
                {project.channels.length === 0 && (
                  <span className="font-ui text-[12px] text-text-4">No channels yet</span>
                )}
              </div>
              {project.description && (
                <p className="mt-2 max-w-2xl font-ui text-[13px] text-text-2">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={project.status}
                onChange={(v) => { patch({ status: v as ProjectStatus }); toast(`Moved to ${PROJECT_STATUS_LABELS[v as ProjectStatus]}`, 'success') }}
                options={BD_PROJECT_COLUMNS.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
                size="sm"
                className="w-40"
              />
              <button
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete project"
                className="flex size-8 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Meta icon={UserCircle} label="Owner" value={project.ownerName} />
            <Meta
              icon={Calendar}
              label="Deadline"
              value={project.deadline ? formatDate(project.deadline) : '—'}
              danger={overdue}
            />
            <Meta icon={CheckSquare} label="Tasks" value={`${done}/${projectTasks.length} done`} />
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-text-4">Progress</p>
              <div className="flex items-center gap-2">
                <ProgressBar value={project.progress} className="flex-1" />
                <span className="font-mono text-[11px] text-text-3">{project.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          tabs={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            badge: t.key === 'board' ? projectTasks.length : t.key === 'team' ? project.members.length : undefined,
          }))}
          activeKey={tab}
          onChange={(k) => setTab(k as ProjectTab)}
          className="shrink-0"
        />

        {tab === 'board' && (
          projectTasks.length === 0 ? (
            <EmptyTab
              icon={Columns}
              title="No tasks on this campaign yet"
              body="Tasks are the work behind the outreach — proposals to prep, lists to build, follow-ups to make."
              action={<Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={() => addTask()}>Add the first task</Button>}
            />
          ) : (
            <BdTaskBoard tasks={projectTasks} onOpenTask={setOpenTaskId} onAddTask={addTask} />
          )
        )}

        {tab === 'outreach' && <OutreachTab project={project} activity={campaignActivity} leads={leads} />}

        {tab === 'team' && (
          <div className="rounded-lg border border-border-default bg-surface-1 p-4 lg:p-5">
            <p className="mb-3 font-ui text-[12px] font-medium text-text-2">Who is on this campaign</p>
            <div className="flex flex-col gap-1.5">
              {BD_REPS.map((rep) => {
                const on = project.members.some((m) => m.id === rep.id)
                const repTasks = projectTasks.filter((t) => t.assigneeId === rep.id).length
                return (
                  <button
                    key={rep.id}
                    onClick={() => toggleMember(rep.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                      on ? 'border-brand-red/30 bg-brand-red/8' : 'border-border-default bg-surface-2/40 hover:border-border-strong',
                    )}
                  >
                    <Avatar name={rep.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-ui text-[13px] text-text-1">{rep.name}</span>
                      <span className="block font-ui text-[11.5px] text-text-4">{rep.role}</span>
                    </span>
                    {repTasks > 0 && (
                      <span className="font-mono text-[11px] text-text-4">{repTasks} task{repTasks === 1 ? '' : 's'}</span>
                    )}
                    <span className={cn('font-ui text-[11.5px]', on ? 'text-brand-red' : 'text-text-4')}>
                      {on ? 'On campaign' : 'Add'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-surface-1 p-4 lg:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Owner"
                value={project.ownerId}
                onChange={(v) => {
                  const rep = BD_REPS.find((r) => r.id === v)
                  patch({ ownerId: v, ownerName: rep?.name ?? project.ownerName })
                }}
                options={BD_REPS.map((r) => ({ value: r.id, label: r.name }))}
              />
              <div>
                <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Deadline</p>
                <DatePicker
                  value={project.deadline ?? ''}
                  onChange={(v) => patch({ deadline: v || null })}
                  placeholder="No deadline"
                />
              </div>
              <Input
                label="Progress (%)"
                type="number"
                min={0}
                max={100}
                step={5}
                value={project.progress}
                onChange={(e) => patch({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              />
            </div>

            <div>
              <label htmlFor="bd-project-desc" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
                Description
              </label>
              <textarea
                id="bd-project-desc"
                value={project.description ?? ''}
                onChange={(e) => patch({ description: e.target.value || undefined })}
                rows={3}
                placeholder="What this campaign is targeting, and how…"
                className={cn(
                  'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
                  'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
                )}
              />
            </div>

            <div>
              <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Channels</p>
              <div className="flex flex-wrap gap-1.5">
                {CHANNEL_ORDER.map((channel) => {
                  const config = CHANNEL_CONFIG[channel]
                  const Icon = config.icon
                  const active = project.channels.includes(channel)
                  return (
                    <button
                      key={channel}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleChannel(channel)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-ui text-[12px] transition-colors duration-150',
                        active
                          ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                          : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                      )}
                    >
                      <Icon size={12} className={active ? config.tint : undefined} />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <TaskDrawer task={openTask} onClose={() => setOpenTaskId(null)} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete project?"
        message={
          <span>
            <strong className="text-text-1">{project.name}</strong> will be deleted, along with its{' '}
            {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}.
          </span>
        }
        confirmLabel="Delete project"
        danger
        onConfirm={() => { deleteProject(project.id); toast('Project deleted', 'success'); navigate('/bd/projects') }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function EmptyTab({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3"><Icon size={22} /></span>
      <p className="font-ui text-[14px] text-text-2">{title}</p>
      <p className="max-w-[46ch] font-ui text-[12.5px]/relaxed text-text-4">{body}</p>
      {action}
    </div>
  )
}

/**
 * What this campaign's channels have produced.
 *
 * Reads the same activity list the Outreach page does, filtered to the channels
 * this project runs — so a campaign's numbers and the department's cannot
 * disagree.
 */
function OutreachTab({
  project, activity, leads,
}: {
  project: BdProject
  activity: ReturnType<typeof useBd>['activities']
  leads: ReturnType<typeof useBd>['leads']
}) {
  if (project.channels.length === 0) {
    return (
      <EmptyTab
        icon={Send}
        title="No channels on this campaign"
        body="Add the channels this campaign runs in Settings, and the effort logged against them shows up here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {project.channels.map((channel) => {
          const config = CHANNEL_CONFIG[channel]
          const Icon = config.icon
          const effort = activity.filter((a) => a.channel === channel)
          const channelLeads = leads.filter((l) => l.channel === channel)
          const won = channelLeads.filter((l) => l.stage === 'won')
          const passive = !!config.passive
          const volume = effort.reduce((n, a) => n + a.volume, 0)
          const replies = effort.reduce((n, a) => n + (passive ? a.volume : a.responses), 0)

          return (
            <article key={channel} className="flex flex-col gap-4 rounded-lg border border-border-default bg-surface-1 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-2">
                  <Icon size={16} className={config.tint} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-ui text-[14px] font-semibold text-text-1">{config.label}</h3>
                  <p className="font-ui text-[11.5px] text-text-3">{config.volumeLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 border-t border-border-subtle pt-3.5">
                <Stat label={passive ? 'In' : 'Sent'} value={volume} />
                <Stat label="Replies" value={replies} />
                <Stat label="Leads" value={channelLeads.length} />
                <Stat label="Won" value={won.length} tone={won.length > 0 ? 'success' : undefined} />
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                <span className="font-ui text-[11px] uppercase tracking-widest text-text-4">Revenue</span>
                <span className="font-display text-[15px] font-bold tabular-nums text-text-1">
                  {won.length > 0 ? formatCompactCurrency(won.reduce((n, l) => n + l.value, 0)) : '—'}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="rounded-lg border border-border-default bg-surface-1 p-4 lg:p-5">
        <p className="mb-3 flex items-center gap-2 font-ui text-[12px] font-medium text-text-2">
          <Target size={13} className="text-text-4" /> Leads from these channels
        </p>
        {(() => {
          const relevant = leads.filter((l) => project.channels.includes(l.channel))
          if (relevant.length === 0) {
            return <p className="py-6 text-center font-ui text-[12.5px] text-text-4">No leads from these channels yet.</p>
          }
          return (
            <div className="flex flex-col divide-y divide-border-subtle">
              {relevant.map((lead) => (
                <div key={lead.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-ui text-[13px] text-text-1">{lead.company}</span>
                  <StatusChip status={lead.stage === 'won' ? 'completed' : lead.stage === 'lost' ? 'blocked' : 'in_progress'} />
                  <span className="font-mono text-[12px] tabular-nums text-text-2">{formatCompactCurrency(lead.value)}</span>
                  <AvatarGroup users={[{ id: lead.ownerId, name: lead.ownerName }]} max={1} size="xs" />
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-ui text-[10px] uppercase tracking-wider text-text-4">{label}</p>
      <p className={cn('mt-0.5 font-display text-body-lg/tight font-bold tabular-nums', tone === 'success' ? 'text-success' : 'text-text-1')}>
        {value}
      </p>
    </div>
  )
}
