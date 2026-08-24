import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Eye,
  Download,
  ChevronRight,
  XCircle,
  RotateCcw,
  Layers,
  Mail,
} from 'lucide-react'
import { PROJECTS, APPROVALS, TASKS } from '../../data/mock'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

const SERVICE_LABELS: Record<string, string> = {
  development: 'App Development',
  design: 'UI/UX Design',
  marketing: 'Digital Marketing',
}

const SERVICE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  development: { bg: 'rgba(14,139,154,0.1)', text: '#0E8B9A', bar: '#0E8B9A' },
  design: { bg: 'rgba(122,63,217,0.1)', text: '#7A3FD9', bar: '#7A3FD9' },
  marketing: { bg: 'rgba(251,191,36,0.15)', text: '#B47700', bar: '#FBBF24' },
}

const PROJECT_DESCRIPTIONS: Record<string, string> = {
  p1: 'A full-featured cricket data and scoring app for the South Asian market. The app includes live match scores, player statistics, tournaments, and fantasy cricket features.',
  p2: 'Complete brand identity package including logo system, typography, color palette, brand guidelines, and all digital asset deliverables.',
  p3: 'Comprehensive SEO optimization campaign targeting cricket and sports-adjacent keywords, including technical audits, on-page optimization, and content strategy.',
  p4: 'Modern transport company website featuring fleet showcase, booking system, route information, and contact management.',
  p5: 'Premium automotive portal for a luxury car dealership — inventory management, vehicle showcase, financing calculator, and appointment booking.',
  p6: 'Personal brand website for executive coaching services with service showcases, testimonials, booking integration, and blog.',
  p7: 'B2B directory and listing platform for offsite team collaboration tools and remote work resources.',
  p8: 'Healthcare management app connecting patients with providers, including appointment booking, telemedicine, and health record management.',
}

const PROJECT_FILES: Record<string, Array<{ id: string; name: string; type: string; size: string; by: string; date: string }>> = {
  p1: [
    { id: 'pf1', name: 'Project_Brief.pdf', type: 'pdf', size: '1.2 MB', by: 'Ahmad Karimi', date: '2026-05-08' },
    { id: 'pf2', name: 'API_Documentation_v2.pdf', type: 'pdf', size: '3.8 MB', by: 'Ahmad Karimi', date: '2026-05-11' },
    { id: 'pf3', name: 'Architecture_Diagram.png', type: 'image', size: '0.9 MB', by: 'Usman Tariq', date: '2026-05-01' },
  ],
  p2: [
    { id: 'pf4', name: 'CS_UI_Designs_v3.fig', type: 'figma', size: '12.4 MB', by: 'Sara Qureshi', date: '2026-05-10' },
    { id: 'pf5', name: 'Wireframes_v2.fig', type: 'figma', size: '8.7 MB', by: 'Sara Qureshi', date: '2026-05-01' },
    { id: 'pf6', name: 'Brand_Colors_Guide.pdf', type: 'pdf', size: '2.1 MB', by: 'Sara Qureshi', date: '2026-04-28' },
    { id: 'pf7', name: 'Logo_Concepts_v1.fig', type: 'figma', size: '5.3 MB', by: 'Bilal Ahmed', date: '2026-04-15' },
  ],
  p4: [
    { id: 'pf8', name: 'Homepage_Design_v2.fig', type: 'figma', size: '9.1 MB', by: 'Sara Qureshi', date: '2026-05-09' },
    { id: 'pf9', name: 'Component_Library.fig', type: 'figma', size: '6.4 MB', by: 'Bilal Ahmed', date: '2026-05-03' },
  ],
}

