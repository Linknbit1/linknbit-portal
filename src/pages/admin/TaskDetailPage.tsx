import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight, Check, AlertTriangle, Lock, Eye, EyeOff,
  RefreshCw, Send, Download, Upload, Plus, ArrowLeft, Zap,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { useToast } from '../../components/ui/toast-context'
import { TASKS, USERS } from '../../data/mock'
import type { TaskStatus, Priority } from '../../types'

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function formatRelTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(ms / 86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog:     'bg-surface-2 text-text-3 border-border-default',
  todo:        'bg-surface-2 text-text-3 border-border-default',
  in_progress: 'bg-service-dev/12 text-service-dev border-service-dev/30',
  review:      'bg-[rgba(59,130,246,0.12)] text-[#60A5FA] border-[rgba(59,130,246,0.3)]',
  approved:    'bg-success/12 text-success border-success/30',
  completed:   'bg-surface-2 text-text-2 border-border-default',
  blocked:     'bg-error/10 text-error border-error/30',
}
const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', approved: 'Approved', completed: 'Completed', blocked: 'Blocked',
}
const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-error/15 text-error border-error/40',
  high:     'bg-warning/15 text-warning border-warning/40',
  medium:   'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.4)]',
  low:      'bg-surface-2 text-text-3 border-border-default',
}
const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))
const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))
const ASSIGNEE_OPTIONS = USERS.filter((u) => u.department).map((u) => ({ value: u.id, label: u.name }))

