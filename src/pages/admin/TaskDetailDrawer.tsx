import { useState } from 'react'
import { ExternalLink, Send, ChevronDown, ChevronRight, Plus, Upload } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Toggle } from '../../components/ui/Toggle'
import { Tabs } from '../../components/ui/Tabs'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { Task } from '../../types'

interface TaskDetailDrawerProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

export function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const [commentTab, setCommentTab] = useState('internal')
  const [commentText, setCommentText] = useState('')
  const [clientComment, setClientComment] = useState(false)
  const [activityExpanded, setActivityExpanded] = useState(false)

  if (!task) return null

  const commentTabs = [
    { key: 'all', label: 'All Comments' },
    { key: 'internal', label: 'Internal Only' },
    { key: 'client', label: 'Client Visible' },
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      title={
        <div>
          <h2 className={cn('font-display font-bold text-h4 text-text-1 leading-snug tracking-tight', task.status === 'blocked' && 'text-error')}>
            {task.title}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-body-sm text-text-3 hover:text-brand-red cursor-pointer transition-colors">
              {task.projectName}
            </span>
            <ChevronRight size={12} className="text-text-4" />
            <span className="text-caption text-text-3">{task.stageName}</span>
            <ServiceChip service={task.serviceType} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button className="flex items-center gap-1 text-caption text-text-3 hover:text-text-1 transition-colors">
              <ExternalLink size={11} />
              Open in ClickUp
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button size="sm" className="flex-1">Mark as Completed</Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger">Block Task</Button>
            <Button size="sm" variant="ghost">Delete</Button>
          </div>
        </div>
      }
    >
      <div className="p-5 space-y-6">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: 'Status', value: <StatusChip status={task.status} /> },
            { label: 'Priority', value: <PriorityChip priority={task.priority} /> },
            {
              label: 'Assignee',
              value: (
                <div className="flex items-center gap-1.5">
                  <Avatar name={task.assignee.name} size="xs" />
                  <span className="text-body-sm text-text-1">{task.assignee.name}</span>
                </div>
              ),
            },
            { label: 'Due Date', value: <span className="text-body-sm font-mono text-text-1">{formatDate(task.dueDate)}</span> },
            { label: 'Stage', value: <span className="text-body-sm text-text-2">{task.stageName}</span> },
            {
              label: 'XP Reward',
              value: (
                <span className="text-body-sm font-mono font-bold text-coin-gold">
                  {task.xpReward} XP
                </span>
              ),
            },
            {
              label: 'Client Visible',
              value: (
                <div className="flex items-center gap-2">
                  <Toggle checked={task.clientVisible} onChange={() => {}} size="sm" />
                  <ClientVisibility visible={task.clientVisible} showLabel size={12} />
                </div>
              ),
            },
            {
              label: 'ClickUp ID',
              value: task.clickUpId ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-body-sm text-text-2">{task.clickUpId}</span>
                  <ClickUpStatus status={task.clickUpSync} showRetry />
                </div>
              ) : (
                <span className="text-caption text-text-4">Not linked</span>
              ),
            },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <span className="text-label text-text-4 uppercase tracking-wider font-ui font-semibold">
                {row.label}
              </span>
              {row.value}
            </div>
          ))}
        </div>

        {/* Created by */}
        {task.createdBy && (
          <div className="text-caption text-text-4 font-mono">
            Created by {task.createdBy} · {task.createdAt && formatDate(task.createdAt)} · Last updated {task.updatedAt && formatRelativeTime(task.updatedAt)}
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-label text-text-3 uppercase tracking-wider font-ui font-semibold">Description</h4>
              <button className="text-caption text-text-3 hover:text-text-1 transition-colors">Edit</button>
            </div>
            <p className="text-body-sm text-text-2 leading-relaxed bg-surface-inset rounded-md p-3 border border-border-subtle">
              {task.description}
            </p>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div>
            <h4 className="text-label text-text-3 uppercase tracking-wider font-ui font-semibold mb-2">
              Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
            </h4>
            <div className="space-y-2">
              {task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2.5 group">
                  <button
                    className={cn(
                      'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                      sub.completed
                        ? 'bg-success border-success text-white'
                        : 'border-border-strong bg-surface-inset text-transparent hover:border-success',
                    )}
                  >
                    {sub.completed && <span className="text-[8px]">✓</span>}
                  </button>
                  <span className={cn('text-body-sm flex-1', sub.completed ? 'line-through text-text-3' : 'text-text-1')}>
                    {sub.title}
                  </span>
                  {sub.assigneeName && (
                    <Avatar name={sub.assigneeName} size="xs" />
                  )}
                </div>
              ))}
              <button className="flex items-center gap-1.5 text-caption text-text-3 hover:text-text-1 transition-colors mt-1">
                <Plus size={12} />
                Add subtask
              </button>
            </div>
          </div>
        )}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <div>
            <h4 className="text-label text-text-3 uppercase tracking-wider font-ui font-semibold mb-2">Files</h4>
            <div className="space-y-2">
              {task.files.map((file) => (
                <div key={file.id} className="flex items-center gap-2.5 p-2.5 bg-surface-inset rounded-md border border-border-subtle">
                  <div className="w-8 h-8 rounded-sm bg-surface-2 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-mono text-text-3 uppercase">{file.name.split('.').pop()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-text-1 truncate">{file.name}</p>
                    <p className="text-[10px] text-text-4 font-mono">{file.uploadedBy} · {formatRelativeTime(file.uploadedAt)}</p>
                  </div>
                  <ClientVisibility visible={file.clientVisible} size={13} />
                </div>
              ))}
            </div>
            <button className="mt-2 w-full border border-dashed border-border-strong rounded-md p-3 text-caption text-text-3 hover:text-text-2 hover:border-border-strong flex items-center justify-center gap-2 transition-colors">
              <Upload size={13} />
              Upload files
            </button>
          </div>
        )}

        {/* Comments */}
        {task.comments && (
          <div>
            <Tabs
              tabs={commentTabs}
              activeKey={commentTab}
              onChange={setCommentTab}
              className="mb-3"
            />
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {(commentTab === 'all'
                ? task.comments
                : commentTab === 'internal'
                ? task.comments.filter((c) => c.isInternal)
                : task.comments.filter((c) => !c.isInternal)
              ).map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar name={comment.authorName} size="xs" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-body-sm font-semibold text-text-1">{comment.authorName}</span>
                      <span className="text-[10px] font-mono text-text-4">{formatRelativeTime(comment.timestamp)}</span>
                      {comment.isInternal && (
                        <span className="text-[9px] bg-surface-3 text-text-4 px-1.5 py-px rounded-xs uppercase tracking-wide font-mono">Internal</span>
                      )}
                    </div>
                    <p className="text-body-sm text-text-2 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div className="mt-3 border border-border-default rounded-md overflow-hidden">
              {clientComment && (
                <div className="px-3 py-1.5 bg-warning/10 border-b border-warning/30">
                  <p className="text-caption text-warning font-ui">⚠ This will be visible to the client</p>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={clientComment ? 'Write a client-visible comment...' : 'Write an internal comment...'}
                rows={3}
                className="w-full bg-surface-inset border-0 outline-none text-body-sm font-ui text-text-1 placeholder:text-text-3 p-3 resize-none"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle bg-surface-1">
                <button
                  onClick={() => setClientComment((v) => !v)}
                  className={cn(
                    'text-caption font-ui flex items-center gap-1 transition-colors',
                    clientComment ? 'text-warning' : 'text-text-3 hover:text-text-2',
                  )}
                >
                  <Toggle checked={clientComment} onChange={setClientComment} size="sm" />
                  Client visible
                </button>
                <Button size="sm" iconRight={<Send size={12} />} disabled={!commentText.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* XP & Activity (collapsed) */}
        <div>
          <button
            onClick={() => setActivityExpanded((v) => !v)}
            className="flex items-center gap-2 text-body-sm text-text-3 hover:text-text-2 transition-colors w-full"
          >
            {activityExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            XP & Activity Log
            <span className="ml-auto text-caption text-text-4">Click to expand</span>
          </button>
          {activityExpanded && (
            <div className="mt-3 space-y-2 pl-4">
              <p className="text-caption text-text-4">Task activity log will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}
