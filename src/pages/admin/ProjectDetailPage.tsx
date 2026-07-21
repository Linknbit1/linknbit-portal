import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Users, Layers, Paperclip, Calendar, Wallet, UserCircle,
  Pencil, Trash2, Flag, X, CheckCircle2, Columns, FileText, Bell,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Skeleton } from '../../components/ui/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { TaskBoard } from '../../components/shared/TaskBoard'
import { DocEditor } from '../../components/editor/DocEditor'
import { ProjectFilesTab } from './ProjectFilesTab'
import { ProjectFormModal } from './ProjectFormModal'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useProjectWatch } from '../../hooks/useWatchers'
import { useProjectFiles } from '../../hooks/useAttachments'
import { cn } from '../../lib/cn'
import { formatDate, formatCurrency, isOverdue, ROLE_LABELS } from '../../lib/utils'
import { isAuthoritative } from '../../lib/roles'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../components/ui/toast-context'
import { useDeleteProject, useProject, useProjectDeleteImpact, useUpdateProject } from '../../hooks/useProjects'
import { useStages, useDeleteStage } from '../../hooks/useStages'
import { useTasks } from '../../hooks/useTasks'
import { useProjectMembers, useRemoveProjectMember } from '../../hooks/useProjectMembers'
import { useApprovals, useRequestApproval, useReviewApproval } from '../../hooks/useApprovals'
import { useRealtimeTasks } from '../../hooks/realtime/useRealtimeTasks'
import { StageFormModal } from './StageFormModal'
import { TaskFormModal } from './TaskFormModal'
import { AddProjectMemberModal } from './AddProjectMemberModal'
import { ApprovalModal } from './ApprovalModal'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import type { StageRow } from '../../api/stages'
import type { TaskListItem } from '../../api/tasks'
import type { ApprovalStatus } from '../../api/approvals'
import type { UserRole } from '../../types'

