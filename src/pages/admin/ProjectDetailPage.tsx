import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Users, Layers, Paperclip, Calendar, Wallet, UserCircle,
  Pencil, Trash2, Flag, X, CheckCircle2, Columns, FileText, Bell, BellOff, MoreVertical, History,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Skeleton } from '../../components/ui/Skeleton'
import { Count } from '../../components/ui/Count'
import { Select } from '../../components/ui/Select'
import { DepartedBadge } from '../../components/ui/DepartedBadge'
import { Popover } from '../../components/ui/Popover'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImpactSummary } from '../../components/ui/ImpactSummary'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { TimeBacklog } from '../../components/shared/TimeBacklog'
import { TaskBoard } from '../../components/shared/TaskBoard'
import { ScopeNotice } from '../../components/shared/ScopeNotice'
import { ScopeSwitch } from '../../components/shared/ScopeSwitch'
import { DocEditor } from '../../components/editor/DocEditor'
import { ProjectFilesTab } from './ProjectFilesTab'
import { ProjectFormModal } from './ProjectFormModal'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useProjectWatch } from '../../hooks/useWatchers'
import { useProjectFiles } from '../../hooks/useAttachments'
import { cn } from '../../lib/cn'
import { formatDate, formatCurrency, isOverdue, ROLE_LABELS } from '../../lib/utils'
import { fileKind } from '../../lib/attachment'
import { useToast } from '../../components/ui/toast-context'
import { useDeleteProject, useProject, useProjectDeleteImpact, useUpdateProject } from '../../hooks/useProjects'
import { useServiceStages, useDeleteStage } from '../../hooks/useStages'
import { useTasks } from '../../hooks/useTasks'
import {
  useProjectServices, useProjectServiceMembers, useUnstaffServiceMember, useServiceMemberTaskLoad,
  useRemoveProjectService,
} from '../../hooks/useProjectServices'
import { useServices } from '../../hooks/useServices'
import { useUsableTemplates, useApplyTemplate } from '../../hooks/useTemplates'
import { useApprovals, useRequestApproval, useReviewApproval } from '../../hooks/useApprovals'
import { useRealtimeTasks } from '../../hooks/realtime/useRealtimeTasks'
import { useScopedTasks } from '../../hooks/useScopeFilter'
import { PROJECT_TASK_QUERY_PARAM } from '../../constants/notifications'
import { StageFormModal } from './StageFormModal'
import { TaskFormModal } from './TaskFormModal'
import { AddProjectMemberModal } from './AddProjectMemberModal'
import { AddProjectServiceModal } from './AddProjectServiceModal'
import { ApprovalModal } from './ApprovalModal'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import type { StageRow } from '../../api/stages'
import type { TaskListItem } from '../../api/tasks'
import type { ApprovalStatus } from '../../api/approvals'
import type { UserRole } from '../../types'

const TABS = [
  { key: 'board', label: 'Board', icon: Columns },
  { key: 'pipeline', label: 'Pipeline', icon: Layers },
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'files', label: 'Files', icon: Paperclip },
  { key: 'team', label: 'Team', icon: Users },
  // Where this project's hours actually went, task by task. Same permission as
  // the Tasks page backlog — time is management data, not everyone's business.
  { key: 'backlog', label: 'Backlog', icon: History },
] as const
type ProjectTab = typeof TABS[number]['key']

