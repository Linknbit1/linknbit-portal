import { useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  X,
  FileText,
  GitBranch,
  Settings,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  LayoutDashboard,
  FolderOpen,
  BarChart2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { APPROVALS } from '../../data/mock'
import { formatRelativeTime } from '../../lib/utils'
import { useClickOutside } from '../../hooks/useClickOutside'
import { LinknbitMark } from '../brand/LinknbitLogo'

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } },
}

const CLIENT_NOTIFICATIONS = [
  {
    id: 'cn1',
    type: 'file' as const,
    message: 'Sara Qureshi uploaded "CS_UI_Designs_v3.fig"',
    project: 'Cricket Sansar Brand Identity',
    time: '2026-05-10T14:00:00',
    read: false,
  },
  {
    id: 'cn2',
    type: 'approval' as const,
    message: 'Stage approval needed: API Documentation v2 review',
    project: 'Cricket Sansar App',
    time: '2026-05-11T10:00:00',
    read: false,
  },
  {
    id: 'cn3',
    type: 'stage' as const,
    message: 'Cricket Sansar App moved to Internal QA stage',
    project: 'Cricket Sansar App',
    time: '2026-05-08T09:00:00',
    read: false,
  },
  {
    id: 'cn4',
    type: 'approved' as const,
    message: 'You approved the Wireframing stage',
    project: 'Cricket Sansar Brand Identity',
    time: '2026-05-06T11:00:00',
    read: true,
  },
  {
    id: 'cn5',
    type: 'comment' as const,
    message: 'Ahmad Karimi left a comment on API Documentation',
    project: 'Cricket Sansar App',
    time: '2026-05-12T09:00:00',
    read: true,
  },
]

interface ClientNavItem {
  label: string
  shortLabel: string
  to: string
  icon: LucideIcon
  badgeKey?: 'approvals'
}

const CLIENT_NAV: ClientNavItem[] = [
  { label: 'Dashboard', shortLabel: 'Home', to: '/client/dashboard', icon: LayoutDashboard },
  { label: 'My Projects', shortLabel: 'Projects', to: '/client/projects', icon: FolderOpen },
  { label: 'Approvals', shortLabel: 'Approvals', to: '/client/approvals', icon: CheckCircle2, badgeKey: 'approvals' },
  { label: 'Files & Deliverables', shortLabel: 'Files', to: '/client/files', icon: FileText },
  { label: 'Reports', shortLabel: 'Reports', to: '/client/reports', icon: BarChart2 },
]

