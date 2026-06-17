import { NavLink, useLocation } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { visibleNavItems } from './navItems'

/** Mobile primary navigation. Hidden at lg+ where the sidebar takes over. */
export function BottomTabBar() {
  const location = useLocation()
  const { profile } = useAuthContext()
  const primary = visibleNavItems(profile?.role).filter((i) => i.primaryMobile)
  const moreActive = location.pathname.startsWith('/more') || location.pathname.startsWith('/profile')

  const itemCls = (active: boolean) =>
    cn(
      'flex-1 flex flex-col items-center justify-center gap-1 py-2 font-ui font-medium text-[10.5px] transition-colors',
      active ? 'text-brand-red' : 'text-text-3 hover:text-text-1',
    )

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-surface-1/95 backdrop-blur border-t border-border-default flex items-stretch pb-safe"
      aria-label="Primary"
    >
      {primary.map((item) => (
        <NavLink key={item.to} to={item.to} className={itemCls(location.pathname.startsWith(item.to))}>
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <NavLink to="/more" className={itemCls(moreActive)} aria-label="More">
        <MoreHorizontal size={20} />
        <span>More</span>
      </NavLink>
    </nav>
  )
}
