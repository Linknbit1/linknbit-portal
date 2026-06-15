import { NavLink, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { visibleNavItems } from './navItems'

interface BottomTabBarProps {
  onMore: () => void
}

/** Mobile primary navigation. Hidden at lg+ where the sidebar takes over. */
export function BottomTabBar({ onMore }: BottomTabBarProps) {
  const location = useLocation()
  const { profile } = useAuthContext()
  const primary = visibleNavItems(profile?.role).filter((i) => i.primaryMobile)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-surface-1/95 backdrop-blur border-t border-border-default flex items-stretch pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      {primary.map((item) => {
        const isActive = location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 font-ui font-medium text-[10.5px] transition-colors',
              isActive ? 'text-brand-red' : 'text-text-3 hover:text-text-1',
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
      <button
        onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 font-ui font-medium text-[10.5px] text-text-3 hover:text-text-1 transition-colors"
        aria-label="More navigation"
      >
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  )
}
