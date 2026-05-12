import { CheckCircle2, ChevronRight, Download, Clock } from 'lucide-react'
import { PROJECTS, APPROVALS } from '../../data/mock'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

const CLIENT_PROJECTS = PROJECTS.filter((p) => p.clientId === 'c1' || p.serviceType === 'design').slice(0, 2)

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

export default function ClientDashboardPage() {
  const pendingApprovals = APPROVALS.filter((a) => a.status === 'pending')

  return (
    <div className="py-10 font-ui" style={{ color: '#1A1612' }}>
      {/* Welcome header */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[40px] leading-tight tracking-tight mb-2" style={{ color: '#1A1612' }}>
          Good morning, Imran.
        </h1>
        {pendingApprovals.length > 0 && (
          <p className="text-[16px]" style={{ color: '#4F4940' }}>
            You have{' '}
            <strong style={{ color: '#1A1612' }}>{pendingApprovals.length} items</strong> waiting for your approval.{' '}
            <a href="#approvals" style={{ color: '#EE2737' }} className="font-semibold hover:underline">
              Review now →
            </a>
          </p>
        )}
      </div>

      {/* Active Projects */}
      <section className="mb-10">
        <h2 className="font-display font-bold text-[22px] tracking-tight mb-4" style={{ color: '#1A1612' }}>
          Active Projects
        </h2>
        <div className="grid grid-cols-2 gap-5">
          {CLIENT_PROJECTS.map((project) => {
            const isActionNeeded = project.status === 'awaiting_client'
            const stageInfo = STAGE_DESCRIPTIONS[project.currentStage]
            return (
              <div
                key={project.id}
                className={cn(
                  'rounded-xl border p-6 bg-client-surface',
                  isActionNeeded
                    ? 'border-2 border-client-accent/40 shadow-md'
                    : 'border-client-border shadow-sm',
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-display font-bold text-[18px] leading-tight mb-1" style={{ color: '#1A1612' }}>
                      {project.name}
                    </h3>
                    <span
                      className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs font-semibold"
                      style={{
                        background: project.serviceType === 'design' ? 'rgba(122,63,217,0.1)' : 'rgba(14,139,154,0.1)',
                        color: project.serviceType === 'design' ? '#7A3FD9' : '#0E8B9A',
                      }}
                    >
                      {SERVICE_LABEL[project.serviceType]}
                    </span>
                  </div>
                  {isActionNeeded && (
                    <span className="text-[11px] bg-red-50 text-red-600 border border-red-200 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      Action Needed
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium" style={{ color: '#4F4940' }}>
                      {project.currentStage}
                    </span>
                    <span className="text-[13px] font-mono font-bold" style={{ color: '#1A1612' }}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#EAE3D6' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.progress}%`,
                        background: isActionNeeded ? '#EE2737' : '#1F9D55',
                      }}
                    />
                  </div>
                </div>

                {/* Stage description */}
                {stageInfo && (
                  <div className="rounded-lg p-3 mb-4" style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}>
                    <p className="text-[13px] leading-relaxed mb-1" style={{ color: '#4F4940' }}>
                      {stageInfo.desc}
                    </p>
                    <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#1F9D55' }}>
                      <ChevronRight size={12} />
                      {stageInfo.next}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
                    >
                      {project.pm.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-[13px]" style={{ color: '#877F71' }}>
                      {project.pm.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono flex items-center gap-1" style={{ color: '#877F71' }}>
                      <Clock size={11} />
                      {formatDate(project.deadline)}
                    </span>
                    <button
                      className="px-4 py-2 rounded-md text-[13px] font-semibold transition-colors"
                      style={{
                        background: isActionNeeded ? '#EE2737' : 'transparent',
                        color: isActionNeeded ? 'white' : '#EE2737',
                        border: '1px solid #EE2737',
                      }}
                    >
                      {isActionNeeded ? 'Review Now' : 'View Project'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pending Approvals */}
      <section id="approvals" className="mb-10">
        <h2 className="font-display font-bold text-[22px] tracking-tight mb-4 flex items-center gap-2" style={{ color: '#1A1612' }}>
          Waiting for You
          <span className="text-[14px] bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-0.5 rounded-full">
            {pendingApprovals.length}
          </span>
        </h2>
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-client-surface border border-client-border rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-xs"
                      style={{ background: '#EAE3D6', color: '#877F71' }}
                    >
                      {approval.type === 'stage' ? 'Stage Approval' : 'File Approval'}
                    </span>
                    <span className="text-[12px]" style={{ color: '#877F71' }}>
                      {approval.projectName}
                    </span>
                  </div>
                  <p className="text-[13px]" style={{ color: '#4F4940' }}>
                    Submitted by <strong style={{ color: '#1A1612' }}>{approval.submittedBy}</strong> · {formatRelativeTime(approval.submittedAt)}
                  </p>
                </div>
              </div>

              {approval.message && (
                <div className="rounded-lg p-3.5 mb-4" style={{ background: '#F2EDE4', border: '1px solid #EAE3D6' }}>
                  <p className="text-[14px] leading-relaxed" style={{ color: '#4F4940' }}>
                    {approval.message}
                  </p>
                </div>
              )}

              {approval.attachments?.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2.5 p-3 rounded-lg mb-4"
                  style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ background: '#EAE3D6', color: '#877F71' }}
                  >
                    {file.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: '#1A1612' }}>{file.name}</span>
                  <button className="text-[13px] font-semibold" style={{ color: '#EE2737' }}>View →</button>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <button
                  className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:opacity-90"
                  style={{ background: '#1F9D55' }}
                >
                  <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                  {approval.type === 'stage' ? 'Approve Stage' : 'Approve'}
                </button>
                <button
                  className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-colors"
                  style={{ border: '1px solid #EAE3D6', color: '#4F4940', background: 'transparent' }}
                >
                  Request Revision
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Updates */}
      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="font-display font-bold text-[22px] tracking-tight mb-4" style={{ color: '#1A1612' }}>
            Recent Updates
          </h2>
          <div className="space-y-0">
            {RECENT_UPDATES.map((update, i) => (
              <div key={i} className="flex gap-3 py-3 border-b" style={{ borderColor: '#EAE3D6' }}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5"
                    style={{
                      background: update.type === 'approved' ? '#1F9D55' : update.type === 'file' ? '#7A3FD9' : '#EAE3D6',
                    }}
                  />
                  {i < RECENT_UPDATES.length - 1 && (
                    <div className="w-px flex-1 mt-1 min-h-4" style={{ background: '#EAE3D6' }} />
                  )}
                </div>
                <div>
                  <p className="text-[14px] leading-snug" style={{ color: '#4F4940' }}>
                    {update.text}
                    <span className="text-[13px]" style={{ color: '#877F71' }}> · {update.project}</span>
                  </p>
                  <p className="text-[12px] font-mono mt-0.5" style={{ color: '#B7AE9D' }}>
                    {formatRelativeTime(update.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivered Files */}
        <section>
          <h2 className="font-display font-bold text-[22px] tracking-tight mb-4" style={{ color: '#1A1612' }}>
            Delivered Files
          </h2>
          <div className="space-y-2">
            {DELIVERED_FILES.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3.5 rounded-lg transition-colors"
                style={{ background: '#FFFFFF', border: '1px solid #EAE3D6' }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                  style={{ background: file.type === 'figma' ? 'rgba(122,63,217,0.1)' : '#EAE3D6', color: file.type === 'figma' ? '#7A3FD9' : '#877F71' }}
                >
                  {file.type === 'figma' ? 'FIG' : 'PDF'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#1A1612' }}>{file.name}</p>
                  <p className="text-[11px] font-mono" style={{ color: '#B7AE9D' }}>{file.project} · {formatDate(file.date)}</p>
                </div>
                <button className="flex items-center gap-1 text-[12px] font-semibold transition-colors hover:opacity-80" style={{ color: '#EE2737' }}>
                  <Download size={13} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
