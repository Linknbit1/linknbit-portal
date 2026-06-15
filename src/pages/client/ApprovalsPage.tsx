import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  CheckCircle2,
  RotateCcw,
  XCircle,
  Clock,
  FileText,
  Eye,
  AlertCircle,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { APPROVALS } from '../../data/mock'
import type { Approval } from '../../types'
import { formatRelativeTime, formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'

type ApprovalStatus = 'pending' | 'approved' | 'revision_requested' | 'rejected'
type FilterKey = 'pending' | 'approved' | 'revision_requested' | 'all'

const SERVICE_COLORS: Record<string, { bg: string; text: string }> = {
  development: { bg: 'rgba(14,139,154,0.1)', text: '#0E8B9A' },
  design: { bg: 'rgba(122,63,217,0.1)', text: '#7A3FD9' },
  marketing: { bg: 'rgba(251,191,36,0.15)', text: '#B47700' },
}

const PROJECT_SERVICE: Record<string, string> = {
  p1: 'development', p2: 'design', p3: 'marketing', p4: 'design', p5: 'development',
}

const EXTRA_APPROVALS: Approval[] = [
  {
    id: 'ap3',
    type: 'stage',
    projectId: 'p4',
    projectName: 'Rahim Gul Transport Website',
    stageName: 'Client Review',
    submittedBy: 'Sara Qureshi',
    submittedAt: '2026-05-09',
    status: 'approved',
    message:
      'Hi, the homepage and inner pages have been finalized. All components are pixel-perfect and ready for your approval.',
    recipientName: 'Imran Shah',
  },
  {
    id: 'ap4',
    type: 'stage',
    projectId: 'p2',
    projectName: 'Cricket Sansar Brand Identity',
    stageName: 'Wireframing',
    submittedBy: 'Sara Qureshi',
    submittedAt: '2026-05-06',
    status: 'approved',
    message: 'Wireframes for all 15 screens are complete. Please review and approve to proceed to UI Design.',
    attachments: [
      { id: 'af2', name: 'Wireframes_v2.fig', type: 'figma', uploadedBy: 'Sara Qureshi', uploadedAt: '2026-05-06', clientVisible: true },
    ],
    recipientName: 'Imran Shah',
  },
  {
    id: 'ap5',
    type: 'file',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    fileName: 'Technical_Spec_v1.pdf',
    submittedBy: 'Ahmad Karimi',
    submittedAt: '2026-04-28',
    status: 'revision_requested',
    message: 'Technical specification document is ready. Please review the architecture overview and confirm the scope is aligned.',
    recipientName: 'Imran Shah',
  },
]

const ALL_APPROVALS = [...APPROVALS, ...EXTRA_APPROVALS]

// ── Animation variants ────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2 } },
}

// ── Sub-components ────────────────────────────────────────────────────────

function FileAttachment({ file }: { file: { id: string; name: string; type: string; uploadedAt: string } }) {
  const isDesign = file.type === 'figma'
  return (
    <motion.div
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer"
      style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
      whileHover={{ background: '#F2EDE4' }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: isDesign ? 'rgba(122,63,217,0.1)' : 'rgba(238,39,55,0.07)',
          color: isDesign ? '#7A3FD9' : '#EE2737',
        }}
      >
        {isDesign ? <Layers size={13} /> : <FileText size={13} />}
      </div>
      <span className="flex-1 text-[13px] font-medium truncate" style={{ color: '#1A1612' }}>
        {file.name}
      </span>
      <span className="text-[11px] font-mono shrink-0" style={{ color: '#B7AE9D' }}>
        {formatDate(file.uploadedAt)}
      </span>
      <button
        className="flex items-center gap-1 text-[12px] font-semibold shrink-0 ml-1"
        style={{ color: '#EE2737' }}
      >
        <Eye size={12} /> View
      </button>
    </motion.div>
  )
}

function StatusBadge({ state }: { state: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    approved: {
      bg: 'rgba(31,157,85,0.1)', text: '#1F9D55', label: 'Approved',
      icon: <CheckCircle2 size={11} />,
    },
    revision_requested: {
      bg: 'rgba(180,119,0,0.1)', text: '#B47700', label: 'Revision Requested',
      icon: <RotateCcw size={11} />,
    },
    rejected: {
      bg: 'rgba(238,39,55,0.08)', text: '#EE2737', label: 'Rejected',
      icon: <XCircle size={11} />,
    },
    pending: {
      bg: 'rgba(238,39,55,0.08)', text: '#EE2737', label: 'Awaiting Review',
      icon: <Clock size={11} />,
    },
  }
  const s = map[state]
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: s.bg, color: s.text }}
    >
      {s.icon}
      {s.label}
    </span>
  )
}

