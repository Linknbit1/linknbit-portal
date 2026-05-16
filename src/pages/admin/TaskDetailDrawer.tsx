import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Send, Plus, Upload, ArrowUpRight, Eye, EyeOff, Check } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Toggle } from '../../components/ui/Toggle'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { Task } from '../../types'

interface TaskDetailDrawerProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

export function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [commentText, setCommentText] = useState('')
  const [clientVisible, setClientVisible] = useState(task?.clientVisible ?? false)
  const [subtasks, setSubtasks] = useState(task?.subtasks ?? [])

  if (!task) return null

  const handleSendComment = () => {
    if (!commentText.trim()) return
    toast('Comment added', 'success')
    setCommentText('')
  }

  const handleComplete = () => {
    toast(`"${task.title}" marked as complete`, 'success')
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={480}
      title={
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <ServiceChip service={task.serviceType} />
            <span className="font-mono text-[10px] text-text-4">{task.projectName}</span>
          </div>
          <h2 className={cn('font-display font-bold text-[17px] text-text-1 leading-snug', task.status === 'blocked' && 'text-error')}>
            {task.title}
          </h2>
          <button
            onClick={() => { onClose(); navigate(`/admin/tasks/${task.id}`) }}
            className="mt-1.5 flex items-center gap-1 text-[11.5px] text-brand-red/80 hover:text-brand-red font-semibold transition-colors"
          >
            <ArrowUpRight size={11} />
            Open full page
          </button>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1" onClick={handleComplete}>
            <Check size={13} /> Mark Complete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast('Opening in ClickUp...', 'info')}>
            <ExternalLink size={13} /> ClickUp
          </Button>
          <Button size="sm" variant="danger" onClick={() => toast('Task blocked', 'warning')}>
            Block
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-5">
        {/* Core metadata — compact 2-col grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Status', value: <StatusChip status={task.status} /> },
            { label: 'Priority', value: <PriorityChip priority={task.priority} /> },
            {
              label: 'Assignee',
              value: (
                <div className="flex items-center gap-1.5">
                  <Avatar name={task.assignee.name} size="xs" />
                  <span className="text-[12.5px] font-ui text-text-1">{task.assignee.name}</span>
                </div>
              ),
            },
            {
              label: 'Due',
              value: <span className="font-mono text-[12px] text-text-1">{formatDate(task.dueDate)}</span>,
            },
            {
              label: 'XP Reward',
              value: <span className="font-mono font-bold text-[12px] text-coin-gold">{task.xpReward} XP</span>,
            },
            {
              label: 'ClickUp',
              value: task.clickUpId
                ? <ClickUpStatus status={task.clickUpSync} showRetry />
                : <span className="text-[11px] text-text-4">Not linked</span>,
            },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-wider">{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>

        {/* Client visibility toggle */}
        <div className="flex items-center justify-between py-2.5 px-3.5 bg-surface-2 rounded-lg border border-border-default">
          <div className="flex items-center gap-2">
            {clientVisible ? <Eye size={13} className="text-success" /> : <EyeOff size={13} className="text-text-4" />}
            <span className="font-ui text-[12.5px] text-text-1">{clientVisible ? 'Visible to client' : 'Hidden from client'}</span>
          </div>
          <Toggle checked={clientVisible} onChange={setClientVisible} size="sm" />
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <p className="font-ui font-semibold text-[10px] text-text-4 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-[13px] font-ui text-text-2 leading-relaxed bg-surface-inset rounded-lg p-3 border border-border-subtle">
              {task.description}
            </p>
          </div>
        )}

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div>
            <p className="font-ui font-semibold text-[10px] text-text-4 uppercase tracking-wider mb-2">
              Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
            </p>
            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSubtasks((prev) => prev.map((s) => s.id === sub.id ? { ...s, completed: !s.completed } : s))}
                  className="flex items-center gap-2.5 w-full group"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                      sub.completed ? 'bg-success border-success' : 'border-border-strong bg-surface-inset hover:border-success',
                    )}
                  >
                    {sub.completed && <Check size={9} className="text-[#062013]" strokeWidth={3} />}
                  </span>
                  <span className={cn('text-[12.5px] font-ui text-left flex-1', sub.completed ? 'line-through text-text-3' : 'text-text-1')}>
                    {sub.title}
                  </span>
                  {sub.assigneeName && <Avatar name={sub.assigneeName} size="xs" />}
                </button>
              ))}
              <button
                className="flex items-center gap-1.5 text-[11.5px] font-ui text-text-3 hover:text-text-1 transition-colors mt-1"
                onClick={() => toast('Add subtask clicked', 'info')}
              >
                <Plus size={12} /> Add subtask
              </button>
            </div>
          </div>
        )}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <div>
            <p className="font-ui font-semibold text-[10px] text-text-4 uppercase tracking-wider mb-2">
              Files ({task.files.length})
            </p>
            <div className="space-y-1.5">
              {task.files.map((file) => (
                <div key={file.id} className="flex items-center gap-2.5 p-2.5 bg-surface-inset rounded-lg border border-border-subtle">
                  <div className="w-8 h-8 rounded bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-mono text-text-3 uppercase">{file.name.split('.').pop()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-ui text-text-1 truncate">{file.name}</p>
                    <p className="text-[10px] text-text-4 font-mono">{file.uploadedBy} · {formatRelativeTime(file.uploadedAt)}</p>
                  </div>
                  <ClientVisibility visible={file.clientVisible} size={12} />
                </div>
              ))}
            </div>
            <button
              onClick={() => toast('Upload dialog would open here', 'info')}
              className="mt-2 w-full border border-dashed border-border-strong rounded-lg p-2.5 text-[11.5px] font-ui text-text-3 hover:text-text-2 hover:border-border-strong flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={12} /> Upload file
            </button>
          </div>
        )}

        {/* Comments */}
        {task.comments && task.comments.length > 0 && (
          <div>
            <p className="font-ui font-semibold text-[10px] text-text-4 uppercase tracking-wider mb-2">
              Comments ({task.comments.length})
            </p>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {task.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar name={comment.authorName} size="xs" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold text-text-1">{comment.authorName}</span>
                      <span className="text-[10px] font-mono text-text-4">{formatRelativeTime(comment.timestamp)}</span>
                      {comment.isInternal && (
                        <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-px rounded-xs uppercase tracking-wide font-mono border border-warning/25">Internal</span>
                      )}
                    </div>
                    <p className="text-[12.5px] font-ui text-text-2 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment input */}
        <div className="border border-border-default rounded-lg overflow-hidden">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write an internal comment..."
            rows={2}
            className="w-full bg-surface-inset border-0 outline-none text-[13px] font-ui text-text-1 placeholder:text-text-3 p-3 resize-none"
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle bg-surface-1">
            <span className="text-[11px] font-mono text-text-4">Internal by default</span>
            <Button size="sm" iconRight={<Send size={11} />} disabled={!commentText.trim()} onClick={handleSendComment}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
