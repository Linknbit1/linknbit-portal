import { useState } from 'react'
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Target,
  BarChart2,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PROJECTS } from '../../data/mock'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'

const PROGRESS_HISTORY: Record<string, Array<{ week: string; progress: number }>> = {
  p1: [
    { week: '18 Mar', progress: 8 },
    { week: '25 Mar', progress: 18 },
    { week: '1 Apr', progress: 29 },
    { week: '8 Apr', progress: 40 },
    { week: '15 Apr', progress: 50 },
    { week: '22 Apr', progress: 58 },
    { week: '29 Apr', progress: 63 },
    { week: '6 May', progress: 68 },
  ],
  p2: [
    { week: '1 Apr', progress: 5 },
    { week: '8 Apr', progress: 12 },
    { week: '15 Apr', progress: 24 },
    { week: '22 Apr', progress: 35 },
    { week: '29 Apr', progress: 40 },
    { week: '6 May', progress: 45 },
  ],
  p3: [
    { week: '18 Mar', progress: 10 },
    { week: '25 Mar', progress: 22 },
    { week: '1 Apr', progress: 38 },
    { week: '8 Apr', progress: 52 },
    { week: '15 Apr', progress: 61 },
    { week: '22 Apr', progress: 68 },
    { week: '29 Apr', progress: 72 },
    { week: '6 May', progress: 72 },
  ],
  p4: [
    { week: '1 Apr', progress: 10 },
    { week: '8 Apr', progress: 25 },
    { week: '15 Apr', progress: 48 },
    { week: '22 Apr', progress: 62 },
    { week: '29 Apr', progress: 73 },
    { week: '6 May', progress: 80 },
  ],
  all: [
    { week: '18 Mar', progress: 6 },
    { week: '25 Mar', progress: 14 },
    { week: '1 Apr', progress: 24 },
    { week: '8 Apr', progress: 35 },
    { week: '15 Apr', progress: 46 },
    { week: '22 Apr', progress: 55 },
    { week: '29 Apr', progress: 63 },
    { week: '6 May', progress: 70 },
  ],
}

const MILESTONES: Array<{
  id: string
  project: string
  name: string
  date: string
  status: 'completed' | 'pending' | 'upcoming'
  requiresApproval: boolean
}> = [
  { id: 'm1', project: 'Cricket Sansar App', name: 'Requirements Finalized', date: '2026-03-20', status: 'completed', requiresApproval: false },
  { id: 'm2', project: 'Cricket Sansar App', name: 'Architecture Complete', date: '2026-03-28', status: 'completed', requiresApproval: false },
  { id: 'm3', project: 'Cricket Sansar Brand Identity', name: 'Discovery & Brief', date: '2026-04-02', status: 'completed', requiresApproval: false },
  { id: 'm4', project: 'Cricket Sansar Brand Identity', name: 'Wireframing Approved', date: '2026-05-06', status: 'completed', requiresApproval: true },
  { id: 'm5', project: 'Cricket Sansar App', name: 'Development Done', date: '2026-04-30', status: 'completed', requiresApproval: false },
  { id: 'm6', project: 'Rahim Gul Transport Website', name: 'Client Review Approved', date: '2026-05-09', status: 'completed', requiresApproval: true },
  { id: 'm7', project: 'Cricket Sansar Brand Identity', name: 'Client Review Sign-off', date: '2026-05-20', status: 'pending', requiresApproval: true },
  { id: 'm8', project: 'Cricket Sansar App', name: 'Client Testing / UAT', date: '2026-05-22', status: 'upcoming', requiresApproval: true },
  { id: 'm9', project: 'VPNGuider SEO Campaign', name: 'Campaign Launch', date: '2026-05-25', status: 'upcoming', requiresApproval: false },
  { id: 'm10', project: 'Starr Luxury Cars Portal', name: 'MVP Delivery', date: '2026-06-02', status: 'upcoming', requiresApproval: false },
]