export function ClientShell() {
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useClickOutside(notifRef, () => setNotifOpen(false))
  useClickOutside(profileRef, () => setProfileOpen(false))

  const pendingApprovals = APPROVALS.filter((a) => a.status === 'pending').length
  const unreadCount = CLIENT_NOTIFICATIONS.filter((n) => !n.read && !dismissed.has(n.id)).length

  const notifIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText size={13} style={{ color: '#7A3FD9' }} />
      case 'approval':
        return <AlertCircle size={13} style={{ color: '#EE2737' }} />
      case 'approved':
        return <CheckCircle2 size={13} style={{ color: '#1F9D55' }} />
      case 'comment':
        return <MessageSquare size={13} style={{ color: '#0E8B9A' }} />
      default:
        return <GitBranch size={13} style={{ color: '#877F71' }} />
    }
  }

  const handleBellClick = () => {
    if (!notifOpen) {
      setDismissed(new Set(CLIENT_NOTIFICATIONS.map((n) => n.id)))
    }
    setNotifOpen((v) => !v)
    setProfileOpen(false)
  }

  const handleProfileClick = () => {
    setProfileOpen((v) => !v)
    setNotifOpen(false)
  }

  return (
    <div className="client-portal min-h-screen bg-client-bg font-ui" style={{ color: '#1A1612' }}>
      {/* ── Top navigation ── */}
      <header className="bg-client-surface border-b border-client-border sticky top-0 z-40 pt-safe">
       <div className="h-client-topbar flex items-center px-4 lg:px-10 gap-4 lg:gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <LinknbitMark surface="light" className="h-9 w-8" />
          <div>
            <p className="font-display font-bold text-body-lg/tight tracking-tight" style={{ color: '#1A1612' }}>
              Linknbit
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest mt-px" style={{ color: '#B7AE9D' }}>
              Client Portal
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 shrink-0 hidden lg:block" style={{ background: '#EAE3D6' }} />

        {/* Nav (desktop) */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {CLIENT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative px-3.5 py-2 rounded-md font-medium text-[14px] transition-all flex items-center gap-1.5',
                  isActive
                    ? 'font-semibold'
                    : 'hover:bg-client-bg-alt',
                )
              }
              style={({ isActive }) => ({
                color: isActive ? '#1A1612' : '#4F4940',
              })}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {item.badgeKey === 'approvals' && pendingApprovals > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-px rounded-full text-white"
                      style={{ background: '#EE2737' }}
                    >
                      {pendingApprovals}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-3.5 h-0.5 rounded-full"
                      style={{ background: '#EE2737' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2.5">
          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleBellClick}
              className={cn(
                'relative size-9 rounded-lg flex items-center justify-center transition-colors',
                notifOpen ? 'bg-client-bg-alt' : 'hover:bg-client-bg-alt',
              )}
              style={{ color: '#4F4940' }}
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-client-surface"
                  style={{ background: '#EE2737' }}
                />
              )}
            </button>

            {/* Notification dropdown */}
            <AnimatePresence>
            {notifOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="absolute right-0 top-full mt-2.5 rounded-2xl border shadow-xl z-50 overflow-hidden"
                style={{ background: '#FFFFFF', borderColor: '#EAE3D6', width: '340px' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: '#EAE3D6' }}
                >
                  <h3 className="font-display font-bold text-[15px]" style={{ color: '#1A1612' }}>
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount === 0 && (
                      <span className="text-[11px]" style={{ color: '#B7AE9D' }}>
                        All caught up
                      </span>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="size-6 flex items-center justify-center rounded-md transition-colors hover:bg-client-bg-alt"
                      style={{ color: '#877F71' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="divide-y" style={{ borderColor: '#F2EDE4' }}>
                  {CLIENT_NOTIFICATIONS.map((n) => {
                    const isNew = !n.read && !dismissed.has(n.id)
                    return (
                      <div
                        key={n.id}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-client-bg cursor-pointer"
                        style={isNew ? { background: 'rgba(251,191,36,0.04)' } : {}}
                      >
                        <div
                          className="size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: '#F2EDE4' }}
                        >
                          {notifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm/snug" style={{ color: '#1A1612' }}>
                            {n.message}
                          </p>
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: '#B7AE9D' }}>
                            {n.project} · {formatRelativeTime(n.time)}
                          </p>
                        </div>
                        {isNew && (
                          <div
                            className="size-2 rounded-full shrink-0 mt-1.5"
                            style={{ background: '#EE2737' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div
                  className="px-4 py-2.5 border-t text-center"
                  style={{ borderColor: '#EAE3D6' }}
                >
                  <button
                    className="text-[12px] font-semibold transition-colors hover:opacity-70"
                    style={{ color: '#EE2737' }}
                  >
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Profile button */}
          <div ref={profileRef} className="relative">
            <button
              onClick={handleProfileClick}
              className={cn(
                'flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all',
                profileOpen ? 'shadow-sm' : 'hover:shadow-sm',
              )}
              style={{ background: '#F2EDE4', borderColor: '#EAE3D6' }}
            >
              <span
                className="size-7 rounded-full bg-linear-to-br from-amber-400 to-amber-600 font-bold text-[11px] flex items-center justify-center shrink-0"
                style={{ color: '#78350F' }}
              >
                IS
              </span>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="font-semibold text-[13px]" style={{ color: '#1A1612' }}>
                  Imran Shah
                </span>
                <span
                  className="font-mono text-[9px] uppercase tracking-wider mt-0.5 flex items-center gap-1"
                  style={{ color: '#FBBF24' }}
                >
                  <span
                    className="size-1.5 rounded-full inline-block"
                    style={{ background: '#FBBF24' }}
                  />
                  Client Owner
                </span>
              </div>
              <ChevronDown
                size={13}
                className={cn('transition-transform ml-0.5 hidden sm:block', profileOpen && 'rotate-180')}
                style={{ color: '#B7AE9D' }}
              />
            </button>

            {/* Profile dropdown */}
            <AnimatePresence>
            {profileOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="absolute right-0 top-full mt-2.5 w-56 rounded-2xl border shadow-xl z-50 overflow-hidden"
                style={{ background: '#FFFFFF', borderColor: '#EAE3D6' }}
              >
                {/* User info */}
                <div
                  className="px-4 py-3.5 border-b"
                  style={{ borderColor: '#F2EDE4' }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="size-9 rounded-full bg-linear-to-br from-amber-400 to-amber-600 font-bold text-[12px] flex items-center justify-center shrink-0"
                      style={{ color: '#78350F' }}
                    >
                      IS
                    </span>
                    <div>
                      <p className="font-semibold text-[13px]" style={{ color: '#1A1612' }}>
                        Imran Shah
                      </p>
                      <p className="text-[11px]" style={{ color: '#877F71' }}>
                        Cricket Sansar
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono" style={{ color: '#B7AE9D' }}>
                    imran@cricketsansar.com
                  </p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {[
                    { icon: User, label: 'My Account', to: '/client/account' },
                    { icon: Settings, label: 'Settings', to: '/client/settings' },
                    { icon: HelpCircle, label: 'Help & Support', to: '/client/help' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setProfileOpen(false)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-client-bg text-left"
                    >
                      <item.icon size={15} style={{ color: '#877F71' }} />
                      <p className="text-[13px] font-medium" style={{ color: '#1A1612' }}>
                        {item.label}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="border-t py-1" style={{ borderColor: '#F2EDE4' }}>
                  <button
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/login')
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-red-50 text-left"
                  >
                    <LogOut size={15} style={{ color: '#EE2737' }} />
                    <span className="text-[13px] font-medium" style={{ color: '#EE2737' }}>
                      Sign Out
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
       </div>
      </header>

      {/* Content */}
      <main className="max-w-content-client mx-auto px-4 lg:px-10 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom tab bar (mobile) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-client-surface border-t border-client-border flex items-stretch pb-safe"
        aria-label="Primary"
      >
        {CLIENT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 font-medium text-[10.5px]"
            style={({ isActive }) => ({ color: isActive ? '#EE2737' : '#4F4940' })}
          >
            <span className="relative">
              <item.icon size={20} />
              {item.badgeKey === 'approvals' && pendingApprovals > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 text-[9px] font-bold px-1 rounded-full text-white leading-tight"
                  style={{ background: '#EE2737' }}
                >
                  {pendingApprovals}
                </span>
              )}
            </span>
            {item.shortLabel}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