/** Header overflow menu — keeps Notify/Edit/Delete out of the title row. */
function ProjectActionsMenu({
  isWatching, watchPending, canEdit, canDelete, onToggleWatch, onEdit, onDelete,
}: {
  isWatching: boolean
  watchPending: boolean
  canEdit: boolean
  canDelete: boolean
  onToggleWatch: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const run = (fn: () => void) => { setOpen(false); fn() }

  const itemClass = 'flex w-full items-center gap-2.5 px-3 py-2 text-left font-ui text-[12.5px] text-text-1 transition-colors hover:bg-surface-3'

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Project actions"
        aria-expanded={open}
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-2 text-text-3 transition-colors hover:text-text-1"
      >
        <MoreVertical size={15} />
      </button>
      {/* Popover only positions — the surface is the caller's, same as PersonActionsMenu. */}
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="w-48 overflow-hidden rounded-lg border border-border-default bg-surface-2 py-1 shadow-2xl"
      >
        <button className={itemClass} onClick={() => run(onToggleWatch)} disabled={watchPending}>
          {isWatching ? <BellOff size={14} className="text-text-4" /> : <Bell size={14} className="text-text-4" />}
          {isWatching ? 'Stop watching' : 'Notify me'}
        </button>
        {canEdit && (
          <button className={itemClass} onClick={() => run(onEdit)}>
            <Pencil size={14} className="text-text-4" /> Edit project
          </button>
        )}
        {canDelete && (
          <button className={cn(itemClass, 'text-error hover:bg-error/10')} onClick={() => run(onDelete)}>
            <Trash2 size={14} /> Delete project
          </button>
        )}
      </Popover>
    </>
  )
}

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const canManage = useCanAccess('can_manage_projects')

  const { data: project, isLoading } = useProject(id)
  const { data: services = [] } = useProjectServices(id)
  // Which service block is on screen. Falls back to the first one until picked,
  // so the page always shows real work instead of an empty shell.
  const [pickedServiceId, setPickedServiceId] = useState<string | null>(null)

  // Every task in the project, not just the active service's. Switching service
  // becomes instant instead of refetching, and it makes a real per-service task
  // count available for the switcher.
  const { data: projectTasks = [] } = useTasks({ projectId: id })
  const taskIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get(PROJECT_TASK_QUERY_PARAM),
    [location.search],
  )
  const taskFromUrl = useMemo(
    () => taskIdFromUrl ? projectTasks.find((t) => t.id === taskIdFromUrl) ?? null : null,
    [projectTasks, taskIdFromUrl],
  )
  const activeService = services.find((s) => s.id === (taskFromUrl?.project_service_id ?? pickedServiceId)) ?? services[0] ?? null
  const activeServiceId = activeService?.id

  const { data: stages = [] } = useServiceStages(activeServiceId)
  const allTasks = useMemo(
    () => projectTasks.filter((t) => t.project_service_id === activeServiceId),
    [projectTasks, activeServiceId],
  )
  // Me Mode applies here too, so the lens holds when you drill into a project.
  const tasks = useScopedTasks(allTasks)

  const taskCountByService = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of projectTasks) {
      map.set(t.project_service_id, (map.get(t.project_service_id) ?? 0) + 1)
    }
    return map
  }, [projectTasks])
  const { data: members = [] } = useProjectServiceMembers(id)
  const { data: approvals = [] } = useApprovals({ projectId: id })
  const { data: projectFiles = [] } = useProjectFiles(id)
  const fileItems = useMemo(() => projectFiles.map((f) => ({
    id: f.id, name: f.file_name, kind: f.kind === 'link' ? 'link' : fileKind(f.mime_type, f.file_name),
  })), [projectFiles])
  useRealtimeTasks(id)

  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const watch = useProjectWatch(id)
  const deleteStage = useDeleteStage()
  const removeService = useRemoveProjectService()
  const requestApproval = useRequestApproval()
  const reviewApproval = useReviewApproval()
  const { data: catalog = [] } = useServices()
  const { data: templates = [] } = useUsableTemplates(canManage)
  const applyTemplate = useApplyTemplate()

  const canViewBudget = useCanAccess('can_view_budget')
  // Delete is enforced by delete_project_cascade via the flag; showing it to anyone
  // else produced a button that always errored.
  const canManageProjects = useCanAccess('can_manage_projects')
  const canViewBacklog = useCanAccess('can_view_backlog')
  const [projectView, setProjectView] = useState<ProjectTab>('board')
  const visibleTabs = TABS.filter((t) => t.key !== 'backlog' || canViewBacklog)
  // Permissions resolve after first paint; clamp rather than stranding someone
  // on a tab that has just disappeared from the row.
  const requestedTab: ProjectTab = taskIdFromUrl ? 'board' : projectView
  const activeTab: ProjectTab = visibleTabs.some((t) => t.key === requestedTab) ? requestedTab : 'board'
  const [showEdit, setShowEdit] = useState(false)
  // Which service the "add member" modal is filling — the picker is per service now.
  const [addMemberFor, setAddMemberFor] = useState<string | null>(null)
  const [pendingServiceRemoval, setPendingServiceRemoval] = useState<string | null>(null)
  // Who is about to be taken off which block. Assigning somebody to a task
  // staffs them onto its service, so unstaffing has to answer for the tasks
  // that put them there rather than quietly leaving them holding the work.
  const [pendingUnstaff, setPendingUnstaff] = useState<{ serviceId: string; member: { id: string; name: string }; serviceName: string } | null>(null)
  const [showAddService, setShowAddService] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [editingStage, setEditingStage] = useState<StageRow | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormStage, setTaskFormStage] = useState<string | undefined>(undefined)
  const [manualOpenTaskId, setManualOpenTaskId] = useState<string | null>(null)
  const openTaskId = taskIdFromUrl ?? manualOpenTaskId
  const [reviewStage, setReviewStage] = useState<StageRow | null>(null)
  const [pendingStageDelete, setPendingStageDelete] = useState<StageRow | null>(null)
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false)
  const { data: projectDeleteImpact, isLoading: projectDeleteImpactLoading } = useProjectDeleteImpact(confirmProjectDelete ? id : undefined)

  // Templates that build the service currently on screen.
  const serviceTemplates = templates.filter((t) => t.service_id === activeService?.service_id)

  // Services the catalog can still offer this project.
  const unusedServices = catalog.filter(
    (c) => c.is_active && !services.some((s) => s.service_id === c.id),
  )

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

  const closeTaskDrawer = () => {
    setManualOpenTaskId(null)
    if (!taskIdFromUrl) return
    const params = new URLSearchParams(location.search)
    params.delete(PROJECT_TASK_QUERY_PARAM)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Project" back="/projects" />
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
        <Topbar title="Project" back="/projects" />
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
    <div className={cn('flex flex-col flex-1', activeTab === 'board' && 'min-h-0')}>
      <Topbar title={project.name} back="/projects" />
      {/* On the board tab the page stops scrolling and hands its remaining height
          to the board, so each column scrolls its own cards under a fixed header.
          overflow-hidden is what makes that binding: without it the tall summary
          header pushes the board past the viewport and <main> scrolls instead. */}
      <div className={cn('flex flex-col gap-5 p-4 lg:px-8 lg:py-7', activeTab === 'board' && 'min-h-0 flex-1 overflow-hidden')}>
        {/* Summary header */}
        <div className="shrink-0 bg-surface-1 border border-border-default rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-[19px] sm:text-[22px] text-text-1 wrap-break-word">{project.name}</h1>
              {project.client?.name && <p className="font-ui text-[13px] text-text-3 mt-1">{project.client.name}</p>}
              {project.description && <p className="font-ui text-[13px] text-text-2 mt-2 max-w-2xl">{project.description}</p>}
            </div>
            <ProjectActionsMenu
              isWatching={watch.isWatching}
              watchPending={watch.toggle.isPending}
              canEdit={canManage}
              canDelete={canManage && canManageProjects}
              onToggleWatch={() => watch.toggle.mutate({ watching: watch.isWatching }, { onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error') })}
              onEdit={() => setShowEdit(true)}
              onDelete={() => setConfirmProjectDelete(true)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <Meta
              icon={UserCircle}
              label={project.managers.length > 1 ? 'Managers' : 'Manager'}
              value={project.managers.length > 0 ? project.managers.map((m) => m.name).join(', ') : '-'}
              badge={project.managers.some((m) => m.is_active === false) ? <DepartedBadge /> : undefined}
            />
            <Meta icon={Calendar} label="Deadline" value={project.deadline ? formatDate(project.deadline) : '-'} danger={!!project.deadline && isOverdue(project.deadline) && project.status !== 'completed'} />
            {canViewBudget && <Meta icon={Wallet} label="Budget" value={project.budget ? formatCurrency(project.budget) : '-'} />}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1.5">Progress</p>
              <div className="flex items-center gap-2">
                <ProgressBar value={project.progress} className="flex-1" />
                <span className="font-mono text-[11px] text-text-3">{project.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Which service block is on screen. Framed as its own labelled selector so
            it does not read as a second row of tabs — everything below it (Board,
            Pipeline, Team) shows only the service picked here. */}
        <div className="shrink-0 rounded-lg border border-border-default bg-surface-1 p-2.5">
          <p className="mb-2 px-0.5 font-mono text-[10px] uppercase tracking-wider text-text-4">
            Viewing service block
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {services.map((s) => {
              const active = s.id === activeServiceId
              const colour = s.service?.color ?? '#8A93A3'
              const taskCount = taskCountByService.get(s.id) ?? 0
              const memberCount = members.filter((m) => m.project_service_id === s.id).length
              return (
                <div
                  key={s.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md border py-1.5 pl-2.5 pr-2 transition-colors',
                    active ? 'bg-surface-3' : 'border-border-default bg-surface-2/40 hover:bg-surface-2',
                  )}
                  // Active block wears its service colour, so which one you are in
                  // is readable without comparing against the others.
                  style={active ? { borderColor: colour, background: `${colour}14` } : undefined}
                >
                  <button
                    onClick={() => setPickedServiceId(s.id)}
                    aria-current={active}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colour }} />
                    <span className={cn('font-ui text-[12.5px] font-semibold', active ? 'text-text-1' : 'text-text-3')}>
                      {s.service?.name ?? 'Service'}
                    </span>
                    {/* Both numbers labelled — an unlabelled "0" read as "no tasks"
                        when it actually meant "nobody staffed". */}
                    <span className="flex items-center gap-1.5">
                      <Count value={taskCount} icon={CheckCircle2} label={`${taskCount} task${taskCount === 1 ? '' : 's'}`} />
                      <Count value={memberCount} icon={Users} label={`${memberCount} member${memberCount === 1 ? '' : 's'}`} />
                    </span>
                  </button>
                  {canManage && services.length > 1 && (
                    <button
                      aria-label={`Remove ${s.service?.name ?? 'service'} from this project`}
                      onClick={() => setPendingServiceRemoval(s.id)}
                      className="flex size-5 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )
            })}
            {canManage && unusedServices.length > 0 && (
              <Button size="sm" variant="secondary" iconLeft={<Plus size={13} />} onClick={() => setShowAddService(true)}>
                Add service
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 overflow-x-auto no-scrollbar">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setProjectView(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-8 rounded-md font-ui font-medium text-[12.5px] whitespace-nowrap transition-colors',
                  activeTab === t.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
                )}
              >
                <t.icon size={13} /> {t.label}
                {t.key === 'team' && <Count value={members.length} label={`${members.length} member${members.length === 1 ? '' : 's'}`} />}
                {t.key === 'files' && projectFiles.length > 0 && <Count value={projectFiles.length} label={`${projectFiles.length} file${projectFiles.length === 1 ? '' : 's'}`} />}
              </button>
            ))}
          </div>
          {(activeTab === 'pipeline' || activeTab === 'board') && (
            <div className="flex items-center gap-2">
              {/* Compact here: inside one project the labels are redundant — the
                  only question is whose of THESE tasks you are looking at. */}
              <ScopeSwitch size="sm" compact />
              {canManage && (
                <>
                  <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={() => { setEditingStage(null); setShowStageForm(true) }}>Stage</Button>
                  <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => openAddTask()}>Task</Button>
                </>
              )}
            </div>
          )}
          {canManage && activeTab === 'team' && activeServiceId && (
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => setAddMemberFor(activeServiceId)}>
              Add to {activeService?.service?.name ?? 'service'}
            </Button>
          )}
        </div>

        {activeTab === 'pipeline' && (
          stages.length === 0 && (tasksByStage.get('__none__')?.length ?? 0) === 0 ? (
            <div className="bg-surface-1 border border-border-default rounded-md py-10 px-4 text-center font-ui text-[13px] text-text-4 space-y-3">
              <p>No stages or tasks yet. {canManage && 'Add a stage or task to get started.'}</p>
              {/* A template for this exact service turns an empty block into a pipeline. */}
              {canManage && activeServiceId && serviceTemplates.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="font-ui text-[12.5px] text-text-3">or start from a template:</span>
                  <Select
                    value=""
                    placeholder="Apply template…"
                    size="sm"
                    className="w-56"
                    options={serviceTemplates.map((t) => ({
                      value: t.id,
                      label: `${t.name} · ${t.stages.length} stage${t.stages.length === 1 ? '' : 's'}`,
                    }))}
                    onChange={(templateId) => applyTemplate.mutate(
                      { projectServiceId: activeServiceId, templateId },
                      {
                        onSuccess: (r) => toast(`Added ${r.stages_created} stage(s) and ${r.tasks_created} task(s)`, 'success'),
                        onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
                      },
                    )}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  tasks={tasksByStage.get(stage.id) ?? []}
                  canManage={canManage}
                  onOpenTask={setManualOpenTaskId}
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
                  <TaskList tasks={tasksByStage.get('__none__') ?? []} onOpenTask={setManualOpenTaskId} />
                </div>
              )}
            </div>
          )
        )}

        {(activeTab === 'board' || activeTab === 'pipeline') && (
          <ScopeNotice shown={tasks.length} total={allTasks.length} />
        )}

        {activeTab === 'board' && (
          tasks.length === 0
            ? <div className="bg-surface-1 border border-border-default rounded-md py-10 text-center font-ui text-[13px] text-text-4">No tasks yet.</div>
            : <TaskBoard tasks={tasks} onOpenTask={setManualOpenTaskId} />
        )}

        {activeTab === 'overview' && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-4 sm:p-5">
            <DocEditor
              key={id}
              value={project.doc}
              onSave={(doc) => updateProject.mutate({ id, updates: { doc } })}
              mentionItems={members}
              fileItems={fileItems}
              source={{ type: 'project', id, projectId: id }}
              placeholder="Project docs… / for commands, @ to mention, # to attach a file"
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-3 sm:p-4 max-w-3xl">
            <ProjectFilesTab projectId={id} canManage={canManage} onOpenTask={setManualOpenTaskId} />
          </div>
        )}

        {/* People belong to a service, so the team reads as one block per service. */}
        {activeTab === 'team' && (
          // Full-width panels stacked, not a wrapping row: a project with one
          // service used to leave a card marooned in the left half of an empty
          // screen, and the tab is read top-to-bottom anyway — "who is on
          // Design, who is on Development" — not compared side by side.
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-surface-1 px-4 py-14 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-3"><Users size={19} /></span>
                <p className="font-ui text-[13px] text-text-2">This project has no services yet</p>
                <p className="font-ui text-[11.5px] text-text-4">People are staffed onto a service, so add one first.</p>
                {canManage && (
                  <Button size="sm" variant="secondary" className="mt-1" iconLeft={<Plus size={13} />} onClick={() => setShowAddService(true)}>
                    Add a service
                  </Button>
                )}
              </div>
            ) : services.map((s) => {
              const roster = members.filter((m) => m.project_service_id === s.id)
              return (
                <div key={s.id} className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
                  {/* The service colour runs down the edge of its own block, so
                      three stacked panels are told apart at a glance. */}
                  <div className="flex items-stretch border-b border-border-subtle bg-surface-2/30">
                    <span className="w-0.75 shrink-0" style={{ background: s.service?.color ?? 'transparent' }} aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 px-4 py-3">
                      {s.service && <ServiceChip service={s.service.slug} />}
                      <span className="font-ui text-[13px] font-semibold text-text-1">{s.service?.name ?? 'Service'}</span>
                      <span className="rounded-sm bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-text-3">
                        {roster.length} {roster.length === 1 ? 'member' : 'members'}
                      </span>
                      {canManage && (
                        <Button size="sm" variant="secondary" className="ml-auto" iconLeft={<Plus size={13} />} onClick={() => setAddMemberFor(s.id)}>
                          Add members
                        </Button>
                      )}
                    </div>
                  </div>
                  {roster.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-3"><Users size={19} /></span>
                      <p className="font-ui text-[13px] text-text-2">Nobody on this service yet</p>
                      <p className="font-ui text-[11.5px] text-text-4">Add people individually or pull in a whole team at once.</p>
                    </div>
                  ) : (
                    // Fixed column counts rather than auto-fill: the panel is now
                    // always full width, and auto-fill left a three-person service
                    // trailing four empty tracks across the rest of the row.
                    <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {roster.map((m) => (
                        <div
                          key={m.id}
                          className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2.5 transition-colors hover:border-border-default hover:bg-surface-2/70"
                        >
                          <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
                          <div className="min-w-0 flex-1">
                            <PersonLink personId={m.id} className="block truncate font-ui text-[13px] font-medium text-text-1">{m.name}</PersonLink>
                            <p className="truncate font-mono text-[10.5px] text-text-4">
                              {m.role_in_service ?? ROLE_LABELS[m.role as UserRole] ?? m.role}
                            </p>
                          </div>
                          {canManage && (
                            <button
                              onClick={() => setPendingUnstaff({
                                serviceId: s.id,
                                member: { id: m.id, name: m.name },
                                serviceName: s.service?.name ?? 'this service',
                              })}
                              className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100 focus-visible:opacity-100"
                              aria-label={`Remove ${m.name} from ${s.service?.name ?? 'service'}`}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Scoped to this project, grouped by task — "which task ate the hours". */}
        {activeTab === 'backlog' && canViewBacklog && (
          <TimeBacklog projectId={id} groupBy="task" />
        )}
      </div>

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} />}
      {showAddService && (
        <AddProjectServiceModal
          projectId={id}
          options={unusedServices.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          onAdded={setPickedServiceId}
          onClose={() => setShowAddService(false)}
        />
      )}
      {pendingUnstaff && (
        <UnstaffMemberDialog
          projectId={id}
          projectServiceId={pendingUnstaff.serviceId}
          serviceName={pendingUnstaff.serviceName}
          member={pendingUnstaff.member}
          onClose={() => setPendingUnstaff(null)}
        />
      )}
      {addMemberFor && (
        <AddProjectMemberModal
          projectId={id}
          projectServiceId={addMemberFor}
          serviceName={services.find((s) => s.id === addMemberFor)?.service?.name ?? 'service'}
          existingIds={members.filter((m) => m.project_service_id === addMemberFor).map((m) => m.id)}
          onClose={() => setAddMemberFor(null)}
        />
      )}
      {showStageForm && activeServiceId && (
        <StageFormModal
          projectId={id}
          projectServiceId={activeServiceId}
          stage={editingStage ?? undefined}
          nextOrder={stages.length}
          onClose={() => setShowStageForm(false)}
        />
      )}
      {showTaskForm && activeServiceId && (
        <TaskFormModal
          projectId={id}
          projectServiceId={activeServiceId}
          defaultStageId={taskFormStage}
          onClose={() => setShowTaskForm(false)}
        />
      )}
      {reviewStage && <ApprovalModal title="Review stage" subject={reviewStage.name} pending={reviewApproval.isPending} onSubmit={handleReview} onClose={() => setReviewStage(null)} />}
      <TaskDetailDrawer taskId={openTaskId} open={!!openTaskId} onClose={closeTaskDrawer} />

      <ConfirmDialog
        open={confirmProjectDelete}
        title="Delete project?"
        message={
          <ImpactSummary
            lead={<><strong className="text-text-1">{project.name}</strong> will be permanently deleted after confirmation.</>}
            loading={projectDeleteImpactLoading}
            counts={[
              { label: 'Tasks', value: projectDeleteImpact?.tasks },
              { label: 'Stages', value: projectDeleteImpact?.stages },
              { label: 'Comments', value: projectDeleteImpact?.comments },
              { label: 'Attachments', value: projectDeleteImpact?.attachments },
              { label: 'Subtasks', value: projectDeleteImpact?.subtasks },
              { label: 'Time entries', value: projectDeleteImpact?.timeEntries },
            ]}
            note="This cannot be undone. The project, its tasks, comments, files, stages, subtasks, staffing and all time logged against its tasks are removed for good — there is nothing left to restore from."
          />
        }
        confirmLabel="Delete project"
        danger
        isPending={deleteProject.isPending || projectDeleteImpactLoading}
        onConfirm={() => {
          deleteProject.mutate(id, {
            onSuccess: () => { toast('Project deleted', 'success'); navigate('/projects') },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setConfirmProjectDelete(false)}
      />

      <ConfirmDialog
        open={!!pendingServiceRemoval}
        title="Remove service?"
        message={
          pendingServiceRemoval
            ? `"${services.find((s) => s.id === pendingServiceRemoval)?.service?.name ?? 'This service'}" will be removed from this project, along with the people staffed on it. Its stages and tasks must be moved or deleted first.`
            : ''
        }
        confirmLabel="Remove service"
        danger
        isPending={removeService.isPending}
        onConfirm={() => {
          if (!pendingServiceRemoval) return
          removeService.mutate({ projectId: id, projectServiceId: pendingServiceRemoval }, {
            onSuccess: () => {
              toast('Service removed', 'success')
              if (pickedServiceId === pendingServiceRemoval) setPickedServiceId(null)
              setPendingServiceRemoval(null)
            },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setPendingServiceRemoval(null)}
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

function Meta({ icon: Icon, label, value, danger, badge }: { icon: typeof Calendar; label: string; value: string; danger?: boolean; badge?: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1.5 flex items-center gap-1"><Icon size={11} /> {label}</p>
      <p className={cn('font-ui text-[13px] font-medium flex items-center gap-1.5 min-w-0', danger ? 'text-error' : 'text-text-1')}>
        <span className="truncate">{value}</span>
        {badge}
      </p>
    </div>
  )
}

interface UnstaffMemberDialogProps {
  projectId: string
  projectServiceId: string
  serviceName: string
  member: { id: string; name: string }
  onClose: () => void
}

/**
 * Confirms taking somebody off a service block, saying what it costs.
 *
 * Its own component so the "what are they still holding" query only exists
 * while the question is being asked, and is asked fresh each time.
 */
function UnstaffMemberDialog({
  projectId, projectServiceId, serviceName, member, onClose,
}: UnstaffMemberDialogProps) {
  const toast = useToast()
  const unstaff = useUnstaffServiceMember()
  const { data: load, isLoading } = useServiceMemberTaskLoad(projectServiceId, member.id)

  const plural = (n: number) => (n === 1 ? 'task' : 'tasks')

  return (
    <ConfirmDialog
      open
      title={`Remove ${member.name} from ${serviceName}?`}
      message={
        <ImpactSummary
          lead={<><strong className="text-text-1">{member.name}</strong> will be taken off {serviceName}.</>}
          loading={isLoading}
          counts={[
            { label: 'Assignee on', value: load?.assigned },
            { label: 'Reviewer on', value: load?.reviewing },
          ]}
          note="They are removed from that work as well, so it reads as unassigned rather than as theirs. Anything they have said in a comment stays where it is."
        />
      }
      confirmLabel="Remove"
      pendingLabel="Removing…"
      isPending={unstaff.isPending}
      onConfirm={() => unstaff.mutate(
        { projectId, projectServiceId, profileId: member.id },
        {
          onSuccess: (result) => {
            const freed = result.unassigned + result.unreviewed
            toast(
              freed > 0
                ? `${member.name} removed, and taken off ${freed} ${plural(freed)}`
                : `${member.name} removed`,
              'success',
            )
            onClose()
          },
          onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
        },
      )}
      onClose={onClose}
    />
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