const SERVICE_COLORS: Record<string, string> = {
  development: '#0E8B9A',
  design: '#7A3FD9',
  marketing: '#FBBF24',
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3.5 py-2.5 rounded-xl shadow-lg border"
        style={{ background: '#FFFFFF', borderColor: '#EAE3D6' }}
      >
        <p className="text-[11px] font-mono mb-1" style={{ color: '#B7AE9D' }}>
          {label}
        </p>
        <p className="font-display font-bold text-[20px] leading-none" style={{ color: '#1A1612' }}>
          {payload[0].value}%
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: '#877F71' }}>
          progress
        </p>
      </div>
    )
  }
  return null
}

export default function ClientReportsPage() {
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const projectOptions = [
    { id: 'all', name: 'All Projects (Portfolio Overview)' },
    ...PROJECTS.slice(0, 6).map((p) => ({ id: p.id, name: p.name })),
  ]

  const selectedProjectData = PROJECTS.find((p) => p.id === selectedProject)
  const chartData = PROGRESS_HISTORY[selectedProject] ?? PROGRESS_HISTORY.all
  const currentProgress = chartData[chartData.length - 1]?.progress ?? 0
  const prevProgress = chartData[chartData.length - 2]?.progress ?? 0
  const weeklyGain = currentProgress - prevProgress

  const completedMilestones = MILESTONES.filter((m) => m.status === 'completed').length
  const pendingMilestones = MILESTONES.filter((m) => m.status === 'pending').length

  const activeProjects = PROJECTS.filter((p) =>
    ['in_progress', 'awaiting_client', 'blocked'].includes(p.status),
  )
  const nearestDeadline = PROJECTS.filter((p) => p.status !== 'completed').sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  )[0]

  const daysToDeadline = nearestDeadline
    ? Math.ceil(
        (new Date(nearestDeadline.deadline).getTime() - new Date('2026-05-13').getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  const filteredMilestones =
    selectedProject === 'all'
      ? MILESTONES
      : MILESTONES.filter((m) =>
          selectedProjectData ? m.project === selectedProjectData.name : true,
        )

  return (
    <div className="py-10 font-ui" style={{ color: '#1A1612' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1
            className="font-display font-bold text-[38px] leading-tight tracking-tight mb-1.5"
            style={{ color: '#1A1612' }}
          >
            Reports
          </h1>
          <p className="text-[15px]" style={{ color: '#4F4940' }}>
            Portfolio overview and project health tracking.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80 shrink-0"
          style={{ border: '1px solid #EAE3D6', color: '#4F4940', background: '#FFFFFF' }}
        >
          <Download size={14} />
          Export PDF
        </button>
      </div>

      {/* Project selector */}
      <div className="mb-8">
        <label className="block text-[12px] font-mono uppercase tracking-wider mb-2" style={{ color: '#B7AE9D' }}>
          Viewing
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {projectOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedProject(opt.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                selectedProject === opt.id ? 'shadow-sm' : 'hover:opacity-80',
              )}
              style={{
                background: selectedProject === opt.id ? '#1A1612' : '#FFFFFF',
                color: selectedProject === opt.id ? '#FAF7F2' : '#4F4940',
                borderColor: selectedProject === opt.id ? '#1A1612' : '#EAE3D6',
              }}
            >
              {opt.id === 'all' ? 'All Projects' : opt.name.length > 25 ? opt.name.slice(0, 25) + '…' : opt.name}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: selectedProject === 'all' ? 'Avg. Progress' : 'Project Progress',
            value: `${currentProgress}%`,
            sub: `+${weeklyGain}% this week`,
            icon: TrendingUp,
            color: '#0E8B9A',
            positive: weeklyGain >= 0,
          },
          {
            label: 'Active Projects',
            value: activeProjects.length.toString(),
            sub: `${PROJECTS.filter((p) => p.status === 'awaiting_client').length} need your input`,
            icon: BarChart2,
            color: '#7A3FD9',
            positive: true,
          },
          {
            label: 'Milestones Hit',
            value: completedMilestones.toString(),
            sub: `${pendingMilestones} pending approval`,
            icon: Target,
            color: '#1F9D55',
            positive: true,
          },
          {
            label: 'Next Deadline',
            value: daysToDeadline <= 0 ? 'Overdue' : `${daysToDeadline}d`,
            sub: nearestDeadline ? nearestDeadline.name : '—',
            icon: Clock,
            color: daysToDeadline <= 3 ? '#E01414' : '#B47700',
            positive: daysToDeadline > 7,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border rounded-xl p-5"
            style={{ borderColor: '#EAE3D6' }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-[12px]" style={{ color: '#877F71' }}>
                {kpi.label}
              </p>
              <div
                className="size-8 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}18` }}
              >
                <kpi.icon size={15} style={{ color: kpi.color }} />
              </div>
            </div>
            <p
              className="font-display font-bold text-[32px] leading-none mb-1"
              style={{ color: '#1A1612' }}
            >
              {kpi.value}
            </p>
            <p className="text-[12px]" style={{ color: kpi.positive ? '#1F9D55' : '#E01414' }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Area chart */}
        <div className="col-span-2 bg-white border rounded-xl p-5" style={{ borderColor: '#EAE3D6' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3
                className="font-display font-semibold text-[16px]"
                style={{ color: '#1A1612' }}
              >
                Progress Over Time
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                Weekly completion percentage
              </p>
            </div>
            <span
              className="font-display font-bold text-[28px]"
              style={{ color: '#1A1612' }}
            >
              {currentProgress}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E01414" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E01414" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EAE3D6"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#B7AE9D', fontFamily: 'Poppins, sans-serif' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#B7AE9D', fontFamily: 'Poppins, sans-serif' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="progress"
                stroke="#E01414"
                strokeWidth={2.5}
                fill="url(#progressGrad)"
                dot={{ fill: '#E01414', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: '#E01414', r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Project breakdown */}
        <div className="bg-white border rounded-xl p-5"
            style={{ borderColor: '#EAE3D6' }}>
          <h3 className="font-display font-semibold text-[16px] mb-4" style={{ color: '#1A1612' }}>
            Project Status
          </h3>
          <div className="space-y-3">
            {PROJECTS.slice(0, 6).map((project) => (
              <div key={project.id}>
                <div className="flex items-center justify-between mb-1">
                  <p
                    className="text-[12px] font-medium truncate pr-2"
                    style={{ color: '#4F4940', maxWidth: '60%' }}
                    title={project.name}
                  >
                    {project.name.length > 22 ? project.name.slice(0, 22) + '…' : project.name}
                  </p>
                  <span
                    className="text-[11px] font-mono font-bold shrink-0"
                    style={{ color: '#1A1612' }}
                  >
                    {project.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#EAE3D6' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${project.progress}%`,
                      background: SERVICE_COLORS[project.serviceType] ?? '#0E8B9A',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white border rounded-xl p-5"
            style={{ borderColor: '#EAE3D6' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-[16px]" style={{ color: '#1A1612' }}>
              Milestones
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
              Key project stages and approvals
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px]" style={{ color: '#877F71' }}>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-400" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: '#EAE3D6' }} />
              Upcoming
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredMilestones.slice(0, 10).map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 p-3.5 rounded-xl border"
              style={{
                borderColor:
                  m.status === 'completed'
                    ? 'rgba(31,157,85,0.2)'
                    : m.status === 'pending'
                      ? 'rgba(224,20,20,0.2)'
                      : '#EAE3D6',
                background:
                  m.status === 'completed'
                    ? 'rgba(31,157,85,0.04)'
                    : m.status === 'pending'
                      ? 'rgba(224,20,20,0.04)'
                      : '#FAF7F2',
              }}
            >
              <div className="shrink-0 mt-0.5">
                {m.status === 'completed' ? (
                  <CheckCircle2 size={16} style={{ color: '#1F9D55' }} />
                ) : m.status === 'pending' ? (
                  <AlertCircle size={16} style={{ color: '#E01414' }} />
                ) : (
                  <Clock size={16} style={{ color: '#B7AE9D' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold"
                  style={{
                    color:
                      m.status === 'completed'
                        ? '#1F9D55'
                        : m.status === 'pending'
                          ? '#1A1612'
                          : '#4F4940',
                  }}
                >
                  {m.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#B7AE9D' }}>
                  {m.project}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: '#B7AE9D' }}>
                    <Calendar size={10} />
                    {formatDate(m.date)}
                  </span>
                  {m.requiresApproval && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xs"
                      style={{ background: '#EAE3D6', color: '#877F71' }}
                    >
                      Your Approval
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
