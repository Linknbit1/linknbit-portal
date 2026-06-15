import { Link } from 'react-router-dom'
import { CalendarCheck, Trophy, Users, UserCog, Settings, ArrowRight } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { useAuthContext } from '../context/AuthContext'
import { isAuthoritative } from '../lib/roles'
import { showWipFeatures } from '../lib/featureFlags'
import { cn } from '../lib/cn'
import AdminDashboardPage from './admin/DashboardPage'
import EmployeeDashboardPage from './employee/DashboardPage'

interface QuickLink {
  label: string
  description: string
  to: string
  icon: typeof CalendarCheck
}

const ProductionDashboard = ({ name, authoritative }: { name: string; authoritative: boolean }) => {
  const links: QuickLink[] = [
    { label: 'Attendance', description: 'Check in, view your attendance history and requests.', to: '/attendance', icon: CalendarCheck },
    { label: 'Leaderboard & Rewards', description: 'Track your reputation points and redeem rewards.', to: '/gamification', icon: Trophy },
    ...(authoritative
      ? [
          { label: 'People', description: 'Manage the team directory, roles, and access.', to: '/people', icon: UserCog },
          { label: 'Teams', description: 'View and organise teams across services.', to: '/teams', icon: Users },
        ]
      : []),
    { label: 'Settings', description: 'Manage your preferences and notifications.', to: '/settings', icon: Settings },
  ]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />
      <div className="p-7 flex flex-col gap-6 max-w-content mx-auto w-full">
        <div>
          <h2 className="font-display font-bold text-[22px] text-text-1 tracking-tight">
            Welcome back{name ? `, ${name.split(' ')[0]}` : ''}.
          </h2>
          <p className="font-ui text-[13.5px] text-text-3 mt-1">
            {authoritative
              ? 'Your operations workspace. More insights will appear here as projects and tasks come online.'
              : 'Your workspace. More insights will appear here as your projects and tasks come online.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map(({ label, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'group bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-3',
                'hover:border-border-strong hover:bg-surface-2 transition-colors',
              )}
            >
              <span className="w-9 h-9 rounded-md bg-surface-2 border border-border-subtle flex items-center justify-center text-brand-red">
                <Icon size={18} />
              </span>
              <div>
                <p className="font-display font-semibold text-[15px] text-text-1">{label}</p>
                <p className="font-ui text-[12.5px] text-text-3 mt-1 leading-snug">{description}</p>
              </div>
              <span className="mt-auto flex items-center gap-1 text-[12px] font-ui font-semibold text-text-3 group-hover:text-text-1 transition-colors">
                Open <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuthContext()
  const authoritative = isAuthoritative(profile?.role)

  // In development show the full (currently mock-backed) dashboards so the team can
  // build against them. In production those are entirely static, so show a clean
  // welcome with live navigation only — no placeholder metrics.
  if (showWipFeatures) {
    return authoritative ? <AdminDashboardPage /> : <EmployeeDashboardPage />
  }

  return <ProductionDashboard name={profile?.name ?? ''} authoritative={authoritative} />
}