const ACTIVITY: Array<{ id: string; text: string; time: string; type: string }> = [
  { id: 'ac1', text: 'Ahmad Karimi moved project to Internal QA stage', time: '2026-05-08T09:00:00', type: 'stage' },
  { id: 'ac2', text: 'Sara Qureshi uploaded CS_UI_Designs_v3.fig', time: '2026-05-10T14:00:00', type: 'file' },
  { id: 'ac3', text: 'You approved Wireframing stage', time: '2026-05-06T11:00:00', type: 'approved' },
  { id: 'ac4', text: 'Ahmad Karimi commented on task: Fix pagination bug', time: '2026-05-12T08:00:00', type: 'comment' },
  { id: 'ac5', text: 'API Documentation v2 submitted for your review', time: '2026-05-11T10:00:00', type: 'approval' },
  { id: 'ac6', text: 'Project started — Development phase began', time: '2026-03-18T09:00:00', type: 'stage' },
]

type Tab = 'overview' | 'timeline' | 'files' | 'approvals' | 'activity'

function FileTypeIcon({ type }: { type: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    figma: { bg: 'rgba(122,63,217,0.1)', color: '#7A3FD9', label: 'FIG' },
    pdf: { bg: 'rgba(224,20,20,0.08)', color: '#E01414', label: 'PDF' },
    image: { bg: 'rgba(251,191,36,0.1)', color: '#B47700', label: 'IMG' },
    doc: { bg: 'rgba(14,139,154,0.1)', color: '#0E8B9A', label: 'DOC' },
    default: { bg: '#F2EDE4', color: '#877F71', label: 'FILE' },
  }
  const s = styles[type] ?? styles.default
  return (
    <div
      className="size-9 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </div>
  )
}

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const [approvalStates, setApprovalStates] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {}
    APPROVALS.forEach((a) => (s[a.id] = a.status))
    return s
  })
  const [activeRevision, setActiveRevision] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({})

  const project = PROJECTS.find((p) => p.id === id)
  if (!project) return <Navigate to="/client/projects" replace />

  const svc = SERVICE_COLORS[project.serviceType]
  const projectApprovals = APPROVALS.filter((a) => a.projectId === project.id)
  const clientTasks = TASKS.filter((t) => t.projectId === project.id && t.clientVisible)
  const projectFiles = PROJECT_FILES[project.id] ?? []

  const visibleStages = project.stages.filter((s) => s.clientVisible)
  const hasStages = project.stages.length > 0

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline', count: project.stages.length > 0 ? project.stages.length : undefined },
    { key: 'files', label: 'Files', count: projectFiles.length },
    { key: 'approvals', label: 'Approvals', count: projectApprovals.length },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="py-8 font-ui" style={{ color: '#1A1612' }}>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          to="/client/projects"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:opacity-70"
          style={{ color: '#877F71' }}
        >
          <ArrowLeft size={14} />
          All Projects
        </Link>
      </div>

      {/* Project header */}
      <div className="bg-client-surface border border-client-border rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs font-semibold"
                style={{ background: svc.bg, color: svc.text }}
              >
                {SERVICE_LABELS[project.serviceType]}
              </span>
              {project.status === 'awaiting_client' && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    background: 'rgba(224,20,20,0.08)',
                    color: '#E01414',
                    borderColor: 'rgba(224,20,20,0.25)',
                  }}
                >
                  ⚡ Action Needed
                </span>
              )}
            </div>
            <h1
              className="font-display font-bold text-h2/tight tracking-tight"
              style={{ color: '#1A1612' }}
            >
              {project.name}
            </h1>
            <p className="text-[14px] mt-1" style={{ color: '#877F71' }}>
              {project.clientName} · PM: {project.pm.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div
              className="font-display font-bold text-[36px] leading-none"
              style={{ color: '#1A1612' }}
            >
              {project.progress}%
            </div>
            <p className="text-[12px] mt-1" style={{ color: '#877F71' }}>
              overall progress
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full overflow-hidden mb-3" style={{ background: '#EAE3D6' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${project.progress}%`,
              background:
                project.status === 'awaiting_client'
                  ? '#E01414'
                  : project.progress >= 75
                    ? '#1F9D55'
                    : svc.bar,
            }}
          />
        </div>

        <div className="flex items-center gap-6 text-[13px]" style={{ color: '#877F71' }}>
          <span className="flex items-center gap-1.5">
            <Layers size={13} />
            <strong style={{ color: '#1A1612' }}>{project.currentStage}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            Deadline:{' '}
            <strong style={{ color: '#1A1612' }}>{formatDate(project.deadline)}</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b mb-6" style={{ borderColor: '#EAE3D6' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-[14px] font-medium border-b-2 transition-all flex items-center gap-1.5 -mb-px',
              tab === t.key
                ? 'border-[#E01414] font-semibold'
                : 'border-transparent hover:border-client-border',
            )}
            style={{ color: tab === t.key ? '#1A1612' : '#877F71' }}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#EAE3D6', color: '#4F4940' }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-5">
          {/* Main info */}
          <div className="col-span-2 space-y-5">
            <div className="bg-client-surface border border-client-border rounded-xl p-5 shadow-sm">
              <h3
                className="font-display font-semibold text-[15px] mb-3"
                style={{ color: '#1A1612' }}
              >
                About this Project
              </h3>
              <p className="text-body/relaxed" style={{ color: '#4F4940' }}>
                {PROJECT_DESCRIPTIONS[project.id] ?? 'A professional project managed by Linknbit.'}
              </p>
            </div>

            {/* Key dates */}
            <div className="bg-client-surface border border-client-border rounded-xl p-5 shadow-sm">
              <h3
                className="font-display font-semibold text-[15px] mb-4"
                style={{ color: '#1A1612' }}
              >
                Key Dates
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Project Start', value: '18 Mar 2026', icon: Calendar },
                  { label: 'Current Stage', value: project.currentStage, icon: Layers },
                  { label: 'Deadline', value: formatDate(project.deadline), icon: Clock },
                  { label: 'Overall Progress', value: `${project.progress}% Complete`, icon: ChevronRight },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
                  >
                    <item.icon size={14} style={{ color: '#877F71' }} />
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: '#B7AE9D' }}>
                        {item.label}
                      </p>
                      <p className="text-[13px] font-semibold mt-0.5" style={{ color: '#1A1612' }}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visible tasks */}
            {clientTasks.length > 0 && (
              <div className="bg-client-surface border border-client-border rounded-xl p-5 shadow-sm">
                <h3
                  className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"
                  style={{ color: '#1A1612' }}
                >
                  <Eye size={15} style={{ color: '#877F71' }} />
                  Shared Tasks
                </h3>
                <div className="space-y-2">
                  {clientTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
                    >
                      <div
                        className={cn(
                          'size-2 rounded-full shrink-0',
                          task.status === 'completed'
                            ? 'bg-green-500'
                            : task.status === 'in_progress'
                              ? 'bg-cyan-500'
                              : 'bg-gray-300',
                        )}
                      />
                      <span className="text-[13px] flex-1" style={{ color: '#1A1612' }}>
                        {task.title}
                      </span>
                      <span
                        className="text-[11px] font-mono"
                        style={{ color: '#B7AE9D' }}
                      >
                        {task.assignee.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* PM card */}
            <div className="bg-client-surface border border-client-border rounded-xl p-4 shadow-sm">
              <p
                className="text-[11px] font-mono uppercase tracking-wider mb-3"
                style={{ color: '#B7AE9D' }}
              >
                Project Manager
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="size-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
                >
                  {project.pm.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: '#1A1612' }}>
                    {project.pm.name}
                  </p>
                  <p className="text-[12px]" style={{ color: '#877F71' }}>
                    {project.pm.role === 'project_manager' ? 'Project Manager' : 'Team Lead'}
                  </p>
                </div>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
                style={{ background: '#FAF7F2', border: '1px solid #EAE3D6', color: '#4F4940' }}
              >
                <Mail size={13} />
                Send Message
              </button>
            </div>

            {/* Team card */}
            <div className="bg-client-surface border border-client-border rounded-xl p-4 shadow-sm">
              <p
                className="text-[11px] font-mono uppercase tracking-wider mb-3"
                style={{ color: '#B7AE9D' }}
              >
                Your Team
              </p>
              <div className="flex items-center gap-1.5">
                {['AK', 'SQ', 'BA', 'UT'].slice(0, project.teamIds.length).map((initials, i) => (
                  <div
                    key={i}
                    className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white -ml-1 first:ml-0"
                    style={{
                      background: `hsl(${i * 60 + 200}, 60%, 45%)`,
                      zIndex: 4 - i,
                    }}
                  >
                    {initials}
                  </div>
                ))}
                <span className="text-[12px] ml-2" style={{ color: '#877F71' }}>
                  {project.teamIds.length} members
                </span>
              </div>
            </div>

            {/* Next milestone */}
            {visibleStages.some((s) => s.status === 'upcoming' && s.requiresApproval) && (
              <div
                className="rounded-xl p-4 border"
                style={{ background: 'rgba(224,20,20,0.04)', borderColor: 'rgba(224,20,20,0.2)' }}
              >
                <p
                  className="text-[11px] font-mono uppercase tracking-wider mb-2"
                  style={{ color: '#E01414' }}
                >
                  Next Milestone
                </p>
                <p className="text-[13px] font-semibold" style={{ color: '#1A1612' }}>
                  {visibleStages.find((s) => s.status === 'upcoming' && s.requiresApproval)?.name}
                </p>
                <p className="text-[12px] mt-1" style={{ color: '#877F71' }}>
                  Requires your approval
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {tab === 'timeline' && (
        <div className="max-w-2xl">
          {!hasStages ? (
            <div className="text-center py-16" style={{ color: '#877F71' }}>
              <Layers size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-display font-bold text-[16px]" style={{ color: '#1A1612' }}>
                Timeline coming soon
              </p>
              <p className="text-[14px] mt-1">Stages for this project are being configured.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-4 inset-y-4 w-0.5"
                style={{ background: '#EAE3D6' }}
              />

              <div className="space-y-0">
                {project.stages.map((stage, i) => {
                  const isCompleted = stage.status === 'completed'
                  const isCurrent = stage.status === 'current'
                  const isBlocked = stage.status === 'blocked'
                  const showToClient = stage.clientVisible

                  if (!showToClient && !isCompleted && !isCurrent && !isBlocked) {
                    if (
                      i > 0 &&
                      !project.stages[i - 1].clientVisible &&
                      project.stages[i - 1].status === 'upcoming'
                    ) {
                      return null
                    }
                    return (
                      <div key={stage.id} className="flex gap-6 pb-6">
                        <div className="flex flex-col items-center shrink-0 z-10">
                          <div
                            className="size-8 rounded-full border-2 flex items-center justify-center"
                            style={{ background: '#FAF7F2', borderColor: '#EAE3D6' }}
                          >
                            <div className="size-1.5 rounded-full" style={{ background: '#EAE3D6' }} />
                          </div>
                        </div>
                        <div
                          className="flex-1 p-3 rounded-lg mt-1"
                          style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
                        >
                          <p className="text-[12px] italic" style={{ color: '#B7AE9D' }}>
                            Internal work in progress…
                          </p>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={stage.id} className="flex gap-6 pb-6">
                      <div className="flex flex-col items-center shrink-0 z-10">
                        <div
                          className={cn(
                            'size-8 rounded-full border-2 flex items-center justify-center',
                            isCompleted
                              ? 'bg-green-500 border-green-500'
                              : isCurrent || isBlocked
                                ? 'bg-white border-[#E01414]'
                                : 'bg-white border-client-border',
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={14} className="text-white" />
                          ) : isCurrent || isBlocked ? (
                            <div className="size-2.5 rounded-full bg-[#E01414] animate-pulse" />
                          ) : (
                            <div className="size-2 rounded-full" style={{ background: '#EAE3D6' }} />
                          )}
                        </div>
                      </div>

                      <div
                        className={cn(
                          'flex-1 p-4 rounded-xl border mt-0.5',
                          isCompleted
                            ? 'bg-green-50/40 border-green-100'
                            : isCurrent || isBlocked
                              ? 'bg-white border-client-border shadow-sm'
                              : 'bg-white border-client-border',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={cn(
                              'text-[14px] font-semibold',
                              isCompleted ? 'text-green-700' : '',
                            )}
                            style={!isCompleted ? { color: '#1A1612' } : {}}
                          >
                            {stage.name}
                          </p>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: isCompleted
                                ? 'rgba(31,157,85,0.1)'
                                : isCurrent || isBlocked
                                  ? 'rgba(224,20,20,0.08)'
                                  : '#F2EDE4',
                              color: isCompleted
                                ? '#1F9D55'
                                : isCurrent || isBlocked
                                  ? '#E01414'
                                  : '#B7AE9D',
                            }}
                          >
                            {isCompleted
                              ? 'Completed'
                              : isCurrent
                                ? 'In Progress'
                                : isBlocked
                                  ? 'Blocked'
                                  : 'Upcoming'}
                          </span>
                        </div>
                        {stage.requiresApproval && (
                          <p className="text-[12px] flex items-center gap-1.5 mt-1" style={{ color: '#877F71' }}>
                            <Users size={11} />
                            {isCompleted ? 'Approved by you' : 'Requires your approval'}
                          </p>
                        )}
                        {stage.approvalStatus === 'pending' && (
                          <div
                            className="mt-3 p-2.5 rounded-lg flex items-center gap-2"
                            style={{ background: 'rgba(224,20,20,0.06)', border: '1px solid rgba(224,20,20,0.15)' }}
                          >
                            <AlertCircle size={13} style={{ color: '#E01414' }} />
                            <p className="text-[12px] font-medium" style={{ color: '#E01414' }}>
                              Approval request sent — awaiting your response
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Files */}
      {tab === 'files' && (
        <div>
          {projectFiles.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#877F71' }}>
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-display font-bold text-[16px]" style={{ color: '#1A1612' }}>
                No files delivered yet
              </p>
              <p className="text-[14px] mt-1">Files will appear here as the project progresses.</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {projectFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-client-surface shadow-sm hover:shadow-md transition-shadow"
                  style={{ borderColor: '#EAE3D6' }}
                >
                  <FileTypeIcon type={file.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: '#1A1612' }}>
                      {file.name}
                    </p>
                    <p className="text-[12px] font-mono mt-0.5" style={{ color: '#B7AE9D' }}>
                      {file.by} · {formatDate(file.date)} · {file.size}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                      style={{ background: '#FAF7F2', border: '1px solid #EAE3D6', color: '#4F4940' }}
                    >
                      <Eye size={13} />
                      View
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
                      style={{ background: '#E01414', color: 'white' }}
                    >
                      <Download size={13} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Approvals */}
      {tab === 'approvals' && (
        <div className="max-w-2xl">
          {projectApprovals.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#877F71' }}>
              <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-display font-bold text-[16px]" style={{ color: '#1A1612' }}>
                No approvals for this project
              </p>
              <p className="text-[14px] mt-1">Approval requests will appear here when submitted.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectApprovals.map((approval) => {
                const state = approvalStates[approval.id] ?? approval.status
                const isRevising = activeRevision === approval.id

                return (
                  <div
                    key={approval.id}
                    className="bg-client-surface border border-client-border rounded-xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[11px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-xs"
                            style={{ background: '#EAE3D6', color: '#877F71' }}
                          >
                            {approval.type === 'stage' ? 'Stage Approval' : 'File Approval'}
                          </span>
                        </div>
                        <p className="text-[14px] font-semibold" style={{ color: '#1A1612' }}>
                          {approval.stageName ?? approval.fileName}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                          {approval.submittedBy} · {formatRelativeTime(approval.submittedAt)}
                        </p>
                      </div>
                      {state !== 'pending' && (
                        <span
                          className="text-[12px] font-semibold px-3 py-1 rounded-full"
                          style={{
                            background:
                              state === 'approved'
                                ? 'rgba(31,157,85,0.1)'
                                : state === 'revision_requested'
                                  ? 'rgba(251,191,36,0.1)'
                                  : 'rgba(224,20,20,0.08)',
                            color:
                              state === 'approved'
                                ? '#1F9D55'
                                : state === 'revision_requested'
                                  ? '#B47700'
                                  : '#E01414',
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

                    {approval.message && (
                      <div
                        className="rounded-lg p-3.5 mb-4"
                        style={{ background: '#F2EDE4', border: '1px solid #EAE3D6' }}
                      >
                        <p className="text-body/relaxed" style={{ color: '#4F4940' }}>
                          {approval.message}
                        </p>
                      </div>
                    )}

                    {state === 'pending' && !isRevising && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setApprovalStates((s) => ({ ...s, [approval.id]: 'approved' }))
                          }
                          className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: '#1F9D55' }}
                        >
                          <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => setActiveRevision(approval.id)}
                          className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-opacity hover:opacity-80"
                          style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                        >
                          <RotateCcw size={14} className="inline mr-1.5 -mt-0.5" />
                          Request Revision
                        </button>
                        <button
                          onClick={() =>
                            setApprovalStates((s) => ({ ...s, [approval.id]: 'rejected' }))
                          }
                          className="px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-opacity hover:opacity-80"
                          style={{ border: '1px solid rgba(224,20,20,0.3)', color: '#E01414' }}
                        >
                          <XCircle size={14} className="inline mr-1 -mt-0.5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {isRevising && (
                      <div>
                        <textarea
                          placeholder="Describe the revisions needed…"
                          value={revisionNotes[approval.id] ?? ''}
                          onChange={(e) =>
                            setRevisionNotes((n) => ({ ...n, [approval.id]: e.target.value }))
                          }
                          rows={3}
                          className="w-full text-[14px] rounded-lg p-3 border outline-none resize-none mb-3"
                          style={{
                            background: '#FAF7F2',
                            borderColor: '#EAE3D6',
                            color: '#1A1612',
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setApprovalStates((s) => ({
                                ...s,
                                [approval.id]: 'revision_requested',
                              }))
                              setActiveRevision(null)
                            }}
                            className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white"
                            style={{ background: '#B47700' }}
                          >
                            Submit Revision Request
                          </button>
                          <button
                            onClick={() => setActiveRevision(null)}
                            className="px-4 py-2 rounded-lg text-[13px] font-medium"
                            style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Activity */}
      {tab === 'activity' && (
        <div className="max-w-2xl">
          <div className="relative">
            <div
              className="absolute left-3.5 inset-y-0 w-0.5"
              style={{ background: '#EAE3D6' }}
            />
            <div className="space-y-0">
              {ACTIVITY.map((item) => {
                const dotColor =
                  item.type === 'approved'
                    ? '#1F9D55'
                    : item.type === 'file'
                      ? '#7A3FD9'
                      : item.type === 'approval'
                        ? '#E01414'
                        : item.type === 'comment'
                          ? '#0E8B9A'
                          : '#EAE3D6'
                const Icon =
                  item.type === 'approved'
                    ? CheckCircle2
                    : item.type === 'file'
                      ? FileText
                      : item.type === 'approval'
                        ? AlertCircle
                        : item.type === 'comment'
                          ? MessageSquare
                          : Layers

                return (
                  <div key={item.id} className="flex gap-4 pb-5">
                    <div className="flex flex-col items-center shrink-0 z-10">
                      <div
                        className="size-7 rounded-full flex items-center justify-center border-2 border-white"
                        style={{ background: `${dotColor}18` }}
                      >
                        <Icon size={12} style={{ color: dotColor }} />
                      </div>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px]" style={{ color: '#4F4940' }}>
                        {item.text}
                      </p>
                      <p className="text-[12px] font-mono mt-0.5" style={{ color: '#B7AE9D' }}>
                        {formatRelativeTime(item.time)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
