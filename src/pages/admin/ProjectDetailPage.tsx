import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Clock, Plus,
  FileText, Image, File, RefreshCw, CheckCheck, RotateCcw,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { PROJECTS, TASKS, USERS } from '../../data/mock'
import { formatDate, formatCurrency, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  figma: FileText,
  text: File,
  other: File,
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0]
  const tasks = TASKS.filter((t) => t.projectId === project.id)
  const teamMembers = USERS.filter((u) => project.teamIds.includes(u.id))

  const currentStageIndex = project.stages.findIndex((s) => s.status === 'current' || s.status === 'blocked')
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  const days = getDaysUntil(project.deadline)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        breadcrumb="Projects"
        title={project.name}
      />

      <div className="p-8 grid grid-cols-[1fr_280px] gap-6 max-w-content mx-auto w-full">
        {/* ── LEFT: Main content ── */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Project header */}
          <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="font-display font-bold text-h2 text-text-1 tracking-tight mb-2">
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm text-text-3">{project.clientName}</span>
                  <span className="text-text-4">·</span>
                  <ServiceChip service={project.serviceType} />
                  <StatusChip status={project.status} type="project" />
                  <span className={cn('text-caption font-mono', days <= 3 ? 'text-error font-bold' : days <= 5 ? 'text-warning' : 'text-text-3')}>
                    Due {formatDate(project.deadline)}
                  </span>
                  {project.budget && (
                    <span className="text-caption text-text-3 font-mono">
                      {formatCurrency(project.budget)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ClickUpStatus status={project.clickUpSync} showLabel />
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="danger" size="sm">Archive</Button>
              </div>
            </div>
            {/* PM */}
            <div className="flex items-center gap-2">
              <Avatar name={project.pm.name} size="sm" />
              <div>
                <p className="text-body-sm font-ui font-semibold text-text-1">{project.pm.name}</p>
                <RoleBadge role={project.pm.role} />
              </div>
              {project.internalNote && (
                <p className="ml-4 text-body-sm text-text-2 border-l border-border-default pl-4 italic">
                  {project.internalNote}
                </p>
              )}
            </div>
          </Card>

          {/* Stage pipeline */}
          {project.stages.length > 0 && (
            <Card>
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-5">
                Project Pipeline
              </h3>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute top-4 left-4 right-4 h-px bg-border-default" />
                <div className="flex gap-0 overflow-x-auto pb-2 relative">
                  {project.stages.map((stage, i) => (
                    <div key={stage.id} className="flex flex-col items-center flex-1 min-w-[90px]">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 flex-shrink-0 transition-all',
                          stage.status === 'completed'
                            ? 'bg-success border-success text-white'
                            : stage.status === 'blocked'
                            ? 'bg-error/15 border-error text-error'
                            : stage.status === 'current'
                            ? 'bg-service-dev/15 border-service-dev text-service-dev'
                            : 'bg-surface-1 border-border-default text-text-4',
                        )}
                      >
                        {stage.status === 'completed' ? (
                          <CheckCircle2 size={14} />
                        ) : stage.status === 'blocked' ? (
                          <AlertTriangle size={14} />
                        ) : stage.status === 'current' ? (
                          <Clock size={14} />
                        ) : (
                          <span className="font-mono text-[10px]">{i + 1}</span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'text-[10px] font-ui text-center mt-2 leading-tight px-1',
                          stage.status === 'completed' ? 'text-text-3' :
                          stage.status === 'blocked' ? 'text-error font-semibold' :
                          stage.status === 'current' ? 'text-text-1 font-semibold' :
                          'text-text-4',
                        )}
                      >
                        {stage.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Task list */}
          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div>
                <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                  {project.stages[currentStageIndex]?.name ?? 'Tasks'} — Tasks
                </h3>
                <p className="text-caption text-text-3 mt-0.5">{tasks.length} tasks in this stage</p>
              </div>
            </div>
            {/* Task rows */}
            <div className="divide-y divide-border-subtle">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors cursor-pointer',
                    task.status === 'blocked' && 'bg-error/5',
                  )}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-ui font-medium text-body-sm leading-snug truncate', task.status === 'blocked' ? 'text-error' : 'text-text-1')}>
                      {task.title}
                    </p>
                  </div>
                  <Avatar name={task.assignee.name} size="xs" />
                  <StatusChip status={task.status} />
                  <PriorityChip priority={task.priority} />
                  <span className="text-caption font-mono text-text-3 flex-shrink-0 w-16 text-right">
                    {formatDate(task.dueDate)}
                  </span>
                  <span className="text-caption font-mono text-coin-gold flex-shrink-0">{task.xpReward} XP</span>
                  <ClientVisibility visible={task.clientVisible} />
                  <ClickUpStatus status={task.clickUpSync} />
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id) }}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border-subtle">
              <Button size="sm" variant="ghost" iconLeft={<Plus size={14} />}>Add Task</Button>
            </div>

            {/* Stage approval bar */}
            <div className="mx-5 mb-5 mt-2 bg-surface-2 border border-border-default rounded-md px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-ui font-semibold text-body-sm text-text-1">
                  {project.stages[currentStageIndex]?.name} stage is ready for review.
                </p>
                <p className="text-caption text-text-3 mt-1">Submit for client approval when all tasks are complete.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="ghost" iconLeft={<RotateCcw size={14} />}>Request Revision</Button>
                <Button size="sm" iconLeft={<CheckCheck size={14} />}>Approve Stage</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Sidebar panel ── */}
        <div className="flex flex-col gap-4">
          {/* Team */}
          <Card>
            <h4 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3">Project Team</h4>
            <div className="space-y-2.5">
              {teamMembers.map((user) => (
                <div key={user.id} className="flex items-center gap-2.5">
                  <Avatar name={user.name} size="sm" online={user.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-ui font-semibold text-text-1 truncate">{user.name}</p>
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <h4 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3">
              Upcoming Deadlines
            </h4>
            <div className="space-y-2">
              {tasks.slice(0, 3).map((task) => {
                const d = getDaysUntil(task.dueDate)
                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', d < 0 ? 'bg-error' : d <= 2 ? 'bg-warning' : 'bg-text-4')} />
                    <p className="text-body-sm text-text-2 flex-1 truncate">{task.title}</p>
                    <span className="text-caption font-mono text-text-3">{formatDate(task.dueDate)}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Files */}
          <Card>
            <h4 className="font-display font-semibold text-h4 text-text-1 tracking-tight mb-3">Files & Deliverables</h4>
            <div className="space-y-2">
              {[
                { name: 'API_Schema_v2.pdf', type: 'pdf', by: 'Ahmad Karimi', ago: '2 days ago', visible: false },
                { name: 'DB_Structure.png', type: 'image', by: 'Usman Tariq', ago: '4 days ago', visible: false },
                { name: 'Project_Brief.pdf', type: 'pdf', by: 'Client', ago: '1 week ago', visible: true },
              ].map((file) => {
                const Icon = FILE_ICONS[file.type] ?? File
                return (
                  <div key={file.name} className="flex items-center gap-2.5 group">
                    <Icon size={14} className="text-text-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-text-1 truncate">{file.name}</p>
                      <p className="text-[10px] text-text-4 font-mono">{file.by} · {file.ago}</p>
                    </div>
                    <ClientVisibility visible={file.visible} />
                  </div>
                )
              })}
            </div>
            <Button size="sm" variant="ghost" className="mt-3 w-full">Upload file</Button>
          </Card>

          {/* ClickUp panel */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-semibold text-h4 text-text-1 tracking-tight">ClickUp Sync</h4>
              <ClickUpStatus status={project.clickUpSync} showLabel />
            </div>
            <p className="text-body-sm text-text-2">{project.clickUpFolder}</p>
            <p className="text-caption text-text-3 mt-1 font-mono">
              Last synced: {project.lastSynced ? formatDate(project.lastSynced) : '—'}
            </p>
            {project.clickUpSync === 'error' && (
              <Button size="sm" variant="secondary" iconLeft={<RefreshCw size={13} />} className="mt-3 w-full">
                Retry Sync
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Task Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
