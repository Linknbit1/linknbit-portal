import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { visibleNavItems } from './navItems'
import { LinknbitMark } from '../brand/LinknbitLogo'
import { InstallAppButton } from '../pwa/InstallAppButton'

export function Sidebar() {
  const location = useLocation()
  const { profile } = useAuthContext()
  const navItems = visibleNavItems(profile?.role)

  return (
    <aside className="w-sidebar-expanded bg-surface-1 border-r border-border-default hidden lg:flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-border-subtle">
        <LinknbitMark surface="dark" className="h-8 w-7 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-body-sm/tight text-text-1">Linknbit</p>
          <p className="font-mono text-[9px] text-text-4 uppercase tracking-wider mt-0.5">Operations Portal</p>
        </div>
        <button className="size-5 rounded flex items-center justify-center text-text-4 hover:text-text-2 hover:bg-surface-2 transition-colors">
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 pb-2 flex flex-col gap-px">
        <p className="text-[10px] font-ui font-semibold text-text-4 uppercase tracking-widest p-2">
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-sm font-ui font-medium text-body-sm transition-colors relative',
                isActive
                  ? 'bg-brand-red/13 text-white nav-active-indicator'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
              )}
            >
              <item.icon
                size={16}
                className={cn('shrink-0', isActive ? 'text-brand-red' : 'text-text-3')}
              />
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

      {/* Install app (shown only when installable) */}
      <div className="px-3 pb-3 pt-1">
        <InstallAppButton />
      </div>
    </aside>
  )
}
