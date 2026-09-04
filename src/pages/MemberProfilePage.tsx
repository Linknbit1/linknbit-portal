import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Mail, Phone, BadgeCheck, Pencil, UserCog, Loader2, Users2, FolderKanban, ListChecks, Plane, Home,
  Lock, Briefcase, Zap, Trophy, Star, Award, Target, Megaphone, History,
  ArrowUpRight, ArrowDownRight, CalendarDays, TrendingUp, Palmtree, AlertCircle, Hourglass,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { ProfileRoles } from '../components/shared/ProfileRoles'
import { ServiceChip } from '../components/shared/ServiceChip'
import { StatusChip } from '../components/shared/StatusChip'
import { SalaryCard } from '../components/shared/SalaryCard'
import { PersonLink } from '../components/shared/PersonLink'
import { PersonEditDrawer } from '../components/shared/PersonEditDrawer'
import { StartDMButton } from '../components/chat/StartDMButton'
import { MonthStepper } from '../components/shared/MonthFilter'
import { useAuthContext } from '../context/AuthContext'
import { useToast } from '../components/ui/toast-context'
import { useMonthFilter } from '../hooks/useMonthFilter'
import { usePerson, usePersonTeams, usePersonProjects } from '../hooks/usePeople'
import { useDesignations } from '../hooks/useDesignations'
import { useTasks } from '../hooks/useTasks'
import {
  useLeaveByProfile, useWfhByProfile, useAttendanceByProfileMonth, useLeaveBalancesByProfile,
  useExceptionsByProfile, useOvertimeByProfile,
} from '../hooks/useAttendance'
import {
  useLeaderboard, useProfileDirectory, useXpTransactions, useMyBadgeAwards,
  useBadges, useMyClaims, useAllQuestTasks, useApprovedShoutouts, useMyLpHistory,
} from '../hooks/useGamification'
import { formatRelativeTime } from '../lib/utils'
import { cn } from '../lib/cn'
import { AttendanceChips } from '../components/shared/AttendanceChips'
import type { Person, PersonTeam, PersonProject } from '../api/people'
import type { TaskListItem } from '../api/tasks'
import type { LeaveRequestWithType, WfhRequest } from '../api/attendance'
import { useAuthority, useCanAccess, useCanImpersonate } from '../hooks/useRoleFlags'
import { outranks } from '../lib/peopleAccess'
import { DAY_PART_LABEL } from '../lib/dayParts'
import { formatHoursMinutes } from '../lib/attendanceHours'

const ATT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  present:  { label: 'Present',  cls: 'bg-success/10 text-success border-success/30',                     dot: 'bg-success' },
  late:     { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/30',                     dot: 'bg-warning' },
  absent:   { label: 'Absent',   cls: 'bg-error/10 text-error border-error/30',                           dot: 'bg-error' },
  half_day: { label: 'Half Day', cls: 'bg-service-design/10 text-service-design border-service-design/30', dot: 'bg-service-design' },
  leave:    { label: 'Leave',    cls: 'bg-service-dev/10 text-service-dev border-service-dev/30',          dot: 'bg-service-dev' },
  wfh:      { label: 'WFH',      cls: 'bg-service-dev/10 text-service-dev border-service-dev/30',          dot: 'bg-service-dev' },
  holiday:  { label: 'Holiday',  cls: 'bg-text-3/10 text-text-3 border-border-default',                   dot: 'bg-text-3' },
}

// leave_types.color is a token slug ('service-dev' etc). Static lookups so Tailwind sees literals.
const LEAVE_COLOR: Record<string, { bar: string; text: string }> = {
  'service-dev':    { bar: 'bg-service-dev',    text: 'text-service-dev' },
  'service-mkt':    { bar: 'bg-service-mkt',    text: 'text-service-mkt' },
  'service-design': { bar: 'bg-service-design', text: 'text-service-design' },
  success:          { bar: 'bg-success',        text: 'text-success' },
  warning:          { bar: 'bg-warning',        text: 'text-warning' },
}
const leaveColor = (c: string | null | undefined) => LEAVE_COLOR[c ?? 'service-dev'] ?? LEAVE_COLOR['service-dev']

