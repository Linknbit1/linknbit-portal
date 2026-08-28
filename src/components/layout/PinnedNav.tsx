import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { Pin, X, FolderOpen, CheckSquare, MessageCircle, Filter, LayoutDashboard, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { useNavPins, useDeleteNavPin } from '../../hooks/useNavPins'
import { useNavPinDetails, type PinPresentation } from '../../hooks/useNavPinDetails'
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

/** What a resolved pin shows, when it is not a person. */
const KIND_ICONS: Record<PinPresentation['kind'], LucideIcon | null> = {
  channel: Hash,
  dm: null,       // a person is their picture, not a glyph
  project: FolderOpen,
  task: CheckSquare,
  other: null,
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
  const details = useNavPinDetails(pins)

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
      {pins.map((pin: NavPin) => (
        <PinRow
          key={pin.id}
          pin={pin}
          detail={details.get(pin.id)}
          menuIcon={iconByPath.get(pin.path)}
          rowCls={rowCls}
          onUnpin={() => unpin(pin.id)}
        />
      ))}
    </section>
  )
}

/**
 * One pinned row, with the full name shown beside the rail on hover.
 *
 * The card is portaled to the body rather than positioned inside the row: the
 * sidebar is `overflow-hidden` and its nav scrolls, so anything absolutely
 * positioned past the right edge is clipped by both. Measured on hover rather
 * than tracked continuously, because it only has to be right while it is up.
 */
function PinRow({
  pin, detail, menuIcon, rowCls, onUnpin,
}: {
  pin: NavPin
  detail?: PinPresentation
  menuIcon?: LucideIcon
  rowCls: (active: boolean) => string
  onUnpin: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [hoverAt, setHoverAt] = useState<{ top: number; left: number } | null>(null)

  const KindIcon = detail ? KIND_ICONS[detail.kind] : null
  const Icon = menuIcon ?? KindIcon ?? pinIcon(pin.icon)
  const label = detail?.label ?? pin.label
  const full = detail?.full ?? pin.label
  const showCard = full !== label

  const open = () => {
    if (!showCard) return
    const r = rowRef.current?.getBoundingClientRect()
    if (r) setHoverAt({ top: r.top + r.height / 2, left: r.right + 8 })
  }

  return (
    <div
      ref={rowRef}
      className="group/pin relative"
      onMouseEnter={open}
      onMouseLeave={() => setHoverAt(null)}
    >
      {/* `end` so a pinned list does not stay lit while you are inside one of
          its rows — a pin points at one screen, not a section. */}
      <NavLink to={pin.path} end className={({ isActive }) => cn(rowCls(isActive), 'pr-7')}>
        {({ isActive }) => (
          <>
            {detail?.avatar ? (
              <Avatar name={detail.avatar.name} src={detail.avatar.url ?? undefined} size="xs" />
            ) : (
              <Icon size={15} className={cn('shrink-0', isActive ? 'text-brand-red' : 'text-text-3')} />
            )}
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>

      <button
        type="button"
        onClick={onUnpin}
        aria-label={`Unpin ${label}`}
        title="Unpin"
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-sm',
          'text-text-4 opacity-0 transition-opacity hover:bg-surface-3 hover:text-text-1',
          'group-hover/pin:opacity-100 focus-visible:opacity-100',
        )}
      >
        <X size={12} />
      </button>

      {hoverAt && createPortal(
        <span
          role="tooltip"
          style={{ top: hoverAt.top, left: hoverAt.left }}
          className={cn(
            'pointer-events-none fixed z-60 -translate-y-1/2',
            'max-w-72 rounded-sm border border-border-strong bg-surface-3 px-2.5 py-1.5',
            'font-ui text-[12px] text-text-1 shadow-lg',
          )}
        >
          {full}
        </span>,
        document.body,
      )}
    </div>
  )
}