const SERVICE_ACCENT: Record<string, { border: string; glow: string }> = {
  development: { border: 'rgba(34,211,238,0.5)', glow: 'rgba(34,211,238,0.06)' },
  design:      { border: 'rgba(167,139,250,0.5)', glow: 'rgba(167,139,250,0.06)' },
  marketing:   { border: 'rgba(251,191,36,0.5)',  glow: 'rgba(251,191,36,0.06)' },
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const task = TASKS.find((t) => t.id === id) ?? TASKS[2]

  const [status, setStatus]             = useState<TaskStatus>(task.status)
  const [priority, setPriority]         = useState<Priority>(task.priority)
  const [assigneeId, setAssigneeId]     = useState(task.assigneeId)
  const [dueDate, setDueDate]           = useState(task.dueDate)
  const [clientVisible, setClientVisible] = useState(task.clientVisible)
  const [commentText, setCommentText]   = useState('')
  const [commentIsClient, setCommentIsClient] = useState(false)
  const [subtasks, setSubtasks]         = useState(task.subtasks ?? [])
  const [newSubtask, setNewSubtask]     = useState('')

  const assignee = USERS.find((u) => u.id === assigneeId) ?? USERS.find((u) => u.id === task.assigneeId)!
  const completedSubs = subtasks.filter((s) => s.completed).length
  const allComments = task.comments ?? []
  const accent = SERVICE_ACCENT[task.serviceType]
  const isOverdue = new Date(dueDate) < new Date()

  function toggleSubtask(stId: string) {
    setSubtasks((prev) => prev.map((s) => s.id === stId ? { ...s, completed: !s.completed } : s))
  }

  function addSubtask() {
    if (!newSubtask.trim()) return
    setSubtasks((prev) => [...prev, { id: `st${Date.now()}`, title: newSubtask.trim(), completed: false, assigneeId, assigneeName: assignee.name }])
    setNewSubtask('')
  }

  function sendComment() {
    if (!commentText.trim()) return
    toast('Comment added', 'success')
    setCommentText('')
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Topbar */}
      <header className="h-16 border-b border-border-default flex items-center px-6 gap-3 sticky top-0 z-40" style={{ background: 'rgba(11,16,24,0.92)', backdropFilter: 'blur(10px)' }}>
        <button onClick={() => navigate(-1)} className="size-8 rounded-lg border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors shrink-0">
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/admin/projects" className="text-[13px] text-text-3 font-ui hover:text-text-1 transition-colors whitespace-nowrap">Projects</Link>
          <ChevronRight size={13} className="text-text-4 shrink-0" />
          <Link to={`/admin/projects/${task.projectId}`} className="text-[13px] text-text-2 font-ui hover:text-text-1 transition-colors whitespace-nowrap">{task.projectName}</Link>
          <ChevronRight size={13} className="text-text-4 shrink-0" />
          <h1 className="font-display font-bold text-[16px] text-text-1 tracking-tight truncate">{task.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.clickUpSync === 'error' && (
            <button onClick={() => toast('Retrying ClickUp sync...', 'info')} className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-error/40 bg-error/8 text-error text-[12px] font-ui font-semibold">
              <AlertTriangle size={12} /> Sync Error
            </button>
          )}
          <Button size="sm" variant="secondary" onClick={() => toast('Opened in ClickUp', 'info')}>ClickUp</Button>
          <Button size="sm" onClick={() => { setStatus('completed'); toast('Task marked complete', 'success') }}>
            <Check size={13} /> Complete
          </Button>
        </div>
      </header>

      <div className="p-6 pb-14" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: '24px', maxWidth: '1440px' }}>

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-5">

          {/* Header card */}
          <section className="bg-surface-1 border border-border-default rounded-xl p-5 relative overflow-hidden" style={{ borderLeft: `3px solid ${accent.border}` }}>
            <div className="absolute top-0 right-0 size-[280px] pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent.glow}, transparent 65%)` }} />
            <div className="relative">
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <span className={cn('inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full border font-ui font-semibold text-[11px] uppercase tracking-wide', STATUS_COLORS[status])}>
                  <span className="size-[5px] rounded-full bg-current" />{STATUS_LABELS[status]}
                </span>
                <span className={cn('inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full border font-ui font-semibold text-[11px] uppercase tracking-wide', PRIORITY_COLORS[priority])}>
                  <span className="size-[5px] rounded-full bg-current" />{PRIORITY_LABELS[priority]}
                </span>
                <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full border border-coin-gold/30 bg-coin-gold/12 text-coin-gold font-ui font-semibold text-[11px] uppercase tracking-wide">
                  <Zap size={10} />{task.xpReward} XP
                </span>
              </div>
              <h2 className="font-display font-bold text-h3/snug text-text-1 tracking-tight mb-1">{task.title}</h2>
              <p className="font-mono text-[11px] text-text-3">{task.projectName} · {task.stageName} · {task.serviceType}</p>
            </div>
          </section>

          {/* Description */}
          <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between">
              <span className="font-ui font-semibold text-[11px] text-text-3 uppercase tracking-wider">Description</span>
              <button onClick={() => toast('Edit mode', 'info')} className="text-[11px] font-ui text-text-3 hover:text-text-1 transition-colors">Edit</button>
            </div>
            <div className="px-5 py-4">
              {task.description ? (
                <p className="text-body-sm/relaxed font-ui text-text-2">{task.description}</p>
              ) : (
                <button onClick={() => toast('Click to add description', 'info')} className="text-[13px] font-ui text-text-4 italic hover:text-text-3 transition-colors">
                  Add a description...
                </button>
              )}
            </div>
          </section>

          {/* Subtasks */}
          <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-2">
              <span className="font-ui font-semibold text-[11px] text-text-3 uppercase tracking-wider">Subtasks</span>
              <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full">{completedSubs}/{subtasks.length}</span>
              {subtasks.length > 0 && (
                <div className="ml-auto w-20 h-1 bg-surface-inset rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(completedSubs / subtasks.length) * 100}%` }} />
                </div>
              )}
            </div>
            <div className="px-4 py-3 space-y-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => toggleSubtask(st.id)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <span className={cn('size-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors',
                    st.completed ? 'bg-success border-success text-[#062013]' : 'border-border-strong bg-surface-inset',
                  )}>
                    <Check size={11} strokeWidth={3.5} className={cn(!st.completed && 'opacity-0')} />
                  </span>
                  <span className={cn('flex-1 font-ui text-[13px]', st.completed ? 'text-text-3 line-through' : 'text-text-1')}>
                    {st.title}
                  </span>
                  {st.assigneeId && (
                    <span className="size-5 rounded-full bg-surface-2 border border-border-default font-mono text-[8px] font-bold text-text-2 flex items-center justify-center shrink-0">
                      {getInitials(st.assigneeName ?? '')}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2.5 p-2 mt-1 bg-surface-inset border border-dashed border-border-default rounded-lg">
                <Plus size={13} className="text-text-3 shrink-0" />
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="Add subtask..."
                  className="flex-1 bg-transparent outline-none text-text-1 font-ui text-[13px] placeholder:text-text-4"
                />
                {newSubtask.trim() && (
                  <button onClick={addSubtask} className="font-ui text-[11.5px] font-semibold text-brand-red hover:text-brand-red-hover transition-colors">
                    Add
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Files */}
          {(task.files ?? []).length > 0 && (
            <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-2">
                <span className="font-ui font-semibold text-[11px] text-text-3 uppercase tracking-wider">Files</span>
                <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full">{task.files?.length ?? 0}</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {(task.files ?? []).map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-inset border border-border-subtle rounded-lg">
                    <div className="size-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center shrink-0">
                      <span className="font-mono text-[9px] font-bold text-text-3 uppercase">{file.name.split('.').pop()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-[13px] text-text-1 truncate">{file.name}</p>
                      <p className="font-mono text-[10.5px] text-text-3">
                        {file.uploadedBy}
                        {!file.clientVisible && <span className="ml-2 text-text-4"><Lock size={9} className="inline mb-0.5" /> Internal</span>}
                      </p>
                    </div>
                    <button onClick={() => toast(`Downloading ${file.name}`, 'info')} className="size-7 rounded-lg bg-surface-2 border border-border-default text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors">
                      <Download size={13} />
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => toast('Upload dialog would open', 'info')}
                  className="p-3 border border-dashed border-border-default rounded-lg text-center cursor-pointer hover:border-border-strong hover:bg-surface-2 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 font-ui text-[12px] text-text-3">
                    <Upload size={13} /> Drop file or click to upload
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Comments */}
          <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-2">
              <span className="font-ui font-semibold text-[11px] text-text-3 uppercase tracking-wider">Comments</span>
              <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full">{allComments.length}</span>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-4 mb-4">
                {allComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar name={comment.authorName} size="xs" className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-ui font-semibold text-[12.5px] text-text-1">{comment.authorName}</span>
                        <span className="font-mono text-[10px] text-text-4">{formatRelTime(comment.timestamp)}</span>
                        {comment.isInternal && (
                          <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-warning bg-warning/10 border border-warning/25 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            <Lock size={9} /> Internal
                          </span>
                        )}
                      </div>
                      <p className="font-ui text-body-sm/relaxed text-text-2">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {allComments.length === 0 && (
                  <p className="text-center font-ui text-[13px] text-text-4 py-4">No comments yet.</p>
                )}
              </div>

              {/* Composer */}
              <div className={cn('border rounded-xl overflow-hidden transition-colors', commentIsClient ? 'border-success/40' : 'border-border-default')}>
                {commentIsClient && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-success/8 border-b border-success/25 text-[11.5px] text-success font-semibold">
                    <Eye size={12} /> Visible to client
                  </div>
                )}
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={commentIsClient ? 'Write a client-facing comment...' : 'Write an internal comment...'}
                  rows={3}
                  className="w-full px-4 py-3 bg-transparent outline-none resize-none text-text-1 font-ui text-[13px] placeholder:text-text-4"
                />
                <div className="flex items-center gap-3 px-3 py-2 border-t border-border-subtle">
                  <button
                    onClick={() => setCommentIsClient((v) => !v)}
                    className="flex items-center gap-2 font-ui text-[11.5px] cursor-pointer"
                  >
                    <span className={cn(!commentIsClient ? 'text-warning font-semibold' : 'text-text-4')}>Internal</span>
                    <span className={cn('relative inline-block w-9 h-5 rounded-full border transition-colors', commentIsClient ? 'bg-success/15 border-success/40' : 'bg-surface-3 border-border-default')}>
                      <span className={cn('absolute top-[3px] size-3.5 rounded-full transition-all', commentIsClient ? 'left-[18px] bg-success' : 'left-[3px] bg-text-3')} />
                    </span>
                    <span className={cn(commentIsClient ? 'text-success font-semibold' : 'text-text-4')}>Client</span>
                  </button>
                  <Button size="sm" className="ml-auto" disabled={!commentText.trim()} onClick={sendComment} iconRight={<Send size={11} />}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col gap-4 sticky" style={{ top: '88px' }}>

          {/* Details card */}
          <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border-subtle">
              <span className="font-display font-semibold text-[13px] text-text-1">Task Details</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Status</span>
                <Select value={status} onChange={(v) => setStatus(v as TaskStatus)} options={STATUS_OPTIONS} />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Priority</span>
                <Select value={priority} onChange={(v) => setPriority(v as Priority)} options={PRIORITY_OPTIONS} />
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Assignee</span>
                <Select value={assigneeId} onChange={setAssigneeId} options={ASSIGNEE_OPTIONS} />
              </div>

              {/* Due date */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Due Date</span>
                <div className={cn('h-9 px-3 flex items-center gap-2 rounded-lg border transition-colors', isOverdue ? 'bg-error/5 border-error/30' : 'bg-surface-inset border-border-default')}>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex-1 bg-transparent outline-none font-mono text-[12.5px] text-text-1 scheme-dark"
                  />
                  {isOverdue && <AlertTriangle size={13} className="text-error shrink-0" />}
                </div>
              </div>

              {/* Stage */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Stage</span>
                <div className="h-9 px-3 flex items-center rounded-lg bg-surface-inset border border-border-default">
                  <span className="font-mono text-[12px] text-text-2">{task.stageName}</span>
                </div>
              </div>

              {/* Client visibility */}
              <div className="flex items-center justify-between py-2.5 px-3 bg-surface-inset border border-border-subtle rounded-lg">
                <div className="flex items-center gap-2">
                  {clientVisible ? <Eye size={13} className="text-success" /> : <EyeOff size={13} className="text-text-4" />}
                  <span className="font-ui text-[12.5px] text-text-1">{clientVisible ? 'Visible to client' : 'Internal only'}</span>
                </div>
                <button
                  onClick={() => setClientVisible((v) => !v)}
                  className={cn('relative w-9 h-5 rounded-full border transition-colors', clientVisible ? 'bg-success/15 border-success/40' : 'bg-surface-3 border-border-default')}
                >
                  <span className={cn('absolute top-[3px] size-3.5 rounded-full transition-all', clientVisible ? 'left-[18px] bg-success' : 'left-[3px] bg-text-3')} />
                </button>
              </div>

              {/* ClickUp */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">ClickUp</span>
                {task.clickUpSync === 'error' ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-error/5 border border-error/25 rounded-lg">
                    <span className="size-7 rounded-lg bg-error/15 text-error font-display font-bold text-[10px] flex items-center justify-center shrink-0">CU</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px] text-text-1">{task.clickUpId}</p>
                      <p className="font-mono text-[10px] text-error mt-0.5">Sync failed</p>
                    </div>
                    <button onClick={() => toast('Retrying sync...', 'info')} className="text-error hover:text-error/70 transition-colors">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-surface-inset border border-border-subtle rounded-lg">
                    <span className="size-7 rounded-lg bg-surface-2 text-text-2 font-display font-bold text-[10px] flex items-center justify-center shrink-0">CU</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px] text-text-1">{task.clickUpId ?? 'Not linked'}</p>
                      {task.clickUpSync === 'synced' && <p className="font-mono text-[10px] text-success mt-0.5 flex items-center gap-1"><Check size={9} /> Synced</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Meta */}
              {(task.createdBy || task.createdAt) && (
                <div className="pt-3 border-t border-dashed border-border-subtle font-mono text-[10.5px] text-text-3">
                  {task.createdBy && <p>Created by <strong className="text-text-2">{task.createdBy}</strong></p>}
                  {task.createdAt && <p>{formatDate(task.createdAt)}</p>}
                </div>
              )}
            </div>
          </section>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setStatus('completed'); toast('Task marked complete', 'success') }}
              className="flex-1 h-10 rounded-xl bg-success text-[#062013] font-ui font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-[#2ED574] transition-colors"
            >
              <Check size={14} /> Mark Complete
            </button>
            <button
              onClick={() => toast('Task archived', 'warning')}
              className="h-10 px-4 rounded-xl bg-transparent text-error border border-error/40 font-ui font-semibold text-[12.5px] flex items-center gap-1.5 hover:bg-error/8 transition-colors"
            >
              <EyeOff size={13} /> Archive
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
