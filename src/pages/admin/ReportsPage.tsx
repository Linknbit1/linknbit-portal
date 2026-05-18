import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Download, BarChart3,
  Zap, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast-context'
import { PROJECTS, TASKS, TEAM_PERFORMANCE, LEADERBOARD } from '../../data/mock'
import { cn } from '../../lib/cn'

type Period = 'week' | 'month' | 'quarter'

const TASK_TREND = [
  { week: 'Apr W1', completed: 14, created: 18, blocked: 2 },
  { week: 'Apr W2', completed: 21, created: 16, blocked: 1 },
  { week: 'Apr W3', completed: 18, created: 22, blocked: 3 },
  { week: 'Apr W4', completed: 26, created: 20, blocked: 2 },
  { week: 'May W1', completed: 23, created: 19, blocked: 4 },
  { week: 'May W2', completed: 19, created: 24, blocked: 2 },
]

const XP_TREND = [
  { month: 'Jan', xp: 8200 },
  { month: 'Feb', xp: 11400 },
  { month: 'Mar', xp: 9800 },
  { month: 'Apr', xp: 14200 },
  { month: 'May', xp: 11700 },
]

const SERVICE_DIST = [
  { name: 'Development', value: PROJECTS.filter((p) => p.serviceType === 'development').length, color: '#22D3EE' },
  { name: 'Design', value: PROJECTS.filter((p) => p.serviceType === 'design').length, color: '#A78BFA' },
  { name: 'Marketing', value: PROJECTS.filter((p) => p.serviceType === 'marketing').length, color: '#FBBF24' },
]

const STATUS_DIST = [
  { name: 'In Progress', value: PROJECTS.filter((p) => p.status === 'in_progress').length, color: '#22D3EE' },
  { name: 'Blocked', value: PROJECTS.filter((p) => p.status === 'blocked').length, color: '#F4364C' },
  { name: 'Awaiting Client', value: PROJECTS.filter((p) => p.status === 'awaiting_client').length, color: '#F59E0B' },
  { name: 'Completed', value: PROJECTS.filter((p) => p.status === 'completed').length, color: '#22C55E' },
]

const TOOLTIP_STYLE = {
  backgroundColor: '#0F1620',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#E2E8F0',
  fontSize: 12,
  fontFamily: 'JetBrains Mono, monospace',
}

export default function ReportsPage() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('month')

  const totalXP = LEADERBOARD.reduce((s, l) => s + l.totalXp, 0)
  const completedTasks = TASKS.filter((t) => t.status === 'completed').length
  const blockedProjects = PROJECTS.filter((p) => p.status === 'blocked').length
  const avgProgress = Math.round(PROJECTS.reduce((s, p) => s + p.progress, 0) / PROJECTS.length)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Reports & Analytics" />

      <div className="p-6 flex flex-col gap-6 max-w-content mx-auto w-full">

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-1 border border-border-default rounded-lg p-1 gap-1">
            {(['week', 'month', 'quarter'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-[12.5px] font-ui font-medium capitalize transition-colors',
                  period === p ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
                )}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Quarter'}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <Button variant="secondary" onClick={() => toast('Report exported as PDF', 'success')}>
              <Download size={14} /> Export Report
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: BarChart3, color: 'text-service-dev', change: +5, good: true },
            { label: 'Tasks Completed', value: completedTasks, icon: CheckCircle2, color: 'text-success', change: +12, good: true },
            { label: 'Blocked Projects', value: blockedProjects, icon: AlertTriangle, color: 'text-error', change: -1, good: false },
            { label: 'Total XP Awarded', value: totalXP.toLocaleString(), icon: Zap, color: 'text-coin-gold', change: +8, good: true },
          ].map(({ label, value, icon: Icon, color, change, good }) => (
            <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center">
                  <Icon size={16} className={color} />
                </div>
                <div className={cn('flex items-center gap-1 text-[11px] font-mono font-semibold', good ? 'text-success' : 'text-error')}>
                  {good ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {change > 0 ? '+' : ''}{change}%
                </div>
              </div>
              <p className="font-display font-bold text-[26px] text-text-1 leading-none">{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-5">
          {/* Task Completion Trend */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-text-1 mb-4">Task Activity</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={TASK_TREND} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#4A5468', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#4A5468', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#7A8597' }} />
                <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="created" name="Created" fill="#22D3EE" radius={[3, 3, 0, 0]} />
                <Bar dataKey="blocked" name="Blocked" fill="#F4364C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* XP Trend */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-text-1 mb-4">XP Earned Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={XP_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4A5468', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#4A5468', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="xp" stroke="#FBBF24" strokeWidth={2} dot={{ fill: '#FBBF24', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-3 gap-5">
          {/* Service Distribution */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-text-1 mb-4">Projects by Service</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={SERVICE_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {SERVICE_DIST.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {SERVICE_DIST.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="font-ui text-text-2">{name}</span>
                  </div>
                  <span className="font-mono text-text-1 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project Status */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-text-1 mb-4">Project Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={STATUS_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {STATUS_DIST.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {STATUS_DIST.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="font-ui text-text-2">{name}</span>
                  </div>
                  <span className="font-mono text-text-1 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-text-1 mb-4">Team Performance</h3>
            <div className="space-y-3">
              {TEAM_PERFORMANCE.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-[9px] font-bold text-text-2">
                      {member.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-ui text-[12px] text-text-1 truncate">{member.name}</span>
                      <span className="font-mono text-[11px] text-coin-gold font-semibold">{member.xp.toLocaleString()} XP</span>
                    </div>
                    <div className="h-1.5 bg-surface-inset rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min((member.xp / 5000) * 100, 100)}%`, background: 'linear-gradient(90deg, #FBBF24, #F59E0B)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
