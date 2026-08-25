import { NavLink } from 'react-router-dom'
import { Pin, X, FolderOpen, CheckSquare, MessageCircle, Filter, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNavPins, useDeleteNavPin } from '../../hooks/useNavPins'
import type { NavPin } from '../../api/navPins'
import type { NavItem } from './navItems'

/**
 * Icons a pin may name. An allow-list rather than a dynamic lookup: the value
 * comes from a user-editable column, and an unknown name must degrade to the
 * default rather than throw inside the always-mounted sidebar.
 */
const PIN_ICONS: Record<string, LucideIcon> = {
  project: FolderOpen,
  task: CheckSquare,
  chat: MessageCircle,
  view: Filter,
  page: LayoutDashboard,
}

function pinIcon(name: string | null): LucideIcon {
  return (name && PIN_ICONS[name]) || Pin
}

/**
 * The Pinned section, above the grouped menu.
 *
 * Renders nothing at all when empty — an empty section with a heading is worse
 * than no section, and this is the one part of the sidebar nobody is given by
 * default.
 */
export function PinnedNav({
  rowCls,
  navItems,
}: {
  rowCls: (active: boolean) => string
  /** Flat nav list, so a pinned menu row keeps the icon it has in the menu. */
  navItems: NavItem[]
}) {
  const { data: pins = [] } = useNavPins()
  const { mutate: unpin } = useDeleteNavPin()

  // Parents and children both, since either can be pinned.
  const iconByPath = new Map<string, LucideIcon>()
  for (const item of navItems) {
    iconByPath.set(item.to, item.icon)
    for (const child of item.children ?? []) iconByPath.set(child.to, child.icon)
  }

  if (pins.length === 0) return null

  return (
    <section className="flex flex-col gap-px">
      <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 text-[10px] font-ui font-semibold uppercase tracking-widest text-text-4">
        <Pin size={10} className="shrink-0" />
        <span>Pinned</span>
      </div>
      {pins.map((pin: NavPin) => {
        const Icon = iconByPath.get(pin.path) ?? pinIcon(pin.icon)
        return (
          <div key={pin.id} className="group/pin relative">
            {/* `end` so a pinned list does not stay lit while you are inside one
                of its rows — a pin points at one screen, not a section. */}
            <NavLink to={pin.path} end className={({ isActive }) => cn(rowCls(isActive), 'pr-7')}>
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    className={cn('shrink-0', isActive ? 'text-brand-red' : 'text-text-3')}
                  />
                  <span className="truncate">{pin.label}</span>
                </>
              )}
            </NavLink>
            <button
              type="button"
              onClick={() => unpin(pin.id)}
              aria-label={`Unpin ${pin.label}`}
              title="Unpin"
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-sm',
                'text-text-4 opacity-0 transition-opacity hover:bg-surface-3 hover:text-text-1',
                'group-hover/pin:opacity-100 focus-visible:opacity-100',
              )}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </section>
  )
}
