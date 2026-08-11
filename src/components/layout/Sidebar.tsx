import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNavGroups, activeNavPath, BRAND_MENU_LINKS, BOTTOM_GROUP_ID, type NavItem } from './navItems'
import { LinknbitMark } from '../brand/LinknbitLogo'
import { InstallAppButton } from '../pwa/InstallAppButton'
import { Popover } from '../ui/Popover'

export function Sidebar() {
  const location = useLocation()
  const navGroups = useNavGroups()
  // Resolved once across every section — including the pinned footer — so
  // exactly one item can be active.
  const activePath = activeNavPath(navGroups.flatMap((g) => g.items), location.pathname)
  const bodyGroups = navGroups.filter((g) => g.id !== BOTTOM_GROUP_ID)
  const bottomGroup = navGroups.find((g) => g.id === BOTTOM_GROUP_ID)

  // Scrolling lives on <nav> rather than the aside: with the whole aside as the
  // scroll container, the pinned footer scrolled away with the list.
  return (
    <aside className="w-sidebar-expanded bg-surface-1 border-r border-border-default hidden lg:flex flex-col sticky top-0 h-screen overflow-hidden shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-border-subtle">
        <LinknbitMark surface="dark" className="h-8 w-7 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-body-sm/tight text-text-1">Linknbit</p>
          <p className="font-mono text-[9px] text-text-4 uppercase tracking-wider mt-0.5">Operations Portal</p>
        </div>
        <BrandMenu />
      </div>

      {/* Nav — one section per kind of work; empty sections drop out per role. */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2 flex flex-col">
        {bodyGroups.map((group, i) => (
          <section key={group.id} className={cn('flex flex-col gap-px', i > 0 && 'mt-3')}>
            <h2 className="text-[10px] font-ui font-semibold text-text-4 uppercase tracking-widest px-2 pt-2 pb-1.5">
              {group.label}
            </h2>
            {group.items.map((item) => (
              <NavRow key={item.to} item={item} pathname={location.pathname} activePath={activePath} />
            ))}
          </section>
        ))}
      </nav>

      {/* Pinned footer — Settings, then the install prompt. Separated by a rule
          so it reads as a different kind of destination from the nav above, and
          stays put when the sections above overflow into a scroll. */}
      <div className="shrink-0 border-t border-border-subtle px-3 pt-2 pb-3">
        {bottomGroup && (
          <div className="flex flex-col gap-px">
            {bottomGroup.items.map((item) => (
              <NavRow key={item.to} item={item} pathname={location.pathname} activePath={activePath} />
            ))}
          </div>
        )}
        {/* Shown only when installable */}
        <InstallAppButton />
      </div>
    </aside>
  )
}

/**
 * The arrow beside the logo. It sat inert since the first build; it now opens the
 * things that describe the portal itself rather than a destination inside it —
 * which is why they are here and not another sidebar row.
 */
function BrandMenu() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Portal documentation"
        className={cn(
          'size-5 rounded flex items-center justify-center transition-colors hover:bg-surface-2 hover:text-text-2',
          open ? 'text-text-2 bg-surface-2' : 'text-text-4',
        )}
      >
        <ChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="w-60 overflow-hidden rounded-md border border-border-strong bg-surface-2 shadow-lg"
      >
        {BRAND_MENU_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-3"
          >
            <link.icon size={14} className="mt-0.5 shrink-0 text-text-3" />
            <span className="min-w-0">
              <span className="block font-ui text-[13px] font-medium text-text-1">{link.label}</span>
              <span className="block font-ui text-[11.5px] text-text-4">{link.hint}</span>
            </span>
          </NavLink>
        ))}
      </Popover>
    </>
  )
}

const rowCls = (active: boolean) =>
  cn(
    'flex items-center gap-2.5 px-2.5 py-2 rounded-sm font-ui font-medium text-body-sm transition-colors relative',
    active ? 'bg-brand-red/13 text-white nav-active-indicator' : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
  )

/** A nav entry — a plain link, or an expandable group when it has sub-pages. */
function NavRow({ item, pathname, activePath }: { item: NavItem; pathname: string; activePath: string | null }) {
  const inSection = (item.matchPrefix ?? item.to) === activePath
  // Expanded by default while you're inside the section; an explicit toggle wins
  // until you navigate elsewhere (derived, so no state sync needed).
  const [toggled, setToggled] = useState<boolean | null>(null)
  const open = toggled ?? inSection
  const setOpen = (fn: (v: boolean) => boolean) => setToggled(fn(open))

  if (!item.children?.length) {
    return (
      <NavLink to={item.to} className={rowCls(inSection)}>
        <item.icon size={16} className={cn('shrink-0', inSection ? 'text-brand-red' : 'text-text-3')} />
        <span>{item.label}</span>
        {item.badge && item.badge > 0 && (
          <span className="ml-auto bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-full leading-tight">
            {item.badge}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <div>
      <div className={cn(rowCls(inSection), 'pr-1')}>
        <NavLink to={item.to} className="flex items-center gap-2.5 flex-1 min-w-0">
          <item.icon size={16} className={cn('shrink-0', inSection ? 'text-brand-red' : 'text-text-3')} />
          <span className="truncate">{item.label}</span>
        </NavLink>
        {/* Section total — shown whether collapsed or expanded, alongside the
            per-child breakdown. */}
        {item.badge && item.badge > 0 && (
          <span className="bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-full leading-tight shrink-0">
            {item.badge}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={open}
          className="size-6 rounded flex items-center justify-center text-text-4 hover:text-text-1 shrink-0"
        >
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="mt-px mb-1 ml-[1.45rem] pl-2.5 border-l border-border-subtle flex flex-col gap-px">
          {item.children.map((child) => {
            const active = pathname === child.to
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-sm font-ui text-[12.5px] transition-colors',
                  active ? 'text-white bg-brand-red/13 font-medium' : 'text-text-3 hover:text-text-1 hover:bg-surface-2',
                )}
              >
                <span className="truncate">{child.label}</span>
                {child.badge && child.badge > 0 && (
                  <span className="ml-auto bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-full leading-tight shrink-0">
                    {child.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