const EXC_TYPE: Record<string, { label: string; cls: string }> = {
  late_arrival:    { label: 'Late arrival',    cls: 'bg-warning/10 text-warning border-warning/25' },
  early_departure: { label: 'Early departure', cls: 'bg-service-design/10 text-service-design border-service-design/25' },
  out_of_office:   { label: 'Out of office',   cls: 'bg-service-dev/10 text-service-dev border-service-dev/25' },
}

// Exception/overtime times are 'HH:MM:SS' time-of-day strings → "9:05 AM".
const fmtClock = (t: string | null) => {
  if (!t) return '-'
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
}

const REQ_STATUS: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/25',
  approved: 'bg-success/10 text-success border-success/25',
  rejected: 'bg-error/10 text-error border-error/25',
}

// Internal portal is dark-only; match the ReportsPage Recharts theming.
const CHART_LP = '#FBBF24' // LP / coin-gold — single series, so one hue, no legend
const CHART_AXIS_TICK = { fontSize: 10, fill: '#5A5A5A', fontFamily: 'Poppins, sans-serif' }
const CHART_TOOLTIP = {
  backgroundColor: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, color: '#F2F2F2', fontSize: 12, fontFamily: 'Poppins, sans-serif',
}
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// monthly_lp_history.period is a 'YYYY-MM…' string → "Mon 'YY".
const periodLabel = (period: string) => {
  const [y, m] = period.split('-')
  const mi = Number(m) - 1
  return `${MONTH_ABBR[mi] ?? m} '${y.slice(2)}`
}

const fmtDay = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtShort = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-'

