import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  Send,
  Paperclip,
  AtSign,
  Download,
  Upload,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  X,
  Plus,
  Calendar,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Select } from '../../components/ui/Select'
import { TASKS, USERS } from '../../data/mock'
import type { TaskStatus, Priority } from '../../types'

/* ---- helpers ---- */
function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function formatRelTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(ms / 86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`
  return `${d} day${d > 1 ? 's' : ''} ago`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const AVATAR_GRADIENTS: Record<string, string> = {
  u1: 'linear-gradient(135deg,#F94454,#EE2737)',
  u2: 'linear-gradient(135deg,#A78BFA,#8B5CF6)',
  u3: 'linear-gradient(135deg,#67E8F9,#06B6D4)',
  u4: 'linear-gradient(135deg,#FCD34D,#F59E0B)',
  u5: 'linear-gradient(135deg,#67E8F9,#06B6D4)',
  u6: 'linear-gradient(135deg,#FCD34D,#F59E0B)',
  u7: 'linear-gradient(135deg,#B5C0CF,#7A8597)',
  u8: 'linear-gradient(135deg,#B5C0CF,#7A8597)',
}
const AVATAR_TEXT_DARK = new Set(['u3', 'u4', 'u5', 'u6'])

function AvatarEl({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  const bg = AVATAR_GRADIENTS[id] ?? 'linear-gradient(135deg,#B5C0CF,#7A8597)'
  const dark = AVATAR_TEXT_DARK.has(id)
  return (
    <span
      className="rounded-full inline-flex items-center justify-center font-ui font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        color: dark ? '#0B1018' : '#fff',
        fontSize: size * 0.38,
      }}
    >
      {getInitials(name)}
    </span>
  )
}

/* ---- Chip base classes (shared spec: 10.5px, pill, 3px/9px padding) ---- */
const CHIP_BASE = 'inline-flex items-center gap-[6px] py-[3px] px-[9px] rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border'

const STATUS_CLASSES: Record<TaskStatus, string> = {
  backlog:     'bg-surface-2 text-text-3 border-border-default',
  todo:        'bg-surface-2 text-text-3 border-border-default',
  in_progress: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
  review:      'bg-[rgba(59,130,246,0.12)] text-[#60A5FA] border-[rgba(59,130,246,0.3)]',
  approved:    'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
  completed:   'bg-[rgba(122,133,151,0.15)] text-text-2 border-border-default',
  blocked:     'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',
}
const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', approved: 'Approved', completed: 'Completed', blocked: 'Blocked',
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: 'bg-[rgba(244,54,76,0.18)] text-[#F4364C] border-[rgba(244,54,76,0.4)]',
  high:     'bg-[rgba(245,158,11,0.18)] text-[#F59E0B] border-[rgba(245,158,11,0.4)]',
  medium:   'bg-[rgba(59,130,246,0.18)] text-[#60A5FA] border-[rgba(59,130,246,0.4)]',
  low:      'bg-surface-2 text-text-3 border-border-default',
}
const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => ({
  value: s, label: STATUS_LABELS[s],
}))
const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({
  value: p, label: PRIORITY_LABELS[p],
}))
const ASSIGNEE_OPTIONS = USERS.filter((u) => u.department).map((u) => ({
  value: u.id, label: u.name,
}))

/* =========================================================
   MAIN COMPONENT
   ========================================================= */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const task = TASKS.find((t) => t.id === id) ?? TASKS[2] // default to t3

  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId)
  const [dueDate, setDueDate] = useState(task.dueDate)
  const [clientVisible, setClientVisible] = useState(task.clientVisible)
  const [commentTab, setCommentTab] = useState<'all' | 'internal' | 'client'>('internal')
  const [commentText, setCommentText] = useState('')
  const [commentIsClient, setCommentIsClient] = useState(false)
  const [subtasks, setSubtasks] = useState(task.subtasks ?? [])
  const [newSubtask, setNewSubtask] = useState('')
  const [activityOpen, setActivityOpen] = useState(false)

  const assignee = USERS.find((u) => u.id === assigneeId) ?? USERS.find((u) => u.id === task.assigneeId)!
  const completedSubtasks = subtasks.filter((s) => s.completed).length
  const allComments = task.comments ?? []
  const filteredComments = commentTab === 'all' ? allComments
    : commentTab === 'internal' ? allComments.filter((c) => c.isInternal)
    : allComments.filter((c) => !c.isInternal)

  function toggleSubtask(stId: string) {
    setSubtasks((prev) => prev.map((s) => s.id === stId ? { ...s, completed: !s.completed } : s))
  }

  function addSubtask() {
    if (!newSubtask.trim()) return
    setSubtasks((prev) => [...prev, {
      id: `st${Date.now()}`, title: newSubtask.trim(),
      completed: false, assigneeId: assigneeId, assigneeName: assignee.name,
    }])
    setNewSubtask('')
  }

  const SERVICE_TILE: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    development: { bg: 'linear-gradient(135deg,#67E8F9,#06B6D4)', text: '#04212a', glow: 'rgba(34,211,238,0.2)', border: 'rgba(34,211,238,0.5)' },
    design:      { bg: 'linear-gradient(135deg,#C4B5FD,#8B5CF6)', text: '#1a0a3f', glow: 'rgba(167,139,250,0.2)', border: 'rgba(167,139,250,0.5)' },
    marketing:   { bg: 'linear-gradient(135deg,#FDE68A,#F59E0B)', text: '#1a0e00', glow: 'rgba(251,191,36,0.2)', border: 'rgba(251,191,36,0.5)' },
  }
  const tile = SERVICE_TILE[task.serviceType]

  const isOverdue = new Date(dueDate) < new Date('2026-05-13')
  const isToday = dueDate === '2026-05-12'

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Topbar */}
      <header
        className="h-16 border-b border-border-default flex items-center px-8 gap-4 sticky top-0 z-40"
        style={{ background: 'rgba(11,16,24,0.92)', backdropFilter: 'blur(10px)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/admin/projects" className="text-[13px] text-text-3 font-ui font-medium hover:text-text-1 transition-colors whitespace-nowrap">
            Projects
          </Link>
          <ChevronRight size={13} className="text-text-4 flex-shrink-0" />
          <Link to={`/admin/projects/${task.projectId}`} className="text-[13px] text-text-2 font-ui font-medium hover:text-text-1 transition-colors whitespace-nowrap">
            {task.projectName}
          </Link>
          <ChevronRight size={13} className="text-text-4 flex-shrink-0" />
          <h1 className="font-display font-bold text-[17px] text-text-1 tracking-tight truncate">{task.title}</h1>
          <span className="font-mono text-[11px] text-text-4 bg-surface-2 px-1.5 py-0.5 rounded-[5px] tracking-wide flex-shrink-0">
            {task.clickUpId ?? 'NO-ID'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.clickUpSync === 'error' && (
            <button className="h-[34px] flex items-center gap-2 px-3 rounded-full border border-[rgba(244,54,76,0.4)] bg-[rgba(244,54,76,0.08)] text-[#F4364C] text-[12px] font-ui font-semibold">
              <span className="w-4 h-4 rounded-full bg-[#F4364C] text-white flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={9} />
              </span>
              <span className="font-display font-bold text-[10px] text-[#F4364C] bg-[rgba(244,54,76,0.18)] px-1.5 py-0.5 rounded">CU</span>
              <span className="text-[11.5px] font-semibold">Sync error</span>
            </button>
          )}
          <button className="h-[34px] px-3 border border-border-default bg-surface-1 text-text-1 rounded-sm font-ui font-semibold text-[12.5px] flex items-center gap-2 hover:bg-surface-2 transition-colors">
            <ExternalLink size={13} />
            ClickUp
          </button>
          <button
            className="h-[34px] px-4 rounded-sm bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[#22C55E] font-ui font-semibold text-[12.5px] flex items-center gap-2 hover:bg-[rgba(34,197,94,0.18)] transition-colors"
            onClick={() => setStatus('completed')}
          >
            <Check size={13} />
            Mark complete
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-sm bg-surface-1 border border-border-default text-text-2 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Two-column content */}
      <div
        className="px-8 py-6 pb-14"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: '24px', alignItems: 'start', maxWidth: '1440px' }}
      >
        {/* =================== LEFT COLUMN =================== */}
        <div className="flex flex-col gap-5">

          {/* Task Header */}
          <section
            className="bg-surface-1 border border-border-default rounded-md p-6 relative overflow-hidden"
            style={{ borderLeft: `3px solid ${tile.border}` }}
          >
            {/* Radial glow */}
            <div className="absolute top-[-80px] right-[-60px] w-[320px] h-[320px] pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${tile.glow} 0%, transparent 65%)` }} />

            <div className="relative flex items-start gap-4">
              {/* Service tile */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-[22px] flex-shrink-0"
                style={{ background: tile.bg, color: tile.text, boxShadow: `0 4px 16px ${tile.glow}` }}
              >
                {task.projectName.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-[24px] text-text-1 tracking-tight leading-snug mb-2">
                  {task.title}
                </h2>
                <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-text-3 font-ui">
                  <Link to={`/admin/projects/${task.projectId}`} className="text-text-2 font-medium hover:text-text-1 transition-colors">
                    {task.projectName}
                  </Link>
                  <span className="text-text-4">·</span>
                  <span>{task.stageName}</span>
                  <span className="text-text-4">·</span>
                  <span className="font-mono text-[11px] text-text-4 tracking-wide">
                    {task.serviceType.charAt(0).toUpperCase() + task.serviceType.slice(1)}
                  </span>
                </div>
              </div>

              {/* Status / priority chips */}
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                <div className="flex gap-2">
                  <span className={cn(
                    CHIP_BASE,
                    STATUS_CLASSES[status],
                  )}>
                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                    {STATUS_LABELS[status]}
                  </span>
                  <span className={cn(
                    CHIP_BASE,
                    PRIORITY_CLASSES[priority],
                  )}>
                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                    {PRIORITY_LABELS[priority]}
                  </span>
                </div>
                {task.createdAt && (
                  <span className="font-mono text-[10.5px] text-text-4 tracking-wide">
                    Created {formatDate(task.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </section>


          {/* Description */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <span className="font-ui font-semibold text-[10px] text-text-3 uppercase tracking-widest">Description</span>
              <span className="font-mono text-[10px] text-text-4 ml-auto tracking-wide">Markdown</span>
            </div>
            <div className="px-5 py-4 relative group">
              <div
                className="p-4 rounded-lg bg-surface-inset border border-border-subtle text-[13px] font-ui text-text-2 leading-relaxed relative"
              >
                <button className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-[6px] bg-surface-2 border border-border-default text-text-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-surface-3 hover:text-text-1">
                  <Pencil size={12} />
                </button>
                {task.description ? (
                  <p>{task.description}</p>
                ) : (
                  <p className="text-text-4 italic">No description yet. Click the edit button to add one.</p>
                )}
              </div>
            </div>
          </section>


          {/* Subtasks */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <span className="font-ui font-semibold text-[10px] text-text-3 uppercase tracking-widest">Subtasks</span>
              <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full tracking-wide">
                {completedSubtasks} / {subtasks.length}
              </span>
              <span className="font-mono text-[10px] text-text-4 ml-auto tracking-wide">
                {subtasks.length > 0 ? `${Math.round((completedSubtasks / subtasks.length) * 100)}% done` : ''}
              </span>
            </div>
            <div className="px-3 py-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2.5 rounded-lg group hover:bg-surface-2 transition-colors cursor-pointer border-t border-transparent',
                    'first:border-t-0',
                  )}
                  onClick={() => toggleSubtask(st.id)}
                >
                  {/* Checkbox */}
                  <span
                    className={cn(
                      'w-[18px] h-[18px] rounded-[5px] border-[1.5px] inline-flex items-center justify-center flex-shrink-0 transition-colors',
                      st.completed
                        ? 'bg-[#22C55E] border-[#22C55E] text-[#062013]'
                        : 'border-border-strong bg-surface-inset text-transparent',
                    )}
                  >
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                  <span
                    className={cn(
                      'flex-1 font-ui font-medium text-[13px] transition-colors',
                      st.completed ? 'text-text-3 line-through decoration-text-4' : 'text-text-1',
                    )}
                  >
                    {st.title}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {st.assigneeId && (
                      <AvatarEl id={st.assigneeId} name={st.assigneeName ?? 'Unknown'} size={20} />
                    )}
                    <span
                      className={cn(
                        'font-mono text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border',
                        st.completed
                          ? 'text-[#22C55E] bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.3)]'
                          : 'text-text-3 bg-surface-2 border-border-default',
                      )}
                    >
                      {st.completed ? 'Done' : 'To do'}
                    </span>
                  </div>
                </div>
              ))}
              {/* Add subtask input */}
              <div className="flex items-center gap-3 px-2 py-2 mt-1 bg-surface-inset border border-dashed border-border-default rounded-lg">
                <Plus size={14} className="text-text-3 flex-shrink-0" />
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="Add a subtask…"
                  className="flex-1 bg-transparent border-0 outline-none text-text-1 font-ui font-medium text-[13px] placeholder:text-text-4"
                />
              </div>
            </div>
          </section>


          {/* Files */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <span className="font-ui font-semibold text-[10px] text-text-3 uppercase tracking-widest">Files</span>
              <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full tracking-wide">
                {task.files?.length ?? 0} attached
              </span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              {(task.files ?? []).map((file) => {
                const isImg = file.type === 'image'
                const isTxt = file.type === 'text'
                return (
                  <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-1 border border-border-subtle rounded-lg">
                    {/* Thumb */}
                    <span
                      className={cn(
                        'w-11 h-11 rounded-[6px] border flex items-center justify-center font-mono text-[9px] font-bold flex-shrink-0',
                        isImg
                          ? 'text-[#60A5FA] border-[rgba(59,130,246,0.3)]'
                          : isTxt
                            ? 'text-text-2 bg-[rgba(122,133,151,0.08)] border-border-subtle'
                            : 'text-text-3 bg-surface-2 border-border-default',
                      )}
                      style={isImg ? {
                        background: 'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(59,130,246,0.05)),repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0 6px,transparent 6px 12px)',
                      } : undefined}
                    >
                      {file.type === 'image' ? 'PNG' : file.type === 'text' ? 'TXT' : 'FILE'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-ui font-semibold text-[13px] text-text-1 truncate">{file.name}</div>
                      <div className="flex items-center gap-2 font-mono text-[10.5px] text-text-3 tracking-wide mt-0.5">
                        <span>{file.uploadedBy} · {file.uploadedAt}</span>
                        {!file.clientVisible && (
                          <>
                            <span className="text-text-4">·</span>
                            <span className="flex items-center gap-1 text-text-3">
                              <Lock size={9} />Internal
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="w-7 h-7 rounded-[6px] bg-surface-2 border border-border-default text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors flex-shrink-0">
                      <Download size={13} />
                    </button>
                  </div>
                )
              })}
              {/* Drop zone */}
              <div className="mt-1 p-3.5 border border-dashed border-border-default rounded-lg bg-surface-inset text-center cursor-pointer hover:border-border-strong hover:bg-surface-2 transition-colors">
                <span className="inline-flex items-center gap-2 font-ui font-medium text-[12px] text-text-3">
                  <Upload size={14} />
                  <span><strong className="text-text-1 font-semibold">Drop file or click to upload</strong> — PNG, PDF, TXT up to 25 MB</span>
                </span>
              </div>
            </div>
          </section>


          {/* Comments */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <span className="font-ui font-semibold text-[10px] text-text-3 uppercase tracking-widest">Comments</span>
              <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-2 py-0.5 rounded-full tracking-wide">
                {allComments.length}
              </span>
              {/* Tabs */}
              <div className="ml-auto inline-flex bg-surface-1 border border-border-default rounded-[7px] p-[3px] gap-[2px]">
                {(['all', 'internal', 'client'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCommentTab(tab)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] font-ui font-semibold text-[11.5px] transition-colors',
                      commentTab === tab ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
                    )}
                  >
                    {tab === 'internal' && <Lock size={11} />}
                    {tab === 'client' && <Eye size={11} />}
                    <span className="capitalize">{tab}</span>
                    <span className={cn(
                      'font-mono text-[9.5px] px-1 rounded-full',
                      commentTab === tab ? 'bg-bg-base text-text-2' : 'bg-surface-2 text-text-4',
                    )}>
                      {tab === 'all' ? allComments.length : tab === 'internal' ? allComments.filter((c) => c.isInternal).length : allComments.filter((c) => !c.isInternal).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 py-4">
              {/* Comment list */}
              <div className="flex flex-col">
                {filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={cn(
                      'relative pl-3.5 py-3 border-b border-border-subtle last:border-b-0',
                      comment.isInternal && 'bg-[linear-gradient(90deg,rgba(245,158,11,0.04),transparent_30%)]',
                    )}
                  >
                    {comment.isInternal && (
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[rgba(245,158,11,0.45)]" />
                    )}
                    <div className="flex gap-3">
                      <AvatarEl id={comment.authorId} name={comment.authorName} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-ui font-semibold text-[13px] text-text-1">{comment.authorName}</span>
                          <span className="font-mono text-[10px] text-text-4 tracking-wide">{formatRelTime(comment.timestamp)}</span>
                          <span className={cn(
                            'inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border',
                            comment.isInternal
                              ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]'
                              : 'text-[#22C55E] bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.3)]',
                          )}>
                            {comment.isInternal ? <Lock size={9} /> : <Eye size={9} />}
                            {comment.isInternal ? 'Internal' : 'Client'}
                          </span>
                        </div>
                        <p className="font-ui text-[13px] text-text-2 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredComments.length === 0 && (
                  <p className="text-center font-ui text-[13px] text-text-4 py-6">No {commentTab} comments yet.</p>
                )}
              </div>

              {/* Composer */}
              <div
                className={cn(
                  'mt-3 bg-surface-1 border rounded-lg overflow-hidden transition-colors',
                  commentIsClient ? 'border-[rgba(34,197,94,0.4)]' : 'border-border-default',
                )}
                style={commentIsClient ? { background: 'linear-gradient(180deg,rgba(34,197,94,0.04),transparent)' } : undefined}
              >
                {commentIsClient && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(34,197,94,0.08)] border-b border-[rgba(34,197,94,0.25)] text-[11.5px] text-[#22C55E] font-semibold">
                    <Eye size={12} />
                    This comment will be visible to <strong className="ml-1">{task.projectName}</strong>.
                  </div>
                )}
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={commentIsClient ? 'Write a client-facing comment…' : 'Write an internal comment…'}
                  rows={3}
                  className="w-full px-3.5 py-3 bg-transparent border-0 outline-none resize-none text-text-1 font-ui text-[13px] leading-relaxed placeholder:text-text-4"
                />
                <div className="flex items-center gap-2.5 px-3 py-2 border-t border-border-subtle">
                  <div className="flex gap-1 text-text-3">
                    <button className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center hover:bg-surface-2 hover:text-text-1 transition-colors">
                      <Paperclip size={13} />
                    </button>
                    <button className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center hover:bg-surface-2 hover:text-text-1 transition-colors">
                      <AtSign size={13} />
                    </button>
                  </div>
                  <button
                    onClick={() => setCommentIsClient((v) => !v)}
                    className="inline-flex items-center gap-2 font-ui font-medium text-[11px] cursor-pointer"
                  >
                    <span className={cn('font-semibold', commentIsClient ? 'text-text-4' : 'text-[#F59E0B]')}>Internal</span>
                    {/* Toggle */}
                    <span
                      className={cn(
                        'relative inline-block w-9 h-5 rounded-full border transition-colors',
                        commentIsClient ? 'bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.4)]' : 'bg-surface-3 border-border-default',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all',
                          commentIsClient ? 'left-[18px] bg-[#22C55E]' : 'left-[3px] bg-text-3',
                        )}
                      />
                    </span>
                    <span className={cn('font-semibold', commentIsClient ? 'text-[#22C55E]' : 'text-text-4')}>Client</span>
                  </button>
                  <button
                    className="ml-auto h-[30px] px-3.5 rounded-[6px] bg-brand-red text-white font-ui font-semibold text-[12px] flex items-center gap-1.5 hover:bg-brand-red-hover transition-colors"
                    onClick={() => setCommentText('')}
                  >
                    Send <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          </section>


          {/* XP & Activity log (collapsible) */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-2 transition-colors"
              onClick={() => setActivityOpen((v) => !v)}
            >
              <ChevronRight
                size={13}
                className={cn('text-text-3 transition-transform', activityOpen && 'rotate-90')}
              />
              <span className="font-ui font-semibold text-[10px] text-text-3 uppercase tracking-widest">XP &amp; Activity log</span>
              <div className="ml-auto flex items-center gap-4 font-mono text-[10.5px] text-text-3 tracking-wide">
                <span className="text-[#FBBF24] font-semibold">★ 30 XP earned · 120 pending</span>
                <span>3 events</span>
              </div>
            </button>
            {activityOpen && (
              <div className="px-5 pb-4 flex flex-col gap-2">
                {[
                  { who: 'Ahmad Karimi', uid: 'u2', action: 'updated status to', detail: 'Blocked', when: '2 hrs ago' },
                  { who: 'Usman Tariq', uid: 'u5', action: 'added comment', detail: '"Priority fix for UAT"', when: '5 hrs ago' },
                  { who: 'Ahmad Karimi', uid: 'u2', action: 'completed subtask', detail: 'Reproduce the bug with test data', when: '1 day ago' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <AvatarEl id={item.uid} name={item.who} size={22} />
                    <div className="font-ui text-[12.5px] text-text-2 flex-1">
                      <span className="font-semibold text-text-1">{item.who}</span>
                      {' '}{item.action}{' '}
                      <span className="font-medium text-text-1">{item.detail}</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-4 tracking-wide flex-shrink-0">{item.when}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>


        {/* =================== RIGHT SIDEBAR =================== */}
        <aside className="flex flex-col gap-5 sticky" style={{ top: '88px' }}>

          {/* Task Details Card */}
          <section className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <span className="font-ui font-semibold text-[13px] text-text-1 font-display tracking-tight">Task details</span>
              <span className="font-mono text-[10px] text-text-3 bg-surface-2 px-2 py-0.5 rounded-full tracking-wide uppercase ml-1">Editable</span>
            </div>

            <div className="px-5 py-5 flex flex-col gap-4">
              {/* 2-col grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Status</span>
                  <div className="inline-flex items-center gap-2 h-8 px-2.5 rounded-[6px] bg-surface-2 border border-border-default cursor-pointer hover:bg-surface-3 hover:border-border-strong transition-colors">
                    <span className={cn(
                      CHIP_BASE,
                      STATUS_CLASSES[status],
                    )}>
                      <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                      {STATUS_LABELS[status]}
                    </span>
                    <ChevronDown size={11} className="text-text-3 ml-auto" />
                  </div>
                  {/* Overlay select — invisible but functional */}
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="sr-only"
                    aria-label="Task status"
                  >
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Priority</span>
                  <div className="inline-flex items-center gap-2 h-8 px-2.5 rounded-[6px] bg-surface-2 border border-border-default cursor-pointer hover:bg-surface-3 hover:border-border-strong transition-colors">
                    <span className={cn(
                      CHIP_BASE,
                      PRIORITY_CLASSES[priority],
                    )}>
                      <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                      {PRIORITY_LABELS[priority]}
                    </span>
                    <ChevronDown size={11} className="text-text-3 ml-auto" />
                  </div>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="sr-only"
                    aria-label="Task priority"
                  >
                    {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Assignee */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Assignee</span>
                  <Select
                    value={assigneeId}
                    onChange={setAssigneeId}
                    options={ASSIGNEE_OPTIONS}
                    placeholder="Assign to…"
                    className="w-full"
                  />
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Due date</span>
                  <div className={cn(
                    'h-8 px-2.5 flex items-center gap-2 rounded-[6px] bg-surface-2 border border-border-default hover:border-border-focus transition-colors',
                    isOverdue && 'bg-[rgba(244,54,76,0.06)] border-[rgba(244,54,76,0.3)]',
                  )}>
                    <Calendar size={13} className={cn('flex-shrink-0', isOverdue ? 'text-[#F4364C]' : 'text-text-3')} />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none font-mono text-[12px] text-text-1 [color-scheme:dark]"
                    />
                    {isOverdue && (
                      <span className="font-mono text-[9.5px] text-[#F4364C] bg-[rgba(244,54,76,0.12)] border border-[rgba(244,54,76,0.3)] px-1.5 py-0.5 rounded tracking-wide uppercase">
                        {isToday ? 'Today' : 'Overdue'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Stage</span>
                  <div className="h-8 px-2.5 flex items-center gap-2 rounded-[6px] bg-surface-2 border border-border-default">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: '#F4364C',
                        boxShadow: '0 0 0 3px rgba(244,54,76,0.18)',
                      }}
                    />
                    <span className="font-mono text-[11.5px] text-text-2 tracking-wide">
                      {task.stageName}
                    </span>
                  </div>
                </div>

                {/* XP Reward */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">XP reward</span>
                  <div className="h-8 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-[#FBBF24] bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] px-2.5 py-1 rounded-full">
                      <Star size={12} />
                      {task.xpReward} XP
                    </span>
                    <span className="font-mono text-[10px] text-text-4 tracking-wide">+30 stage bonus</span>
                  </div>
                </div>
              </div>

              {/* Client Visibility */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">Client visibility</span>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-inset border border-border-subtle rounded-lg">
                  <span className="w-7 h-7 rounded-[7px] bg-surface-2 text-text-2 flex items-center justify-center flex-shrink-0">
                    {clientVisible ? <Eye size={13} /> : <Lock size={13} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-ui font-semibold text-[12.5px] text-text-1 leading-snug">
                      {clientVisible ? 'Visible to client' : 'Hidden from client'}
                    </div>
                    <div className="font-mono text-[10px] text-text-3 tracking-wide mt-0.5">
                      {clientVisible
                        ? `${task.projectName} can see this task`
                        : `Internal · ${task.projectName} will not see this`}
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => setClientVisible((v) => !v)}
                    className={cn(
                      'relative w-9 h-5 rounded-full border transition-colors flex-shrink-0',
                      clientVisible
                        ? 'bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.4)]'
                        : 'bg-surface-3 border-border-default',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all',
                        clientVisible ? 'left-[18px] bg-[#22C55E]' : 'left-[3px] bg-text-3',
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* ClickUp Link */}
              <div className="flex flex-col gap-1.5">
                <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">ClickUp link</span>
                {task.clickUpSync === 'error' ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-[rgba(244,54,76,0.06)] border border-[rgba(244,54,76,0.3)] rounded-lg">
                    <span className="w-7 h-7 rounded-[6px] bg-[rgba(244,54,76,0.18)] text-[#F4364C] font-display font-bold text-[11px] flex items-center justify-center flex-shrink-0 tracking-wide">
                      CU
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] font-semibold text-text-1 tracking-wide">{task.clickUpId}</div>
                      <div className="font-mono text-[10px] text-[#F4364C] tracking-wide mt-0.5">Sync failed · 504 timeout · 3 hrs ago</div>
                    </div>
                    <button className="flex items-center gap-1.5 font-ui font-semibold text-[11px] text-[#F4364C] bg-[rgba(244,54,76,0.1)] hover:bg-[rgba(244,54,76,0.2)] px-2 py-1 rounded-[5px] transition-colors flex-shrink-0">
                      <RefreshCw size={11} />Retry
                    </button>
                  </div>
                ) : task.clickUpSync === 'pending' ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.3)] rounded-lg">
                    <span className="w-7 h-7 rounded-[6px] bg-[rgba(245,158,11,0.15)] text-[#F59E0B] font-display font-bold text-[11px] flex items-center justify-center flex-shrink-0">CU</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] font-semibold text-text-1 tracking-wide">{task.clickUpId}</div>
                      <div className="font-mono text-[10px] text-[#F59E0B] tracking-wide mt-0.5">Syncing…</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-inset border border-border-subtle rounded-lg">
                    <span className="w-7 h-7 rounded-[6px] bg-surface-2 text-text-2 font-display font-bold text-[11px] flex items-center justify-center flex-shrink-0">CU</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] font-semibold text-text-1 tracking-wide">{task.clickUpId}</div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#22C55E] tracking-wide mt-0.5">
                        <Check size={9} />Synced
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta footer */}
              {(task.createdBy || task.createdAt || task.updatedAt) && (
                <div className="pt-3 border-t border-dashed border-border-subtle flex flex-col gap-1 font-mono text-[10.5px] text-text-3 tracking-wide">
                  {task.createdBy && task.createdAt && (
                    <span>Created by <strong className="text-text-2 font-semibold">{task.createdBy}</strong> · {formatDate(task.createdAt)}</span>
                  )}
                  {task.updatedAt && (
                    <span>Last updated <strong className="text-text-2 font-semibold">{formatRelTime(task.updatedAt)}</strong></span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Footer action */}
          <div className="flex items-center gap-2">
            <button
              className="flex-1 h-10 rounded-[7px] bg-[#22C55E] text-[#062013] font-ui font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-[#2ED574] transition-colors shadow-[0_4px_14px_rgba(34,197,94,0.2)]"
              onClick={() => setStatus('completed')}
            >
              <Check size={14} />
              Mark as complete
            </button>
            <button className="h-10 px-4 rounded-[7px] bg-transparent text-[#F4364C] border border-[rgba(244,54,76,0.4)] font-ui font-semibold text-[12.5px] flex items-center gap-2 hover:bg-[rgba(244,54,76,0.08)] transition-colors">
              <EyeOff size={13} />
              Archive
            </button>
          </div>

        </aside>
      </div>
    </div>
  )
}