function ApprovalCard({
  approval,
  state,
  onApprove,
  onRevise,
  onReject,
}: {
  approval: Approval
  state: ApprovalStatus
  onApprove: () => void
  onRevise: () => void
  onReject: () => void
}) {
  const [isRevising, setIsRevising] = useState(false)
  const [isConfirmingReject, setIsConfirmingReject] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')

  const projColor = SERVICE_COLORS[PROJECT_SERVICE[approval.projectId] ?? 'development']
  const isPending = state === 'pending'

  const handleRevisionSubmit = () => {
    onRevise()
    setIsRevising(false)
    setRevisionNote('')
  }

  const handleRejectConfirm = () => {
    onReject()
    setIsConfirmingReject(false)
  }

  return (
    <motion.div
      layout
      variants={cardVariants}
      className={cn('bg-white rounded-2xl flex flex-col overflow-hidden', isPending ? 'border-2' : 'border')}
      style={{
        borderColor: isPending ? 'rgba(238,39,55,0.25)' : '#EAE3D6',
      }}
      whileHover={{ boxShadow: '0 6px 20px rgba(26,22,18,0.07)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full shrink-0"
        style={{
          background:
            isPending
              ? '#EE2737'
              : state === 'approved'
                ? '#1F9D55'
                : state === 'revision_requested'
                  ? '#FBBF24'
                  : '#EAE3D6',
        }}
      />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Meta row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-xs"
              style={{ background: '#EAE3D6', color: '#877F71' }}
            >
              {approval.type === 'stage' ? <Layers size={9} /> : <FileText size={9} />}
              {approval.type === 'stage' ? 'Stage' : 'File'}
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-xs"
              style={{ background: projColor.bg, color: projColor.text }}
            >
              {approval.projectName}
            </span>
          </div>
          {!isPending && <StatusBadge state={state} />}
        </div>

        {/* Title + submitter */}
        <div>
          <p className="font-display font-bold text-[17px] leading-tight mb-1" style={{ color: '#1A1612' }}>
            {approval.stageName ?? approval.fileName}
          </p>
          <p className="text-[12px]" style={{ color: '#877F71' }}>
            <strong style={{ color: '#4F4940' }}>{approval.submittedBy}</strong>
            {' · '}
            <span className="font-mono">{formatRelativeTime(approval.submittedAt)}</span>
          </p>
        </div>

        {/* Message */}
        {approval.message && (
          <div
            className="rounded-xl p-3.5"
            style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
          >
            <p
              className={cn('text-[13px] leading-relaxed', !isPending && 'line-clamp-3')}
              style={{ color: '#4F4940' }}
            >
              {approval.message}
            </p>
          </div>
        )}

        {/* Attachments */}
        {approval.attachments && approval.attachments.length > 0 && (
          <div className="space-y-2">
            {approval.attachments.map((file) => (
              <FileAttachment key={file.id} file={file} />
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pending actions */}
        {isPending && !isRevising && !isConfirmingReject && (
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              onClick={onApprove}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: '#1F9D55' }}
            >
              <CheckCircle2 size={14} />
              {approval.type === 'stage' ? 'Approve Stage' : 'Approve'}
            </motion.button>
            <motion.button
              onClick={() => setIsRevising(true)}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-amber-50"
              style={{ border: '1.5px solid #EAE3D6', color: '#4F4940' }}
            >
              <RotateCcw size={13} />
              Revision
            </motion.button>
            <motion.button
              onClick={() => setIsConfirmingReject(true)}
              whileTap={{ scale: 0.97 }}
              className="px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-red-50"
              style={{ border: '1.5px solid rgba(238,39,55,0.25)', color: '#EE2737' }}
            >
              <XCircle size={14} />
            </motion.button>
          </div>
        )}

        {/* Revision form */}
        <AnimatePresence>
          {isRevising && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <label className="block text-[12px] font-semibold mb-2 mt-2" style={{ color: '#1A1612' }}>
                What needs to change?
              </label>
              <textarea
                placeholder="Describe the revisions needed…"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
                className="w-full text-[13px] rounded-xl p-3 border outline-none resize-none mb-3 focus:border-[#EE2737]/40 transition-colors"
                style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
              />
              <div className="flex gap-2">
                <motion.button
                  onClick={handleRevisionSubmit}
                  whileTap={{ scale: 0.97 }}
                  disabled={!revisionNote.trim()}
                  className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                  style={{ background: '#B47700' }}
                >
                  Submit Request
                </motion.button>
                <button
                  onClick={() => setIsRevising(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium"
                  style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reject confirmation */}
        <AnimatePresence>
          {isConfirmingReject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div
                className="rounded-xl p-3.5 mt-2"
                style={{ background: 'rgba(238,39,55,0.04)', border: '1px solid rgba(238,39,55,0.18)' }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={15} style={{ color: '#EE2737' }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold mb-0.5" style={{ color: '#1A1612' }}>
                      Confirm rejection?
                    </p>
                    <p className="text-[12px] mb-3" style={{ color: '#4F4940' }}>
                      This will notify the team and may require a new submission.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRejectConfirm}
                        className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                        style={{ background: '#EE2737' }}
                      >
                        Yes, Reject
                      </button>
                      <button
                        onClick={() => setIsConfirmingReject(false)}
                        className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium"
                        style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-pending: view link */}
        {!isPending && (
          <motion.button
            whileHover={{ x: 2 }}
            className="flex items-center gap-1 text-[12px] font-semibold self-start mt-1"
            style={{ color: '#877F71' }}
          >
            View details <ChevronRight size={12} />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function ClientApprovalsPage() {
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [states, setStates] = useState<Record<string, ApprovalStatus>>(() => {
    const s: Record<string, ApprovalStatus> = {}
    ALL_APPROVALS.forEach((a) => (s[a.id] = a.status as ApprovalStatus))
    return s
  })

  const pendingCount = ALL_APPROVALS.filter((a) => states[a.id] === 'pending').length
  const approvedCount = ALL_APPROVALS.filter((a) => states[a.id] === 'approved').length
  const revisionCount = ALL_APPROVALS.filter((a) => states[a.id] === 'revision_requested').length

  const displayed = ALL_APPROVALS.filter((a) => {
    if (filter === 'all') return true
    return states[a.id] === filter
  })

  const TABS: { key: FilterKey; label: string; count: number; color?: string }[] = [
    { key: 'pending', label: 'Awaiting Review', count: pendingCount, color: '#EE2737' },
    { key: 'approved', label: 'Approved', count: approvedCount, color: '#1F9D55' },
    { key: 'revision_requested', label: 'Revision', count: revisionCount, color: '#B47700' },
    { key: 'all', label: 'All', count: ALL_APPROVALS.length },
  ]

  const handleApprove = (id: string) =>
    setStates((s) => ({ ...s, [id]: 'approved' }))
  const handleRevise = (id: string) =>
    setStates((s) => ({ ...s, [id]: 'revision_requested' }))
  const handleReject = (id: string) =>
    setStates((s) => ({ ...s, [id]: 'rejected' }))

  return (
    <motion.div
      className="py-10 font-ui"
      style={{ color: '#1A1612' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-display font-bold text-[38px] leading-tight tracking-tight mb-1.5"
          style={{ color: '#1A1612' }}
        >
          Approvals
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          {pendingCount > 0 ? (
            <>
              <span className="font-semibold" style={{ color: '#EE2737' }}>
                {pendingCount} {pendingCount === 1 ? 'item requires' : 'items require'} your attention.
              </span>{' '}
              Your approval keeps the project moving.
            </>
          ) : (
            "You're all caught up — no pending approvals."
          )}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Awaiting Review', value: pendingCount, icon: Clock, color: '#EE2737', bg: 'rgba(238,39,55,0.08)' },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: '#1F9D55', bg: 'rgba(31,157,85,0.08)' },
          { label: 'Revision Requested', value: revisionCount, icon: RotateCcw, color: '#B47700', bg: 'rgba(251,191,36,0.1)' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border rounded-2xl p-4 flex items-center gap-3.5"
            style={{ borderColor: '#EAE3D6' }}
            whileHover={{ boxShadow: '0 4px 14px rgba(26,22,18,0.07)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.bg }}
            >
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="font-display font-bold text-[28px] leading-none" style={{ color: '#1A1612' }}>
                {s.value}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                {s.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-1 p-1 rounded-xl mb-7 w-fit" style={{ background: '#EAE3D6' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5',
              filter === t.key ? 'bg-white font-semibold' : 'hover:bg-white/50',
            )}
            style={{ color: filter === t.key ? '#1A1612' : '#4F4940' }}
          >
            {t.label}
            <span
              className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center')}
              style={
                t.key === 'pending' && t.count > 0
                  ? { background: '#EE2737', color: 'white' }
                  : { background: filter === t.key ? '#EAE3D6' : '#D6CFC5', color: '#4F4940' }
              }
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
          style={{ color: '#877F71' }}
        >
          <CheckCircle2 size={40} className="mx-auto mb-4 opacity-20" />
          <p className="font-display font-bold text-[18px] mb-1" style={{ color: '#1A1612' }}>
            {filter === 'pending' ? "You're all caught up!" : `No ${filter.replace('_', ' ')} items`}
          </p>
          <p className="text-[14px]">
            {filter === 'pending' ? 'Nothing needs your review right now.' : 'Switch tabs to see other approvals.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={filter}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={cn(
              'grid gap-5',
              filter === 'pending' ? 'grid-cols-1 max-w-2xl' : 'grid-cols-2',
            )}
          >
            {displayed.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                state={states[approval.id] ?? 'pending'}
                onApprove={() => handleApprove(approval.id)}
                onRevise={() => handleRevise(approval.id)}
                onReject={() => handleReject(approval.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
