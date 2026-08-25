import { useLocation } from 'react-router-dom'
import { Pin, PinOff } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { useNavPins, useCreateNavPin, useDeleteNavPin } from '../../hooks/useNavPins'
import { useToast } from '../ui/toast-context'

/** Paths that are never worth a pin — you land on them anyway. */
const UNPINNABLE = new Set(['/my-day', '/'])

/**
 * Pins the current screen to the top of the sidebar, or unpins it if it is
 * already there.
 *
 * The stored path carries the query string, so pinning a filtered list saves
 * that list *as filtered* — which is what makes a saved view just a pin.
 */
export function PinPageButton({ title }: { title?: string }) {
  const location = useLocation()
  const { profile } = useAuthContext()
  const toast = useToast()
  const { data: pins = [] } = useNavPins()
  const { mutate: create, isPending: pinning } = useCreateNavPin()
  const { mutate: remove, isPending: unpinning } = useDeleteNavPin()

  const path = `${location.pathname}${location.search}`
  const existing = pins.find((p) => p.path === path)

  if (!profile || UNPINNABLE.has(location.pathname)) return null

  const label = (title ?? location.pathname.split('/').filter(Boolean).at(-1) ?? 'Page').slice(0, 60)
  const busy = pinning || unpinning

  const onClick = () => {
    if (existing) {
      remove(existing.id, { onError: (e: Error) => toast(e.message, 'error') })
      return
    }
    create(
      {
        profileId: profile.id,
        label,
        path,
        // A pin with a query string is a saved view; mark it so it reads as one.
        icon: location.search ? 'view' : 'page',
        position: pins.length,
      },
      {
        onSuccess: () => toast(`Pinned “${label}” to the sidebar.`, 'success'),
        onError: (e: Error) => toast(e.message, 'error'),
      },
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={!!existing}
      aria-label={existing ? 'Unpin this page' : 'Pin this page to the sidebar'}
      title={existing ? 'Unpin this page' : 'Pin this page to the sidebar'}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-50',
        existing
          ? 'border-brand-red/40 bg-brand-red/12 text-brand-red'
          : 'border-border-default bg-surface-1 text-text-3 hover:text-text-1',
      )}
    >
      {existing ? <PinOff size={15} /> : <Pin size={15} />}
    </button>
  )
}