const TABS = [
  { key: 'pipeline', label: 'Pipeline', icon: Layers },
  { key: 'board', label: 'Board', icon: Columns },
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'files', label: 'Files', icon: Paperclip },
  { key: 'team', label: 'Team', icon: Users },
] as const
type ProjectTab = typeof TABS[number]['key']

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuthContext()
  const canManage = isAuthoritative(profile?.role)

  const { data: project, isLoading } = useProject(id)
  const { data: stages = [] } = useStages(id)
  const { data: tasks = [] } = useTasks({ projectId: id })
  const { data: members = [] } = useProjectMembers(id)
  const { data: approvals = [] } = useApprovals({ projectId: id })
  const { data: projectFiles = [] } = useProjectFiles(id)
  useRealtimeTasks(id)

  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const watch = useProjectWatch(id)
  const deleteStage = useDeleteStage()
  const removeMember = useRemoveProjectMember()
  const requestApproval = useRequestApproval()
  const reviewApproval = useReviewApproval()

  const canViewBudget = useCanAccess('can_view_budget')
  // Delete is enforced by delete_project_cascade via the flag; showing it to anyone
  // else produced a button that always errored.
  const canDeleteProject = useCanAccess('can_delete_projects')
  const [projectView, setProjectView] = useState<ProjectTab>('pipeline')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [editingStage, setEditingStage] = useState<StageRow | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormStage, setTaskFormStage] = useState<string | undefined>(undefined)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [reviewStage, setReviewStage] = useState<StageRow | null>(null)
  const [pendingStageDelete, setPendingStageDelete] = useState<StageRow | null>(null)
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false)
  const { data: projectDeleteImpact, isLoading: projectDeleteImpactLoading } = useProjectDeleteImpact(confirmProjectDelete ? id : undefined)

  // Group tasks by stage; tasks without a stage fall into an "Unstaged" bucket.
  const tasksByStage = useMemo(() => {
    const map = new Map<string, TaskListItem[]>()
    for (const t of tasks) {
      const key = t.stage_id ?? '__none__'
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return map
  }, [tasks])

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Project" back="/admin/projects" />
        <div className="p-4 lg:px-8 lg:py-7 space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Project" back="/admin/projects" />
        <div className="p-10 text-center font-ui text-text-3">Project not found.</div>
      </div>
    )
  }

  const openAddTask = (stageId?: string) => { setTaskFormStage(stageId); setShowTaskForm(true) }
  const openEditStage = (stage: StageRow) => { setEditingStage(stage); setShowStageForm(true) }

  const handleRequestApproval = (stage: StageRow) => {
    requestApproval.mutate(
      { type: 'stage', project_id: id, target_id: stage.id, status: 'pending' },
      {
        onSuccess: () => toast('Approval requested', 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
      },
    )
  }

  const handleReview = (status: ApprovalStatus, message: string) => {
    if (!reviewStage) return
    const record = approvals.find((a) => a.target_id === reviewStage.id && a.status === 'pending')
    const finish = () => { toast('Decision recorded', 'success'); setReviewStage(null) }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Failed', 'error')
    if (record) {
      reviewApproval.mutate({ id: record.id, status, message, projectId: id }, { onSuccess: finish, onError })
    } else {
      finish()
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={project.name} back="/admin/projects" />
      <div className="p-4 lg:px-8 lg:py-7 space-y-5">
        {/* Summary header */}
        <div className="bg-surface-1 border border-border-default rounded-xl p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-[22px] text-text-1">{project.name}</h1>
                <ServiceChip service={project.service_type} />
                <StatusChip status={project.status} type="project" />
                <ClientVisibility visible={project.client_visible} showLabel />
              </div>
              {project.client?.name && <p className="font-ui text-[13px] text-text-3 mt-1">{project.client.name}</p>}
              {project.description && <p className="font-ui text-[13px] text-text-2 mt-2 max-w-2xl">{project.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={watch.isWatching ? 'primary' : 'secondary'}
                iconLeft={<Bell size={13} />}
                loading={watch.toggle.isPending}
                onClick={() => watch.toggle.mutate({ watching: watch.isWatching }, { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') })}
              >
                {watch.isWatching ? 'Watching' : 'Notify'}
              </Button>
              {canManage && (
                <>
                  <Button size="sm" variant="secondary" iconLeft={<Pencil size={13} />} onClick={() => setShowEdit(true)}>Edit</Button>
                  {canDeleteProject && (
                    <Button size="sm" variant="danger" iconLeft={<Trash2 size={13} />} onClick={() => setConfirmProjectDelete(true)}>Delete</Button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <Meta icon={UserCircle} label="Manager" value={project.manager?.name ?? '—'} />
            <Meta icon={Calendar} label="Deadline" value={project.deadline ? formatDate(project.deadline) : '—'} danger={!!project.deadline && isOverdue(project.deadline) && project.status !== 'completed'} />
            {canViewBudget && <Meta icon={Wallet} label="Budget" value={project.budget ? formatCurrency(project.budget) : '—'} />}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1.5">Progress</p>
              <div className="flex items-center gap-2">
                <ProgressBar value={project.progress} className="flex-1" />
                <span className="font-mono text-[11px] text-text-3">{project.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setProjectView(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-8 rounded-md font-ui font-medium text-[12.5px] whitespace-nowrap transition-colors',
                  projectView === t.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
                )}
              >
                <t.icon size={13} /> {t.label}{t.key === 'team' ? ` (${members.length})` : t.key === 'files' && projectFiles.length ? ` (${projectFiles.length})` : ''}
              </button>
            ))}
          </div>
          {canManage && (projectView === 'pipeline' || projectView === 'board') && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={() => { setEditingStage(null); setShowStageForm(true) }}>Stage</Button>
              <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => openAddTask()}>Task</Button>
            </div>
          )}
          {canManage && projectView === 'team' && (
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowAddMember(true)}>Add member</Button>
          )}
        </div>

        {projectView === 'pipeline' && (
          stages.length === 0 && (tasksByStage.get('__none__')?.length ?? 0) === 0 ? (
            <div className="bg-surface-1 border border-border-default rounded-md py-10 text-center font-ui text-[13px] text-text-4">
              No stages or tasks yet. {canManage && 'Add a stage or task to get started.'}
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  tasks={tasksByStage.get(stage.id) ?? []}
                  canManage={canManage}
                  onOpenTask={setOpenTaskId}
                  onAddTask={() => openAddTask(stage.id)}
                  onEdit={() => openEditStage(stage)}
                  onDelete={() => setPendingStageDelete(stage)}
                  onRequestApproval={() => handleRequestApproval(stage)}
                  onReview={() => setReviewStage(stage)}
                />
              ))}
              {(tasksByStage.get('__none__')?.length ?? 0) > 0 && (
                <div className="bg-surface-1 border border-border-default rounded-md">
                  <div className="px-4 py-2.5 border-b border-border-subtle font-ui font-semibold text-[12.5px] text-text-2">Unstaged tasks</div>
                  <TaskList tasks={tasksByStage.get('__none__') ?? []} onOpenTask={setOpenTaskId} />
                </div>
              )}
            </div>
          )
        )}

        {projectView === 'board' && (
          tasks.length === 0
            ? <div className="bg-surface-1 border border-border-default rounded-md py-10 text-center font-ui text-[13px] text-text-4">No tasks yet.</div>
            : <TaskBoard tasks={tasks} onOpenTask={setOpenTaskId} />
        )}

        {projectView === 'overview' && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <DocEditor
              key={id}
              value={project.doc}
              onSave={(doc) => updateProject.mutate({ id, updates: { doc } })}
              mentionItems={members}
              source={{ type: 'project', id, projectId: id }}
              placeholder="Project docs, credentials, resources… type / for commands, @ to mention"
            />
          </div>
        )}

        {projectView === 'files' && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-4 max-w-3xl">
            <ProjectFilesTab projectId={id} canManage={canManage} onOpenTask={setOpenTaskId} />
          </div>
        )}

        {projectView === 'team' && (
          <div className="max-w-3xl overflow-hidden rounded-xl border border-border-default bg-surface-1">
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-5 py-3">
              <h3 className="flex items-center gap-2 font-display text-[14px] font-bold text-text-1">
                <Users size={15} className="text-text-3" /> Project team
                <span className="font-mono text-[11px] font-normal text-text-4">{members.length}</span>
              </h3>
              {canManage && (
                <Button size="sm" variant="secondary" iconLeft={<Plus size={13} />} onClick={() => setShowAddMember(true)}>
                  Add members
                </Button>
              )}
            </div>
            {members.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-3"><Users size={19} /></span>
                <p className="font-ui text-[13px] text-text-2">No members yet</p>
                <p className="font-ui text-[11.5px] text-text-4">Add people individually or pull in a whole team at once.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2.5 transition-colors hover:border-border-default"
                  >
                    <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
                    <div className="min-w-0 flex-1">
                      <PersonLink personId={m.id} className="block truncate font-ui text-[13px] font-medium text-text-1">{m.name}</PersonLink>
                      <p className="truncate font-mono text-[10.5px] text-text-4">
                        {m.role_in_project ?? ROLE_LABELS[m.role as UserRole] ?? m.role}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => removeMember.mutate({ projectId: id, profileId: m.id }, { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') })}
                        className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} />}
      {showAddMember && <AddProjectMemberModal projectId={id} existingIds={members.map((m) => m.id)} onClose={() => setShowAddMember(false)} />}
      {showStageForm && <StageFormModal projectId={id} stage={editingStage ?? undefined} nextOrder={stages.length} onClose={() => setShowStageForm(false)} />}
      {showTaskForm && <TaskFormModal projectId={id} defaultStageId={taskFormStage} onClose={() => setShowTaskForm(false)} />}
      {reviewStage && <ApprovalModal title="Review stage" subject={reviewStage.name} pending={reviewApproval.isPending} onSubmit={handleReview} onClose={() => setReviewStage(null)} />}
      <TaskDetailDrawer taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />

      <ConfirmDialog
        open={confirmProjectDelete}
        title="Delete project?"
        message={
          <DeleteImpactMessage
            subject={project.name}
            loading={projectDeleteImpactLoading}
            lines={[
              ['Tasks', projectDeleteImpact?.tasks],
              ['Stages', projectDeleteImpact?.stages],
              ['Comments', projectDeleteImpact?.comments],
              ['Attachments', projectDeleteImpact?.attachments],
              ['Subtasks', projectDeleteImpact?.subtasks],
            ]}
            note="The project and its tasks will be hidden from active lists. Related comments, files, stages, subtasks, and assignees will be removed."
          />
        }
        confirmLabel="Delete project"
        danger
        isPending={deleteProject.isPending || projectDeleteImpactLoading}
        onConfirm={() => {
          deleteProject.mutate(id, {
            onSuccess: () => { toast('Project deleted', 'success'); navigate('/admin/projects') },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setConfirmProjectDelete(false)}
      />

      <ConfirmDialog
        open={!!pendingStageDelete}
        title="Delete stage?"
        message={pendingStageDelete ? `"${pendingStageDelete.name}" will be removed. Its tasks stay but become unstaged.` : ''}
        confirmLabel="Delete"
        danger
        isPending={deleteStage.isPending}
        onConfirm={() => {
          if (!pendingStageDelete) return
          deleteStage.mutate({ id: pendingStageDelete.id, projectId: id }, {
            onSuccess: () => { toast('Stage deleted', 'success'); setPendingStageDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setPendingStageDelete(null)}
      />
    </div>
  )
}

function DeleteImpactMessage({
  subject, loading, lines, note,
}: {
  subject: string
  loading: boolean
  lines: [string, number | undefined][]
  note: string
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
      <p className="text-text-3">{note}</p>
    </div>
  )
}

function Meta({ icon: Icon, label, value, danger }: { icon: typeof Calendar; label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1.5 flex items-center gap-1"><Icon size={11} /> {label}</p>
      <p className={cn('font-ui text-[13px] font-medium', danger ? 'text-error' : 'text-text-1')}>{value}</p>
    </div>
  )
}

function StageCard({
  stage, tasks, canManage, onOpenTask, onAddTask, onEdit, onDelete, onRequestApproval, onReview,
}: {
  stage: StageRow
  tasks: TaskListItem[]
  canManage: boolean
  onOpenTask: (id: string) => void
  onAddTask: () => void
  onEdit: () => void
  onDelete: () => void
  onRequestApproval: () => void
  onReview: () => void
}) {
  const done = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length
  return (
    <div className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle">
        <span className="size-6 rounded-full bg-surface-2 flex items-center justify-center text-text-3 shrink-0"><Layers size={13} /></span>
        <div className="min-w-0">
          <p className="font-ui font-semibold text-[13px] text-text-1 truncate">{stage.name}</p>
          <p className="font-mono text-[10px] text-text-4">{done}/{tasks.length} done</p>
        </div>
        {stage.requires_approval && stage.approval_status && <StatusChip status={stage.approval_status} type="approval" className="ml-1" />}
        <div className="ml-auto flex items-center gap-1">
          {stage.requires_approval && canManage && (
            stage.approval_status === 'pending'
              ? <Button size="sm" variant="secondary" iconLeft={<CheckCircle2 size={13} />} onClick={onReview}>Review</Button>
              : <Button size="sm" variant="ghost" iconLeft={<Flag size={13} />} onClick={onRequestApproval}>Request approval</Button>
          )}
          {canManage && <>
            <button onClick={onAddTask} className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2" aria-label="Add task"><Plus size={14} /></button>
            <button onClick={onEdit} className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2" aria-label="Edit stage"><Pencil size={13} /></button>
            <button onClick={onDelete} className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-error hover:bg-error/10" aria-label="Delete stage"><Trash2 size={13} /></button>
          </>}
        </div>
      </div>
      {tasks.length === 0
        ? <p className="p-4 text-center text-[12px] text-text-4">No tasks in this stage</p>
        : <TaskList tasks={tasks} onOpenTask={onOpenTask} />}
    </div>
  )
}

function TaskList({ tasks, onOpenTask }: { tasks: TaskListItem[]; onOpenTask: (id: string) => void }) {
  return (
    <ul>
      {tasks.map((t) => (
        <li
          key={t.id}
          onClick={() => onOpenTask(t.id)}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-2/50 cursor-pointer"
        >
          <span className="flex-1 min-w-0">
            <span className="font-ui text-[13px] text-text-1 truncate block">{t.title}</span>
            {t.due_date && (
              <span className={cn('font-mono text-[10.5px]', isOverdue(t.due_date) && t.status !== 'completed' && t.status !== 'approved' ? 'text-error' : 'text-text-4')}>{formatDate(t.due_date)}</span>
            )}
          </span>
          <PriorityChip priority={t.priority} />
          <StatusChip status={t.status} />
          {t.assignees.length > 0
            ? <AvatarGroup users={t.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatar_url ?? undefined }))} max={3} size="xs" linkToProfile />
            : <span className="size-6 rounded-full border border-dashed border-border-strong shrink-0" />}
        </li>
      ))}
    </ul>
  )
}
