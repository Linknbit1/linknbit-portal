import { useState } from 'react'
import {
  CheckCircle2,
  RotateCcw,
  XCircle,
  Clock,
  FileText,
  Eye,
  AlertCircle,
  Layers,
  Filter,
} from 'lucide-react'
import { APPROVALS } from '../../data/mock'
import type { Approval } from '../../types'
import { formatRelativeTime, formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'

type ApprovalStatus = 'pending' | 'approved' | 'revision_requested' | 'rejected'
type FilterKey = 'all' | 'pending' | 'approved' | 'revision_requested'

const SERVICE_COLORS: Record<string, { bg: string; text: string }> = {
  development: { bg: 'rgba(14,139,154,0.1)', text: '#0E8B9A' },
  design: { bg: 'rgba(122,63,217,0.1)', text: '#7A3FD9' },
  marketing: { bg: 'rgba(251,191,36,0.15)', text: '#B47700' },
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

function FileTypeIcon({ type }: { type: string }) {
  const s: Record<string, { bg: string; color: string; label: string }> = {
    figma: { bg: 'rgba(122,63,217,0.1)', color: '#7A3FD9', label: 'FIG' },
    pdf: { bg: 'rgba(238,39,55,0.08)', color: '#EE2737', label: 'PDF' },
  }
  const style = s[type] ?? { bg: '#F2EDE4', color: '#877F71', label: 'FILE' }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </div>
  )
}

export default function ClientApprovalsPage() {
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [states, setStates] = useState<Record<string, ApprovalStatus>>(() => {
    const s: Record<string, ApprovalStatus> = {}
    ALL_APPROVALS.forEach((a) => (s[a.id] = a.status as ApprovalStatus))
    return s
  })
  const [activeRevision, setActiveRevision] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({})
  const [confirmReject, setConfirmReject] = useState<string | null>(null)

  const pendingCount = ALL_APPROVALS.filter((a) => states[a.id] === 'pending').length
  const approvedCount = ALL_APPROVALS.filter((a) => states[a.id] === 'approved').length
  const revisionCount = ALL_APPROVALS.filter((a) => states[a.id] === 'revision_requested').length

  const displayed = ALL_APPROVALS.filter((a) => {
    if (filter === 'all') return true
    return states[a.id] === filter
  })

  const TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'pending', label: 'Awaiting Review', count: pendingCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'revision_requested', label: 'Revision Requested', count: revisionCount },
    { key: 'all', label: 'All', count: ALL_APPROVALS.length },
  ]

  const handleApprove = (id: string) => {
    setStates((s) => ({ ...s, [id]: 'approved' }))
    if (activeRevision === id) setActiveRevision(null)
    if (confirmReject === id) setConfirmReject(null)
  }

  const handleRevisionSubmit = (id: string) => {
    setStates((s) => ({ ...s, [id]: 'revision_requested' }))
    setActiveRevision(null)
  }

  const handleReject = (id: string) => {
    setStates((s) => ({ ...s, [id]: 'rejected' }))
    setConfirmReject(null)
  }

  const getProjectColor = (projectId: string) => {
    const map: Record<string, string> = {
      p1: 'development',
      p2: 'design',
      p3: 'marketing',
      p4: 'design',
      p5: 'development',
    }
    return SERVICE_COLORS[map[projectId] ?? 'development']
  }

  return (
    <div className="py-10 font-ui" style={{ color: '#1A1612' }}>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: 'Awaiting Review',
            value: pendingCount,
            icon: Clock,
            color: '#EE2737',
            bg: 'rgba(238,39,55,0.08)',
          },
          {
            label: 'Approved',
            value: approvedCount,
            icon: CheckCircle2,
            color: '#1F9D55',
            bg: 'rgba(31,157,85,0.08)',
          },
          {
            label: 'Revision Requested',
            value: revisionCount,
            icon: RotateCcw,
            color: '#B47700',
            bg: 'rgba(251,191,36,0.1)',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-client-surface border border-client-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg }}
            >
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p
                className="font-display font-bold text-[26px] leading-none"
                style={{ color: '#1A1612' }}
              >
                {s.value}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg mb-6 w-fit" style={{ background: '#EAE3D6' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5',
              filter === t.key ? 'bg-client-surface shadow-sm font-semibold' : 'hover:bg-white/60',
            )}
            style={{ color: filter === t.key ? '#1A1612' : '#4F4940' }}
          >
            {t.label}
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                t.key === 'pending' && t.count > 0 ? 'bg-red-500 text-white' : '',
              )}
              style={
                t.key !== 'pending' || t.count === 0
                  ? { background: filter === t.key ? '#EAE3D6' : '#D6CFC5', color: '#4F4940' }
                  : {}
              }
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Approval cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#877F71' }}>
          <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-display font-bold text-[17px]" style={{ color: '#1A1612' }}>
            {filter === 'pending'
              ? "You're all caught up!"
              : filter === 'approved'
                ? 'No approved items yet'
                : filter === 'revision_requested'
                  ? 'No revision requests'
                  : 'No approvals found'}
          </p>
          <p className="text-[14px] mt-1">
            {filter === 'pending' ? 'No items currently awaiting your review.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {displayed.map((approval) => {
            const state = states[approval.id] ?? 'pending'
            const isRevising = activeRevision === approval.id
            const isConfirmingReject = confirmReject === approval.id
            const projColor = getProjectColor(approval.projectId)

            return (
              <div
                key={approval.id}
                className={cn(
                  'bg-client-surface rounded-xl border p-5 shadow-sm',
                  state === 'pending' ? 'border-client-border' : 'border-client-border',
                )}
                style={
                  state === 'pending'
                    ? { borderLeft: '4px solid #EE2737' }
                    : state === 'approved'
                      ? { borderLeft: '4px solid #1F9D55' }
                      : state === 'revision_requested'
                        ? { borderLeft: '4px solid #FBBF24' }
                        : { borderLeft: '4px solid #EAE3D6' }
                }
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <span
                        className="text-[11px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-xs"
                        style={{ background: '#EAE3D6', color: '#877F71' }}
                      >
                        {approval.type === 'stage' ? (
                          <span className="flex items-center gap-1">
                            <Layers size={9} />
                            Stage Approval
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FileText size={9} />
                            File Approval
                          </span>
                        )}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-xs"
                        style={{ background: projColor.bg, color: projColor.text }}
                      >
                        {approval.projectName}
                      </span>
                    </div>
                    <p className="font-display font-bold text-[16px]" style={{ color: '#1A1612' }}>
                      {approval.stageName ?? approval.fileName}
                    </p>
                    <p className="text-[13px] mt-0.5" style={{ color: '#877F71' }}>
                      Submitted by{' '}
                      <strong style={{ color: '#4F4940' }}>{approval.submittedBy}</strong> ·{' '}
                      {formatRelativeTime(approval.submittedAt)}
                    </p>
                  </div>

                  {/* Status badge */}
                  {state !== 'pending' && (
                    <span
                      className="text-[12px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
                      style={{
                        background:
                          state === 'approved'
                            ? 'rgba(31,157,85,0.1)'
                            : state === 'revision_requested'
                              ? 'rgba(251,191,36,0.1)'
                              : '#F2EDE4',
                        color:
                          state === 'approved'
                            ? '#1F9D55'
                            : state === 'revision_requested'
                              ? '#B47700'
                              : '#877F71',
                      }}
                    >
                      {state === 'approved'
                        ? '✓ Approved'
                        : state === 'revision_requested'
                          ? '↩ Revision Requested'
                          : '✕ Rejected'}
                    </span>
                  )}
                </div>

                {/* Message */}
                {approval.message && (
                  <div
                    className="rounded-lg p-3.5 mb-4"
                    style={{ background: '#F2EDE4', border: '1px solid #EAE3D6' }}
                  >
                    <p className="text-[14px] leading-relaxed" style={{ color: '#4F4940' }}>
                      {approval.message}
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {approval.attachments && approval.attachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {approval.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2.5 p-3 rounded-lg"
                        style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
                      >
                        <FileTypeIcon type={file.type} />
                        <span className="flex-1 text-[13px] font-medium" style={{ color: '#1A1612' }}>
                          {file.name}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: '#B7AE9D' }}>
                          {formatDate(file.uploadedAt)}
                        </span>
                        <button
                          className="flex items-center gap-1 text-[12px] font-semibold"
                          style={{ color: '#EE2737' }}
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Revision note (when already submitted) */}
                {state === 'revision_requested' && revisionNotes[approval.id] && (
                  <div
                    className="rounded-lg p-3 mb-4"
                    style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
                  >
                    <p className="text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: '#B47700' }}>
                      Your revision note
                    </p>
                    <p className="text-[13px]" style={{ color: '#4F4940' }}>
                      {revisionNotes[approval.id]}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {state === 'pending' && !isRevising && !isConfirmingReject && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: '#1F9D55' }}
                    >
                      <CheckCircle2 size={16} />
                      {approval.type === 'stage' ? 'Approve Stage' : 'Approve File'}
                    </button>
                    <button
                      onClick={() => setActiveRevision(approval.id)}
                      className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
                      style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                    >
                      <RotateCcw size={15} />
                      Request Revision
                    </button>
                    <button
                      onClick={() => setConfirmReject(approval.id)}
                      className="px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-1.5"
                      style={{ border: '1px solid rgba(238,39,55,0.3)', color: '#EE2737' }}
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Revision input */}
                {isRevising && (
                  <div>
                    <label className="block text-[13px] font-semibold mb-2" style={{ color: '#1A1612' }}>
                      Describe the revisions needed
                    </label>
                    <textarea
                      placeholder="e.g. Please adjust the colour palette to match our brand guidelines, and revise the hero section layout…"
                      value={revisionNotes[approval.id] ?? ''}
                      onChange={(e) =>
                        setRevisionNotes((n) => ({ ...n, [approval.id]: e.target.value }))
                      }
                      rows={3}
                      className="w-full text-[14px] rounded-lg p-3 border outline-none resize-none mb-3 focus:border-[#EE2737]/40"
                      style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
                    />
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleRevisionSubmit(approval.id)}
                        disabled={!revisionNotes[approval.id]?.trim()}
                        className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                        style={{ background: '#B47700' }}
                      >
                        Submit Revision Request
                      </button>
                      <button
                        onClick={() => setActiveRevision(null)}
                        className="px-4 py-2.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80"
                        style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject confirmation */}
                {isConfirmingReject && (
                  <div
                    className="rounded-lg p-4"
                    style={{
                      background: 'rgba(238,39,55,0.04)',
                      border: '1px solid rgba(238,39,55,0.2)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} style={{ color: '#EE2737' }} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold mb-1" style={{ color: '#1A1612' }}>
                          Confirm Rejection
                        </p>
                        <p className="text-[13px] mb-3" style={{ color: '#4F4940' }}>
                          Rejecting this will notify the team and may require a new submission.
                          Are you sure?
                        </p>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                            style={{ background: '#EE2737' }}
                          >
                            Yes, Reject
                          </button>
                          <button
                            onClick={() => setConfirmReject(null)}
                            className="px-4 py-2 rounded-lg text-[13px] font-medium"
                            style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
