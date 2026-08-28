import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Clock,
  AlertCircle,
  FileText,
  TrendingUp,
  FolderOpen,
  Layers,
} from 'lucide-react'
import { PROJECTS, APPROVALS } from '../../data/mock'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

const CLIENT_PROJECTS = PROJECTS.filter(
  (p) => p.clientId === 'c1' || p.serviceType === 'design',
).slice(0, 2)

const DELIVERED_FILES = [
  { name: 'CS_UI_Designs_v3.fig', project: 'Cricket Sansar Brand Identity', by: 'Sara Qureshi', date: '2026-05-10', type: 'figma' },
  { name: 'Project_Brief.pdf', project: 'Cricket Sansar App', by: 'Ahmad Karimi', date: '2026-05-08', type: 'pdf' },
  { name: 'Wireframes_v2.fig', project: 'Cricket Sansar Brand Identity', by: 'Sara Qureshi', date: '2026-05-01', type: 'figma' },
  { name: 'API_Documentation_v2.pdf', project: 'Cricket Sansar App', by: 'Ahmad Karimi', date: '2026-05-11', type: 'pdf' },
]

const RECENT_UPDATES = [
  { text: 'Sara Qureshi uploaded "CS_UI_Designs_v3.fig"', project: 'Cricket Sansar Brand Identity', time: '2026-05-10', type: 'file' },
  { text: 'Ahmad Karimi moved Cricket Sansar App to Internal QA stage', project: 'Cricket Sansar App', time: '2026-05-08', type: 'stage' },
  { text: 'You approved Wireframing stage', project: 'Cricket Sansar Brand Identity', time: '2026-05-06', type: 'approved', isYou: true },
  { text: 'Project moved to Development stage', project: 'Cricket Sansar App', time: '2026-05-01', type: 'stage' },
]

const SERVICE_LABEL: Record<string, string> = {
  development: 'App Development',
  design: 'UI/UX Design',
  marketing: 'Marketing',
}

const STAGE_DESCRIPTIONS: Record<string, { desc: string; next: string }> = {
  'Internal QA': {
    desc: 'Our team is running quality checks before handing the app over to you for testing.',
    next: 'Client Testing starts after QA approval.',
  },
  'Client Review': {
    desc: "We've completed the UI designs and need your feedback before finalizing.",
    next: 'Approve designs to proceed to handover.',
  },
}

// ── Animation variants ──────────────────────────────────────────────────────

const pageVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  accent: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border cursor-default select-none"
      style={{ borderColor: '#EAE3D6' }}
      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(26,22,18,0.07)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <span
        className="size-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: accent + '18' }}
      >
        <Icon size={15} style={{ color: accent }} />
      </span>
      <div>
        <p className="font-display font-bold text-[20px] leading-none" style={{ color: '#1A1612' }}>
          {value}
        </p>
        <p className="text-[11px] font-mono mt-0.5 uppercase tracking-wide" style={{ color: '#877F71' }}>
          {label}
        </p>
      </div>
    </motion.div>
  )
}

function ServiceBadge({ service }: { service: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    design: { bg: 'rgba(122,63,217,0.1)', color: '#7A3FD9' },
    development: { bg: 'rgba(14,139,154,0.1)', color: '#0E8B9A' },
    marketing: { bg: 'rgba(245,158,11,0.1)', color: '#B45309' },
  }
  const s = map[service] ?? map.development
  return (
    <span
      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {SERVICE_LABEL[service] ?? service}
    </span>
  )
}

function AnimatedProgressBar({
  value,
  color,
}: {
  value: number
  color: string
}) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#EAE3D6' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  )
}