/* ── Small building blocks ─────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, accent }: {
  icon: typeof Zap; label: string; value: string; accent: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3.5 py-2.5">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', accent)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-[18px] font-bold leading-none text-text-1">{value}</p>
        <p className="mt-1 font-ui text-[11px] text-text-3">{label}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, action, children, className }: {
  title: string; icon: typeof Users2; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-border-default bg-surface-1', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-text-1">
          <Icon size={15} className="text-text-3" /> {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="py-2 font-ui text-[12.5px] text-text-4">{label}</p>
}

function ChipRow({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) return <Empty label={emptyLabel} />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <span key={v} className="rounded-xs border border-border-subtle bg-surface-2 px-2 py-0.5 font-ui text-[12px] text-text-1">{v}</span>
      ))}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
type Tab = 'overview' | 'attendance' | 'recognition'

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile: viewer, impersonate } = useAuthContext()
  const [impersonatePending, setImpersonatePending] = useState(false)
  const [editing, setEditing] = useState(false)

  const { data: person, isLoading } = usePerson(id)
  const { data: teams = [] } = usePersonTeams(id)
  const { data: projects = [] } = usePersonProjects(id)
  const { data: tasks = [] } = useTasks(id ? { assigneeId: id } : {})
  const { data: leaderboard = [] } = useLeaderboard()
  const { data: designations = [] } = useDesignations()
  const designationName = person?.designation_id
    ? designations.find((d) => d.id === person.designation_id)?.name ?? null
    : null

  const isSelf = viewer?.id === id
  const canViewAllAttendance = useCanAccess('can_view_all_attendance')
  const canViewTeamAttendance = useCanAccess('can_view_team_attendance')
  const canSeeAnySalary = useCanAccess('can_view_salaries')
  const authority = useAuthority()
  const canImpersonate = useCanImpersonate(person, viewer?.id)
  const canEditAnyProfile = useCanAccess('can_edit_any_profile')
  // The drawer enforces this again field by field; this only decides whether the
  // button is worth showing at all. Editing needs standing over them, and either
  // the profile-editing permission or a rank high enough to set their role.
  const canEditPerson =
    !!person && !isSelf && outranks(authority.myRank, authority.rankOf(person.role))

  const { data: leave = [] } = useLeaveByProfile(id)
  const { data: wfh = [] } = useWfhByProfile(id)
  const canSeeTimeOff =
    isSelf || canViewAllAttendance || (canViewTeamAttendance && (leave.length > 0 || wfh.length > 0))
  const canSeeSalary = isSelf || canSeeAnySalary

  const [tab, setTab] = useState<Tab>('overview')

  const handleImpersonate = async () => {
    if (!person) return
    setImpersonatePending(true)
    try {
      await impersonate(person.id)
      navigate('/my-day')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not impersonate this member', 'error')
      setImpersonatePending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <Topbar title="Member" back />
        <div className="w-full px-4 py-6 lg:px-8 lg:py-7">
          <div className="h-44 animate-pulse rounded-xl border border-border-default bg-surface-inset" />
        </div>
      </div>
    )
  }
  if (!person) {
    return (
      <div className="flex flex-1 flex-col">
        <Topbar title="Member" back />
        <div className="px-4 py-16 text-center font-ui text-[13px] text-text-4">This member could not be found.</div>
      </div>
    )
  }

  const rankIndex = leaderboard.findIndex((e) => e.profile_id === person.id)
  const rank = rankIndex >= 0 ? rankIndex + 1 : null
  const activeTasks = tasks.filter((t) => t.status !== 'completed')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(canSeeTimeOff ? [{ id: 'attendance' as Tab, label: 'Attendance' }] : []),
    { id: 'recognition', label: 'Recognition' },
  ]
  const activeTab: Tab = tabs.some((t) => t.id === tab) ? tab : 'overview'

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title={person.name} back />

      <div className="flex w-full flex-col gap-5 px-4 py-6 lg:px-8 lg:py-7">
        {/* ── Hero ── */}
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
          <div className="h-16 bg-linear-to-r from-brand-red/18 via-service-design/12 to-service-dev/12" />
          <div className="flex flex-col gap-5 px-5 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-9 shrink-0 rounded-full ring-4 ring-surface-1">
                <Avatar name={person.name} src={person.avatar_url ?? undefined} size="xl" />
              </div>
              <div className="min-w-0 pb-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-[22px] font-bold text-text-1">{person.name}</h1>
                  <ProfileRoles profileId={person.id} fallbackRole={person.role} />
                  {!person.is_active && (
                    <span className="rounded-xs border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-4">Inactive</span>
                  )}
                </div>
                {person.job_title && (
                  <p className="mt-1 flex items-center gap-1.5 font-ui text-[13px] text-text-2">
                    <Briefcase size={13} className="text-text-4" /> {person.job_title}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-[12.5px] text-text-3">
                  <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 transition-colors hover:text-text-1"><Mail size={13} className="text-text-4" /> {person.email}</a>
                  {person.phone && <a href={`tel:${person.phone}`} className="flex items-center gap-1.5 transition-colors hover:text-text-1"><Phone size={13} className="text-text-4" /> {person.phone}</a>}
                  {designationName && <span className="flex items-center gap-1.5"><BadgeCheck size={13} className="text-text-4" /> {designationName}</span>}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start lg:self-auto">
              <StartDMButton profileId={person.id} name={person.name} role={person.role} variant="button" />
              {isSelf && (
                <Link to="/profile" className="inline-flex items-center gap-1.5 rounded-sm border border-border-default px-3 py-1.5 font-ui text-[12px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1">
                  <Pencil size={13} /> Edit profile
                </Link>
              )}
              {canEditPerson && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border-default px-3 py-1.5 font-ui text-[12px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
                  title={canEditAnyProfile ? 'Edit role, teams and details' : 'Edit role and teams'}
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              {canImpersonate && (
                <button
                  onClick={handleImpersonate}
                  disabled={impersonatePending}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-brand-red/40 bg-brand-red/10 px-3 py-1.5 font-ui text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/20 disabled:opacity-60"
                  title="Sign in as this member to see the app exactly as they do"
                >
                  {impersonatePending ? <Loader2 size={13} className="animate-spin" /> : <UserCog size={13} />}
                  Log in as {person.name.split(' ')[0]}
                </button>
              )}
            </div>
          </div>
          {/* stat tiles */}
          <div className="grid grid-cols-2 gap-3 border-t border-border-subtle p-4 sm:grid-cols-4">
            <StatTile icon={Trophy} label="Level" value={String(person.level)} accent="bg-coin-gold/12 text-coin-gold" />
            <StatTile icon={Zap} label="Experience" value={person.lp_balance.toLocaleString()} accent="bg-service-mkt/12 text-service-mkt" />
            <StatTile icon={Star} label="Reputation" value={person.reputation_total.toLocaleString()} accent="bg-service-design/12 text-service-design" />
            <StatTile icon={TrendingUp} label="Rank" value={rank ? `#${rank}` : '-'} accent="bg-service-dev/12 text-service-dev" />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 self-start rounded-lg border border-border-default bg-surface-1 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-sm px-4 py-1.5 font-ui text-[13px] font-medium transition-colors',
                activeTab === t.id ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab person={person} teams={teams} projects={projects} tasks={tasks} activeTasks={activeTasks} canSeeSalary={canSeeSalary} isSelf={isSelf} />
        )}
        {activeTab === 'attendance' && canSeeTimeOff && (
          <AttendanceTab personId={person.id} leave={leave} wfh={wfh} />
        )}
        {activeTab === 'recognition' && (
          <RecognitionTab personId={person.id} />
        )}
      </div>

      {editing && <PersonEditDrawer person={person} isSelf={isSelf} onClose={() => setEditing(false)} />}
    </div>
  )
}

