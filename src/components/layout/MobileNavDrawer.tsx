import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, LogOut } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from '../shared/RoleBadge'
import { useAuthContext } from '../../context/AuthContext'
import { toUserRole } from '../../lib/peopleAccess'
import { visibleNavItems } from './navItems'
import { InstallAppButton } from '../pwa/InstallAppButton'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

/** Full navigation + account actions as a left slide-in drawer (mobile only). */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthContext()
  const navItems = visibleNavItems(profile?.role)

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleLogout = async () => {
    onClose()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-55 flex lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="relative flex flex-col w-full bg-surface-1 shadow-pop pb-[env(safe-area-inset-bottom)]"
          >
            {/* Brand + close */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-border-subtle">
              <span className="size-7 rounded-sm bg-brand-red flex items-center justify-center">
                <svg viewBox="0 0 41 45" width="20" height="20" fill="none">
                  <rect x="0" y="3.5" width="10.5" height="10.5" rx="0.4" fill="white" />
                  <rect x="0" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
                  <rect x="15" y="3.5" width="10.5" height="25.9" rx="0.4" fill="white" />
                  <rect x="15" y="33.9" width="10.5" height="10.5" rx="0.4" fill="white" />
                  <rect x="30.4" y="3.5" width="10.5" height="10.5" rx="0.4" fill="#EE2737" />
                  <rect x="30.4" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-body-sm/tight text-text-1">Linknbit</p>
                <p className="font-mono text-[9px] text-text-2 uppercase tracking-wider mt-0.5">Operations Portal</p>
              </div>
              <button
                onClick={onClose}
                className="size-7 rounded-md flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col gap-px">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.to)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-sm font-ui font-medium text-body-sm transition-colors relative',
                      isActive
                        ? 'bg-brand-red/13 text-white nav-active-indicator'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                    )}
                  >
                    <item.icon size={16} className={cn('shrink-0', isActive ? 'text-brand-red' : 'text-text-3')} />
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-full leading-tight">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            {/* Account */}
            {profile && (
              <div className="border-t border-border-subtle p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2.5 p-2">
                  <Avatar name={profile.name} src={profile.avatar_url ?? undefined} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-body-sm/tight text-text-1 truncate">{profile.name}</p>
                    <RoleBadge role={toUserRole(profile.role)} size="sm" className="mt-0.5" />
                  </div>
                </div>
                <InstallAppButton />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm font-ui font-medium text-body-sm text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