function ProjectCard({ project }: { project: (typeof CLIENT_PROJECTS)[0] }) {
  const isActionNeeded = project.status === 'awaiting_client'
  const stageInfo = STAGE_DESCRIPTIONS[project.currentStage]
  const progressColor = isActionNeeded ? '#E01414' : '#1F9D55'

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'rounded-2xl border p-6 bg-white flex flex-col gap-4 cursor-default',
        isActionNeeded ? 'border-2' : 'border',
      )}
      style={{
        borderColor: isActionNeeded ? 'rgba(224,20,20,0.3)' : '#EAE3D6',
      }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(26,22,18,0.08)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <ServiceBadge service={project.serviceType} />
          <h3
            className="font-display font-bold text-h4/tight"
            style={{ color: '#1A1612' }}
          >
            {project.name}
          </h3>
        </div>
        {isActionNeeded && (
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.25, ease: 'backOut' }}
            className="shrink-0 flex items-center gap-1 text-[11px] bg-red-50 text-red-600 border border-red-200 font-bold px-2.5 py-1 rounded-full"
          >
            <AlertCircle size={10} />
            Action Needed
          </motion.span>
        )}
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium" style={{ color: '#4F4940' }}>
            {project.currentStage}
          </span>
          <span className="text-[13px] font-mono font-bold" style={{ color: '#1A1612' }}>
            {project.progress}%
          </span>
        </div>
        <AnimatedProgressBar value={project.progress} color={progressColor} />
      </div>

      {/* Stage description */}
      {stageInfo && (
        <motion.div
          variants={fadeIn}
          className="rounded-xl p-3.5"
          style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
        >
          <p className="text-body-sm/relaxed mb-1.5" style={{ color: '#4F4940' }}>
            {stageInfo.desc}
          </p>
          <p
            className="text-[12px] font-semibold flex items-center gap-1"
            style={{ color: '#1F9D55' }}
          >
            <ChevronRight size={12} />
            {stageInfo.next}
          </p>
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
          >
            {project.pm.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <span className="text-[13px]" style={{ color: '#877F71' }}>
            {project.pm.name}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[12px] font-mono flex items-center gap-1"
            style={{ color: '#B7AE9D' }}
          >
            <Clock size={11} />
            {formatDate(project.deadline)}
          </span>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
            style={{
              background: isActionNeeded ? '#E01414' : 'transparent',
              color: isActionNeeded ? 'white' : '#E01414',
              border: '1.5px solid #E01414',
            }}
          >
            {isActionNeeded ? 'Review Now' : 'View Project'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function ApprovalCard({ approval }: { approval: (typeof APPROVALS)[0] }) {
  const [approved, setApproved] = useState(false)
  const [revised, setRevised] = useState(false)

  if (approved || revised) {
    return (
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3 border"
          style={{
            background: approved ? 'rgba(31,157,85,0.06)' : 'rgba(245,158,11,0.06)',
            borderColor: approved ? 'rgba(31,157,85,0.2)' : 'rgba(245,158,11,0.2)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: approved ? '#1F9D55' : '#B45309' }} />
          <span className="text-[13px] font-medium" style={{ color: '#4F4940' }}>
            {approved ? 'Stage approved successfully.' : 'Revision requested, team has been notified.'}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      variants={fadeUp}
      className="bg-white border border-client-border rounded-2xl overflow-hidden"
      style={{ borderColor: '#EAE3D6' }}
      whileHover={{ boxShadow: '0 6px 20px rgba(26,22,18,0.07)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Card header stripe */}
      <div
        className="h-1 w-full"
        style={{ background: approval.type === 'stage' ? '#E01414' : '#7A3FD9' }}
      />

      <div className="p-5">
        {/* Meta row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-xs"
                style={{ background: '#EAE3D6', color: '#877F71' }}
              >
                {approval.type === 'stage' ? 'Stage Approval' : 'File Approval'}
              </span>
              <span className="text-[12px] font-medium" style={{ color: '#877F71' }}>
                {approval.projectName}
              </span>
            </div>
            <p className="text-[13px]" style={{ color: '#4F4940' }}>
              Submitted by{' '}
              <strong style={{ color: '#1A1612' }}>{approval.submittedBy}</strong>
              {' · '}
              <span className="font-mono text-[12px]" style={{ color: '#B7AE9D' }}>
                {formatRelativeTime(approval.submittedAt)}
              </span>
            </p>
          </div>
        </div>

        {/* Message block */}
        {approval.message && (
          <div
            className="rounded-xl p-3.5 mb-4"
            style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
          >
            <p className="text-body/relaxed" style={{ color: '#4F4940' }}>
              {approval.message}
            </p>
          </div>
        )}

        {/* Attachments */}
        {approval.attachments?.map((file) => (
          <motion.div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-xl mb-3 cursor-pointer"
            style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
            whileHover={{ background: '#F2EDE4' }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="size-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
              style={{ background: '#EAE3D6', color: '#877F71' }}
            >
              {file.name.split('.').pop()?.toUpperCase()}
            </div>
            <span className="flex-1 text-[13px] font-medium" style={{ color: '#1A1612' }}>
              {file.name}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="text-[12px] font-semibold flex items-center gap-1"
              style={{ color: '#E01414' }}
            >
              View <ChevronRight size={12} />
            </motion.button>
          </motion.div>
        ))}

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4">
          <motion.button
            onClick={() => setApproved(true)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ opacity: 0.93 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: '#1F9D55' }}
          >
            <CheckCircle2 size={15} />
            {approval.type === 'stage' ? 'Approve Stage' : 'Approve'}
          </motion.button>
          <motion.button
            onClick={() => setRevised(true)}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors hover:bg-amber-50"
            style={{ border: '1.5px solid #EAE3D6', color: '#4F4940' }}
          >
            Request Revision
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const pendingApprovals = APPROVALS.filter((a) => a.status === 'pending')
  const avgProgress = Math.round(
    CLIENT_PROJECTS.reduce((s, p) => s + p.progress, 0) / CLIENT_PROJECTS.length,
  )

  return (
    <motion.div
      className="py-10 font-ui"
      style={{ color: '#1A1612' }}
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Welcome hero ── */}
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1
              className="font-display font-bold text-[38px] leading-tight tracking-tight mb-2"
              style={{ color: '#1A1612' }}
            >
              Good morning, Imran.
            </h1>
            {pendingApprovals.length > 0 && (
              <p className="text-[15px]" style={{ color: '#4F4940' }}>
                You have{' '}
                <strong style={{ color: '#1A1612' }}>
                  {pendingApprovals.length} item{pendingApprovals.length > 1 ? 's' : ''}
                </strong>{' '}
                waiting for your approval.{' '}
                <a
                  href="#approvals"
                  className="font-semibold hover:underline underline-offset-2"
                  style={{ color: '#E01414' }}
                >
                  Review now →
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Stat pills */}
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="show"
          className="mt-6 flex flex-wrap gap-3"
        >
          <StatPill
            icon={Layers}
            value={CLIENT_PROJECTS.length}
            label="Active Projects"
            accent="#0E8B9A"
          />
          <StatPill
            icon={AlertCircle}
            value={pendingApprovals.length}
            label="Pending Approvals"
            accent="#E01414"
          />
          <StatPill
            icon={FileText}
            value={DELIVERED_FILES.length}
            label="Delivered Files"
            accent="#7A3FD9"
          />
          <StatPill
            icon={TrendingUp}
            value={`${avgProgress}%`}
            label="Avg Progress"
            accent="#1F9D55"
          />
        </motion.div>
      </motion.div>

      {/* ── Active Projects ── */}
      <motion.section variants={fadeUp} className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="font-display font-bold text-[20px] tracking-tight"
            style={{ color: '#1A1612' }}
          >
            Active Projects
          </h2>
          <motion.a
            href="/client/projects"
            className="text-[13px] font-semibold flex items-center gap-1 hover:underline underline-offset-2"
            style={{ color: '#E01414' }}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
          >
            View all <ChevronRight size={13} />
          </motion.a>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {CLIENT_PROJECTS.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </motion.section>

      {/* ── Pending Approvals ── */}
      <motion.section id="approvals" variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2.5 mb-5">
          <h2
            className="font-display font-bold text-[20px] tracking-tight"
            style={{ color: '#1A1612' }}
          >
            Waiting for You
          </h2>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3, ease: 'backOut' }}
            className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: '#E01414' }}
          >
            {pendingApprovals.length}
          </motion.span>
        </div>
        <AnimatePresence mode="popLayout">
          <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-4">
            {pendingApprovals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      {/* ── Bottom grid ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-6">
        {/* Recent Updates */}
        <section>
          <h2
            className="font-display font-bold text-[20px] tracking-tight mb-5"
            style={{ color: '#1A1612' }}
          >
            Recent Updates
          </h2>
          <div className="space-y-0">
            {RECENT_UPDATES.map((update, i) => {
              const dotColor =
                update.type === 'approved'
                  ? '#1F9D55'
                  : update.type === 'file'
                    ? '#7A3FD9'
                    : '#C4BAA8'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
                  className="flex gap-3.5 py-3.5 border-b"
                  style={{ borderColor: '#EAE3D6' }}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="size-2.5 rounded-full mt-1 shrink-0"
                      style={{ background: dotColor }}
                    />
                    {i < RECENT_UPDATES.length - 1 && (
                      <div
                        className="w-px flex-1 mt-1.5 min-h-6"
                        style={{ background: '#EAE3D6' }}
                      />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-body-sm/snug" style={{ color: '#4F4940' }}>
                      {update.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-medium" style={{ color: '#877F71' }}>
                        {update.project}
                      </span>
                      <span style={{ color: '#C4BAA8' }}>·</span>
                      <span className="text-[11px] font-mono" style={{ color: '#B7AE9D' }}>
                        {formatRelativeTime(update.time)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Delivered Files */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2
              className="font-display font-bold text-[20px] tracking-tight"
              style={{ color: '#1A1612' }}
            >
              Delivered Files
            </h2>
            <motion.a
              href="/client/files"
              className="text-[13px] font-semibold flex items-center gap-1 hover:underline underline-offset-2"
              style={{ color: '#E01414' }}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              All files <ChevronRight size={13} />
            </motion.a>
          </div>
          <div className="space-y-2.5">
            {DELIVERED_FILES.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white cursor-pointer"
                style={{ border: '1px solid #EAE3D6' }}
                whileHover={{
                  y: -2,
                  boxShadow: '0 6px 18px rgba(26,22,18,0.07)',
                  transition: { duration: 0.2, ease: 'easeOut' },
                }}
              >
                <div
                  className="size-9 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                  style={{
                    background:
                      file.type === 'figma' ? 'rgba(122,63,217,0.1)' : 'rgba(14,139,154,0.08)',
                    color: file.type === 'figma' ? '#7A3FD9' : '#0E8B9A',
                  }}
                >
                  {file.type === 'figma' ? (
                    <FolderOpen size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: '#1A1612' }}
                  >
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: '#B7AE9D' }}>
                    {file.project} · {formatDate(file.date)}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50"
                  style={{ color: '#E01414' }}
                >
                  <Download size={12} />
                  Download
                </motion.button>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.div>
    </motion.div>
  )
}
