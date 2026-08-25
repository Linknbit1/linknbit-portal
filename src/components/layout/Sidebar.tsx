import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNavGroups, activeNavPath, navLabelForPath, BRAND_MENU_LINKS, BOTTOM_GROUP_ID, type NavItem } from './navItems'
import { LinknbitMark } from '../brand/LinknbitLogo'
import { InstallAppButton } from '../pwa/InstallAppButton'
import { Popover } from '../ui/Popover'
import { useNavGroupCollapse } from '../../hooks/useNavGroupCollapse'
import { PinnedNav } from './PinnedNav'
import { PinToggle } from './PinToggle'

export function Sidebar() {
  const location = useLocation()
  const navGroups = useNavGroups()
  // Resolved once across every section — including the pinned footer — so
  // exactly one item can be active.
  const allItems = navGroups.flatMap((g) => g.items)
  const activePath = activeNavPath(allItems, location.pathname)
  const bodyGroups = navGroups.filter((g) => g.id !== BOTTOM_GROUP_ID)
  const bottomGroup = navGroups.find((g) => g.id === BOTTOM_GROUP_ID)
  const { isCollapsed, toggle: toggleGroup } = useNavGroupCollapse()

  // Scrolling lives on <nav> rather than the aside: with the whole aside as the
  // scroll container, the pinned footer scrolled away with the list.
  return (
    <aside className="w-sidebar-expanded bg-surface-1 border-r border-border-default hidden lg:flex flex-col sticky top-0 h-screen overflow-hidden shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 p-3 border-b border-border-subtle">
        <LinknbitMark surface="dark" className="h-7 w-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-body-sm/tight text-text-1">Linknbit</p>
          <p className="font-mono text-[9px] text-text-4 uppercase tracking-wider">Operations Portal</p>
        </div>
        <BrandMenu />
      </div>

      {/* Nav — one section per kind of work; empty sections drop out per role. */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col">
        {/* Above the groups on purpose: these are the destinations this person
            chose, and they outrank any ordering we could guess at. */}
        <PinnedNav rowCls={rowCls} navItems={allItems} />
        {bodyGroups.map((group, i) => {
          const folded = isCollapsed(group.id)
          // A folded section still has to show that something is waiting inside
          // it, or folding becomes a way to miss work.
          const hidden = folded ? group.items.reduce((n, it) => n + (it.badge ?? 0), 0) : 0
          return (
            <section key={group.id} className={cn('flex flex-col gap-px', i > 0 && 'mt-1.5')}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!folded}
                className={cn(
                  'group/head flex items-center gap-1 px-2 pt-1.5 pb-1 rounded-sm',
                  'text-[10px] font-ui font-semibold uppercase tracking-widest',
                  'text-text-4 transition-colors hover:text-text-2',
                )}
              >
                <ChevronDown
                  size={10}
                  className={cn(
                    'shrink-0 transition-transform opacity-0 group-hover/head:opacity-100 focus-visible:opacity-100',
                    folded && 'opacity-100 -rotate-90',
                  )}
                />
                <span>{group.label}</span>
                {hidden > 0 && (
                  <span className="ml-auto rounded-sm bg-brand-red px-1.5 py-px font-ui text-[10px] font-bold leading-tight text-white">
                    {badgeCount(hidden)}
                  </span>
                )}
              </button>
              {!folded && group.items.map((item) => (
                <NavRow key={item.to} item={item} pathname={location.pathname} activePath={activePath} allItems={allItems} />
              ))}
            </section>
          )
        })}
      </nav>

      {/* Pinned footer — Settings, then the install prompt. Separated by a rule
          so it reads as a different kind of destination from the nav above, and
          stays put when the sections above overflow into a scroll. */}
      <div className="shrink-0 border-t border-border-subtle px-3 py-2">
        {bottomGroup && (
          <div className="flex flex-col gap-px">
            {bottomGroup.items.map((item) => (
              <NavRow key={item.to} item={item} pathname={location.pathname} activePath={activePath} allItems={allItems} />
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

/**
 * One nav row.
 *
 * `py-1.5` + `text-body-sm/tight` lands at ~28px, down from ~35.5px — the height
 * ClickUp, Linear and Notion all converge on for a sidebar row. Weight carries
 * the state instead of size: inactive rows are regular, only the current one is
 * medium. Every row being `font-medium` was what made a 19-row list read as a
 * wall rather than a list.
 */
const rowCls = (active: boolean) =>
  cn(
    'flex h-7 items-center gap-2 px-2 rounded-sm font-ui text-[12.5px] leading-none transition-colors relative',
    active
      ? 'bg-brand-red/13 text-white font-medium nav-active-indicator'
      : 'text-text-2 font-normal hover:bg-surface-2 hover:text-text-1',
  )

/** A nav entry — a plain link, or an expandable group when it has sub-pages. */
/** Keeps a badge pill one or two glyphs wide, the way the bell does. */
const badgeCount = (n: number) => (n > 99 ? '99+' : String(n))

function NavRow({ item, pathname, activePath, allItems }: {
  item: NavItem
  pathname: string
  activePath: string | null
  allItems: NavItem[]
}) {
  const inSection = (item.matchPrefix ?? item.to) === activePath
  // A parent row opens one of its children, so the pin is named after that page
  // rather than after the section heading that links to it.
  const pinLabel = navLabelForPath(allItems, item.to) ?? item.label
  // Expanded by default while you're inside the section; an explicit toggle wins
  // until you navigate elsewhere (derived, so no state sync needed).
  const [toggled, setToggled] = useState<boolean | null>(null)
  const open = toggled ?? inSection
  const setOpen = (fn: (v: boolean) => boolean) => setToggled(fn(open))

  if (!item.children?.length) {
    return (
      <div className={cn(rowCls(inSection), 'group/row pr-1')}>
        <NavLink to={item.to} className="flex items-center gap-2 flex-1 min-w-0">
          <item.icon size={15} className={cn('shrink-0', inSection ? 'text-brand-red' : 'text-text-3')} />
          <span className="truncate">{item.label}</span>
        </NavLink>
        {item.badge && item.badge > 0 && (
          <span className="bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-sm leading-tight shrink-0">
            {badgeCount(item.badge)}
          </span>
        )}
        <PinToggle label={pinLabel} path={item.to} revealClass="group-hover/row:opacity-100" />
      </div>
    )
  }

  return (
    <div>
      <div className={cn(rowCls(inSection), 'group/row pr-1')}>
        <NavLink to={item.to} className="flex items-center gap-2 flex-1 min-w-0">
          <item.icon size={15} className={cn('shrink-0', inSection ? 'text-brand-red' : 'text-text-3')} />
          <span className="truncate">{item.label}</span>
        </NavLink>
        {/* Section total — shown whether collapsed or expanded, alongside the
            per-child breakdown. */}
        {item.badge && item.badge > 0 && (
          <span className="bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-sm leading-tight shrink-0">
            {badgeCount(item.badge)}
          </span>
        )}
        <PinToggle label={pinLabel} path={item.to} revealClass="group-hover/row:opacity-100" />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={open}
          className="size-5 rounded flex items-center justify-center text-text-4 hover:text-text-1 shrink-0"
        >
          <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="mt-px mb-1 ml-[1.15rem] pl-2 border-l border-border-subtle flex flex-col gap-px">
          {item.children.map((child) => {
            const active = pathname === child.to
            return (
              <div
                key={child.to}
                className={cn(
                  'group/child flex h-6 items-center gap-2 pl-2 pr-1 rounded-sm font-ui text-[12px] leading-none transition-colors',
                  active ? 'text-white bg-brand-red/13 font-medium' : 'text-text-3 hover:text-text-1 hover:bg-surface-2',
                )}
              >
                <NavLink to={child.to} className="flex-1 min-w-0 truncate">
                  {child.label}
                </NavLink>
                {child.badge && child.badge > 0 && (
                  <span className="bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-sm leading-tight shrink-0">
                    {badgeCount(child.badge)}
                  </span>
                )}
                <PinToggle
                  label={child.label}
                  path={child.to}
                  revealClass="group-hover/child:opacity-100"
                  size="sm"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
