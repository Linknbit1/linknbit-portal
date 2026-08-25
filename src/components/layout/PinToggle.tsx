import { Pin, PinOff } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { useNavPins, useCreateNavPin, useDeleteNavPin } from '../../hooks/useNavPins'

interface PinToggleProps {
  label: string
  path: string
  /** Tailwind group name whose hover reveals the button, e.g. `group-hover/row`. */
  revealClass: string
  size?: 'sm' | 'md'
}

/**
 * Pin or unpin one destination, from wherever it is listed.
 *
 * Hidden until the row is hovered or the button is focused, so it never
 * competes with the label or the badge — but it is always in the DOM, so
 * keyboard users reach it by tabbing rather than not at all.
 */
export function PinToggle({ label, path, revealClass, size = 'md' }: PinToggleProps) {
  const { profile } = useAuthContext()
  const { data: pins = [] } = useNavPins()
  const { mutate: create, isPending: pinning } = useCreateNavPin()
  const { mutate: remove, isPending: unpinning } = useDeleteNavPin()

  if (!profile) return null

  const existing = pins.find((p) => p.path === path)
  const busy = pinning || unpinning

  const onClick = (e: React.MouseEvent) => {
    // The button sits inside a row that is itself a link on some surfaces.
    e.preventDefault()
    e.stopPropagation()
    if (existing) remove(existing.id)
    else create({ profileId: profile.id, label, path, icon: 'page', position: pins.length })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={existing ? `Unpin ${label}` : `Pin ${label}`}
      title={existing ? 'Unpin' : 'Pin to top'}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm transition-opacity disabled:opacity-40',
        size === 'sm' ? 'size-4' : 'size-5',
        existing
          ? 'text-brand-red opacity-100'
          : cn('text-text-4 opacity-0 hover:text-text-1 focus-visible:opacity-100', revealClass),
      )}
    >
      {existing ? <PinOff size={size === 'sm' ? 10 : 12} /> : <Pin size={size === 'sm' ? 10 : 12} />}
    </button>
  )
}
