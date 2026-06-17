import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Topbar } from './Topbar'

export interface HubRowItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
  description?: string
}

// A large tappable list row that pushes a stack screen.
export function HubRow({ to, label, icon: Icon, badge, description }: HubRowItem) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 min-h-14 px-4 py-3 bg-surface-1 border border-border-default rounded-lg transition-colors active:bg-surface-2"
    >
      <span className="size-9 shrink-0 rounded-md bg-surface-2 flex items-center justify-center text-text-2">
        <Icon size={18} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-ui font-semibold text-[14px] text-text-1 truncate">{label}</span>
        {description && <span className="block font-ui text-[12px] text-text-3 truncate">{description}</span>}
      </span>
      {badge ? (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-red text-white text-[11px] font-bold flex items-center justify-center shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
      <ChevronRight size={16} className="text-text-4 shrink-0" />
    </Link>
  )
}

interface MobileHubProps {
  title: string
  items: HubRowItem[]
  // Optional content rendered above the list (e.g. the attendance check-in card).
  children?: ReactNode
}

// A bottom-tab destination that lists its sections as rows → stack screens.
export function MobileHub({ title, items, children }: MobileHubProps) {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title={title} />
      <div className="px-4 py-5 flex flex-col gap-3 w-full max-w-content mx-auto">
        {children}
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <HubRow key={item.to} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}