/* ── Overview ──────────────────────────────────────────────────────────────── */
function OverviewTab({ person, teams, projects, tasks, activeTasks, canSeeSalary, isSelf }: {
  person: Person
  teams: PersonTeam[]
  projects: PersonProject[]
  tasks: TaskListItem[]
  activeTasks: TaskListItem[]
  canSeeSalary: boolean
  isSelf: boolean
}) {
  const taskList = tasks
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <SectionCard title="About" icon={Users2} className="lg:col-span-2">
        <div className="flex flex-col gap-4">
          {person.bio
            ? <p className="whitespace-pre-line font-ui text-body-sm/relaxed text-text-2">{person.bio}</p>
            : <Empty label="A bio would look great right here. Still nothing, though. Bold choice." />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-text-4">Skills</p>
              <ChipRow items={person.skills} emptyLabel="Nothing here, so the portal is going with “promising newbie, day one”. Add a few to fight back." />
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-text-4">Tech stacks</p>
              <ChipRow items={person.tech_stacks} emptyLabel="Figma, spreadsheets, a camera, a code editor, something goes here. Until then we assume caffeine." />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Teams" icon={Users2}>
        {teams.length === 0 ? <Empty label="Not a member of any team." /> : (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Link key={t.id} to="/teams" className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-3 py-1 font-ui text-[12.5px] text-text-1 transition-colors hover:border-border-default">
                {t.name}{t.is_lead && <span className="font-mono text-[9.5px] uppercase tracking-wide text-brand-red">Lead</span>}
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Projects" icon={FolderKanban} action={<span className="font-mono text-[11px] text-text-4">{projects.length}</span>}>
        {projects.length === 0 ? <Empty label="Not on any projects." /> : (
          <div className="-my-2 flex flex-col divide-y divide-border-subtle">
            {projects.map((p) => (
              <Link key={p.project_service_id} to={`/projects/${p.id}`} className="group flex items-center gap-3 py-2.5">
                <ServiceChip service={p.service_type} />
                <span className="min-w-0 flex-1 truncate font-ui text-[13px] text-text-1 transition-colors group-hover:text-brand-red">{p.name}</span>
                <StatusChip status={p.status} type="project" />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Tasks" icon={ListChecks} className="lg:col-span-2" action={<span className="font-mono text-[11px] text-text-4">{activeTasks.length} open · {taskList.length} total</span>}>
        {taskList.length === 0 ? <Empty label="Not a single task assigned. Enjoy this rare and fragile moment." /> : (
          <div className="-my-2 flex flex-col divide-y divide-border-subtle">
            {taskList.slice(0, 12).map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="group flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-ui text-[13px] text-text-1 transition-colors group-hover:text-brand-red">{t.title}</span>
                {t.project && <span className="hidden max-w-40 shrink-0 truncate font-mono text-[11px] text-text-4 sm:inline">{t.project.name}</span>}
                <StatusChip status={t.status} />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {canSeeSalary && (
        <SectionCard title="Compensation" icon={Lock} className="lg:col-span-2">
          <SalaryCard profileId={person.id} context={isSelf ? 'self' : 'admin'} />
        </SectionCard>
      )}
    </div>
  )
}

/* ── Attendance ────────────────────────────────────────────────────────────── */
function AttendanceTab({ personId, leave, wfh }: {
  personId: string
  leave: LeaveRequestWithType[]
  wfh: WfhRequest[]
}) {
  const mf = useMonthFilter()
  const { data: records = [] } = useAttendanceByProfileMonth(personId, mf.year, mf.month)

  // Whole days, each counter counting the days it describes and nothing else.
  // These used to be weighted, a worked half day scoring 0.5 to the attendance
  // side and 0.5 to the leave side so the counters summed to the month. Turning
  // up is not divisible: somebody who worked a half day was present, not half
  // present, and "Present 18.5" describes nobody. The counters no longer sum to
  // anything, and should not — a half day that was worked is one present day and
  // one half day, because both are true of it.
  const tally = (() => {
    const t = { present: 0, late: 0, absent: 0, leave: 0, wfh: 0, half_day: 0 }
    for (const r of records) {
      const isLeave = r.day_type === 'leave'
      const isWfh = r.day_type === 'wfh'
      const isPartial = (isLeave || isWfh) && r.day_part !== 'full'
      if (isLeave) t[isPartial ? 'half_day' : 'leave'] += 1
      else if (isWfh) t.wfh += 1

      if (r.status === 'present') t.present += 1
      else if (r.status === 'late') t.late += 1
      else if (r.status === 'absent') t.absent += 1
    }
    return t
  })()

  const attended = tally.present + tally.late + tally.wfh
  const expected = attended + tally.absent
  const rate = expected > 0 ? Math.round((attended / expected) * 100) : null

  const { data: balances = [] } = useLeaveBalancesByProfile(personId)
  const totalRemaining = balances.reduce((s, b) => s + b.remaining, 0)
  const totalAllowed = balances.reduce((s, b) => s + b.type.days_allowed, 0)

  const summary = [
    { label: 'Present',  value: String(tally.present),  dot: 'bg-success',        text: 'text-success' },
    { label: 'Late',     value: String(tally.late),     dot: 'bg-warning',        text: 'text-warning' },
    { label: 'Absent',   value: String(tally.absent),   dot: 'bg-error',          text: 'text-error' },
    { label: 'Leave',    value: String(tally.leave),    dot: 'bg-service-dev',    text: 'text-service-dev' },
    { label: 'WFH',      value: String(tally.wfh),      dot: 'bg-service-dev',    text: 'text-service-dev' },
    { label: 'Half day', value: String(tally.half_day), dot: 'bg-service-design', text: 'text-service-design' },
  ]

  const { data: exceptions = [] } = useExceptionsByProfile(personId)
  const { data: overtime = [] } = useOvertimeByProfile(personId)

  const monthLeave = leave.filter((l) => mf.inMonth(l.start_date))
  // A WFH range straddling a month boundary shows in both months.
  const monthWfh = wfh.filter((w) => mf.inMonth(w.start_date) || mf.inMonth(w.end_date))
  const monthExc = exceptions.filter((e) => mf.inMonth(e.date))
  const monthOt = overtime.filter((o) => mf.inMonth(o.date))

  return (
    <div className="flex flex-col gap-5">
      {/* Month filter — right-aligned, controls the whole tab */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <MonthStepper filter={mf} hideAllMonths />
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border-default bg-surface-1 p-3.5 transition-colors hover:border-border-strong">
            <div className="mb-2 flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', s.dot)} />
              <span className="font-ui text-[11px] text-text-3">{s.label}</span>
            </div>
            <p className={cn('font-display text-[24px] font-bold leading-none', s.text)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Attendance records */}
        <SectionCard
          title="Attendance history"
          icon={CalendarDays}
          className="lg:col-span-2"
          action={rate !== null ? <span className="font-mono text-[11px] text-text-4">{records.length} days · {mf.label}</span> : undefined}
        >
          {rate !== null && (
            <div className="mb-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                <div className="h-full rounded-full bg-success" style={{ width: `${rate}%` }} />
              </div>
              <span className="font-mono text-[12px] font-semibold text-text-2">{rate}% present</span>
            </div>
          )}
          {records.length === 0 ? <Empty label="This month's clock-ins are missing, presumed on holiday somewhere warm." /> : (
            <div className="-mx-5 -mb-5 divide-y divide-border-subtle border-t border-border-subtle">
              {records.map((r) => {
                const meta = r.status ? ATT_STATUS[r.status] : undefined
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2/40">
                    <span className={cn('size-2 shrink-0 rounded-full', meta?.dot ?? 'bg-text-4')} />
                    <span className="w-32 shrink-0 font-ui text-[12.5px] font-medium text-text-1">{fmtShort(r.date)}</span>
                    <AttendanceChips facts={r} />
                    <span className="ml-auto font-mono text-[11.5px] text-text-3">
                      {fmtTime(r.check_in)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Leave balance / holidays */}
        <SectionCard title="Leave balance" icon={Palmtree}>
          <div className="mb-4 rounded-lg border border-border-subtle bg-surface-2/40 p-4 text-center">
            <p className="font-display text-[28px] font-bold leading-none text-text-1">
              {totalRemaining}<span className="font-ui text-[16px] font-medium text-text-4"> / {totalAllowed}</span>
            </p>
            <p className="mt-1.5 font-ui text-[11.5px] text-text-3">Holiday days remaining this year</p>
          </div>
          {balances.length === 0 ? <Empty label="HR hasn't set up a single leave type. Unlimited holidays? Almost certainly not." /> : (
            <div className="flex flex-col gap-3.5">
              {balances.map((b) => {
                const c = leaveColor(b.type.color)
                const pct = b.type.days_allowed > 0 ? Math.min(100, (b.used / b.type.days_allowed) * 100) : 0
                return (
                  <div key={b.type.id}>
                    <div className="flex items-center justify-between font-ui text-[12px]">
                      <span className="text-text-1">{b.type.name}</span>
                      <span className="font-mono text-text-3">
                        <span className={cn('font-semibold', c.text)}>{b.remaining}</span> / {b.type.days_allowed} left
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-inset">
                      <div className={cn('h-full rounded-full', c.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Leave requests" icon={Plane} action={<span className="font-mono text-[11px] text-text-4">{mf.label}</span>}>
          {monthLeave.length === 0 ? <Empty label="Not one day off this month. Even the office plants get a weekend." /> : (
            <div className="flex flex-col gap-2.5">
              {monthLeave.map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[12.5px] text-text-1">
                      {l.leave_types?.name ?? 'Leave'} · {fmtDay(l.start_date)}{l.end_date !== l.start_date ? ` – ${fmtDay(l.end_date)}` : ''}
                    </p>
                    {l.reason && <p className="wrap-break-word font-ui text-[11.5px] text-text-4">{l.reason}</p>}
                  </div>
                  <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize', REQ_STATUS[l.status] ?? REQ_STATUS.pending)}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="WFH requests" icon={Home} action={<span className="font-mono text-[11px] text-text-4">{mf.label}</span>}>
          {monthWfh.length === 0 ? <Empty label="Zero days worked from home this month. Office chair 1, sofa 0." /> : (
            <div className="flex flex-col gap-2.5">
              {monthWfh.map((w) => (
                <div key={w.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[12.5px] text-text-1">
                      {fmtDay(w.start_date)}{w.end_date !== w.start_date ? ` – ${fmtDay(w.end_date)}` : ''}
                      {w.day_part !== 'full' && ` · ${DAY_PART_LABEL[w.day_part]}`}
                    </p>
                    {w.reason && <p className="wrap-break-word font-ui text-[11.5px] text-text-4">{w.reason}</p>}
                  </div>
                  <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize', REQ_STATUS[w.status] ?? REQ_STATUS.pending)}>{w.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Exceptions" icon={AlertCircle} action={<span className="font-mono text-[11px] text-text-4">{mf.label}</span>}>
          {monthExc.length === 0 ? <Empty label="A completely clean sheet this month. Suspiciously clean. We're impressed and slightly wary." /> : (
            <div className="flex flex-col gap-2.5">
              {monthExc.map((e) => {
                const t = EXC_TYPE[e.exception_type]
                return (
                  <div key={e.id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-ui text-[12.5px] text-text-1">
                        <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold', t?.cls ?? 'border-border-default text-text-3')}>{t?.label ?? e.exception_type}</span>
                        <span className="truncate">{fmtDay(e.date)}</span>
                      </p>
                      <p className="font-ui text-[11.5px] text-text-4">
                        {fmtClock(e.requested_time)}{e.return_time ? ` → ${fmtClock(e.return_time)}` : ''}
                      </p>
                      {e.reason && <p className="wrap-break-word font-ui text-[11.5px] text-text-4">{e.reason}</p>}
                    </div>
                    <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize', REQ_STATUS[e.status] ?? REQ_STATUS.pending)}>{e.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Overtime" icon={Hourglass} action={<span className="font-mono text-[11px] text-text-4">{mf.label}</span>}>
          {monthOt.length === 0 ? <Empty label="Not one extra minute clocked this month. Work-life balance, spotted in the wild." /> : (
            <div className="flex flex-col gap-2.5">
              {monthOt.map((o) => (
                <div key={o.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[12.5px] text-text-1">
                      {fmtDay(o.date)} · <span className="font-mono text-text-3">{fmtClock(o.start_time)} – {fmtClock(o.end_time)}</span>
                    </p>
                    {o.reason && <p className="wrap-break-word font-ui text-[11.5px] text-text-4">{o.reason}</p>}
                  </div>
                  <span className="shrink-0 font-display text-[14px] font-bold text-service-mkt">{formatHoursMinutes(o.hours)}</span>
                  <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize', REQ_STATUS[o.status] ?? REQ_STATUS.pending)}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

/* ── Recognition ───────────────────────────────────────────────────────────── */
function RecognitionTab({ personId }: { personId: string }) {
  const { data: badgeAwards = [] } = useMyBadgeAwards(personId)
  const { data: badges = [] } = useBadges()
  const { data: claims = [] } = useMyClaims(personId)
  const { data: quests = [] } = useAllQuestTasks()
  const { data: shoutouts = [] } = useApprovedShoutouts()
  const { data: xp = [] } = useXpTransactions(personId)
  const { data: lpHistory = [] } = useMyLpHistory(personId)
  const { data: directory = {} } = useProfileDirectory()

  // Oldest → newest for the time axis.
  const lpTrend = [...lpHistory].reverse().map((h) => ({ period: periodLabel(h.period), lp: h.lp_final }))

  const badgeById = new Map(badges.map((b) => [b.id, b]))
  const questById = new Map(quests.map((q) => [q.id, q]))
  const nameOf = (pid: string) => directory[pid]?.name ?? 'Someone'

  const received = shoutouts.filter((s) => s.to_profile_id === personId)
  const given = shoutouts.filter((s) => s.from_profile_id === personId)
  const questsDone = claims.filter((c) => c.status === 'approved')

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Monthly LP trend */}
      <SectionCard title="Monthly LP trend" icon={TrendingUp} className="lg:col-span-2" action={<span className="font-mono text-[11px] text-text-4">last {lpTrend.length || 12} mo</span>}>
        {lpTrend.length === 0 ? <Empty label="Nothing to plot yet. A month has to actually finish before this chart gets interesting." /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={lpTrend} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="period" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="lp" name="LP earned" fill={CHART_LP} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Awards / badges */}
      <SectionCard title="Awards" icon={Award} action={<span className="font-mono text-[11px] text-text-4">{badgeAwards.length}</span>}>
        {badgeAwards.length === 0 ? <Empty label="The trophy shelf is empty, gleaming, and aggressively dust-free." /> : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {badgeAwards.map((a) => {
              const b = badgeById.get(a.badge_id)
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-2.5">
                  <span className="text-[26px] leading-none">{b?.icon ?? '🏅'}</span>
                  <div className="min-w-0">
                    <p className="truncate font-ui text-[12.5px] font-semibold text-text-1">{b?.name ?? 'Badge'}</p>
                    <p className="font-mono text-[10.5px] text-text-4">{fmtDay(a.awarded_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Quests */}
      <SectionCard title="Quests" icon={Target} action={<span className="font-mono text-[11px] text-text-4">{questsDone.length} done</span>}>
        {claims.length === 0 ? <Empty label="Not one quest claimed. The quest board just sits there, waiting, judging quietly." /> : (
          <div className="flex flex-col gap-2.5">
            {claims.slice(0, 10).map((c) => {
              const q = questById.get(c.task_id)
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[12.5px] text-text-1">{q?.title ?? 'Quest'}</p>
                    <p className="font-mono text-[10.5px] text-text-4">{formatRelativeTime(c.claimed_at)}</p>
                  </div>
                  {(c.lp_awarded ?? q?.lp_value) != null && (
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] font-semibold text-coin-gold"><Zap size={11} /> {c.lp_awarded ?? q?.lp_value}</span>
                  )}
                  <span className={cn('shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize', REQ_STATUS[c.status] ?? REQ_STATUS.pending)}>{c.status}</span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Shoutouts */}
      <SectionCard title="Shoutouts" icon={Megaphone} className="lg:col-span-2" action={<span className="font-mono text-[11px] text-text-4">{received.length} received · {given.length} given</span>}>
        {received.length === 0 && given.length === 0 ? <Empty label="Total silence in here. Not one shoutout. Somebody go be nice about it." /> : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-4">Received</p>
              {received.length === 0 ? <Empty label="None received." /> : (
                <div className="flex flex-col gap-2.5">
                  {received.slice(0, 6).map((s) => (
                    <div key={s.id} className="rounded-lg border border-border-subtle bg-surface-2/40 p-3">
                      <p className="font-ui text-[12.5px] text-text-1">“{s.message}”</p>
                      <p className="mt-1.5 flex items-center gap-1 font-ui text-[11px] text-text-4">
                        <ArrowDownRight size={12} className="text-success" /> from <PersonLink personId={s.from_profile_id} className="text-text-3">{nameOf(s.from_profile_id)}</PersonLink> · {s.category}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-4">Given</p>
              {given.length === 0 ? <Empty label="None given." /> : (
                <div className="flex flex-col gap-2.5">
                  {given.slice(0, 6).map((s) => (
                    <div key={s.id} className="rounded-lg border border-border-subtle bg-surface-2/40 p-3">
                      <p className="font-ui text-[12.5px] text-text-1">“{s.message}”</p>
                      <p className="mt-1.5 flex items-center gap-1 font-ui text-[11px] text-text-4">
                        <ArrowUpRight size={12} className="text-service-mkt" /> to <PersonLink personId={s.to_profile_id} className="text-text-3">{nameOf(s.to_profile_id)}</PersonLink> · {s.category}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Points timeline */}
      <SectionCard title="Points timeline" icon={History} className="lg:col-span-2">
        {xp.length === 0 ? <Empty label="A ledger of pure, untouched potential. Zero, in other words." /> : (
          <div className="-my-1.5 flex flex-col divide-y divide-border-subtle">
            {xp.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', t.amount >= 0 ? 'bg-success/12 text-success' : 'bg-error/12 text-error')}>
                  {t.amount >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>
                <span className="min-w-0 flex-1 wrap-break-word font-ui text-[12.5px] text-text-2">{t.reason}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-text-4">{formatRelativeTime(t.created_at)}</span>
                <span className={cn('w-14 shrink-0 text-right font-mono text-[12px] font-semibold', t.amount >= 0 ? 'text-success' : 'text-error')}>
                  {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
