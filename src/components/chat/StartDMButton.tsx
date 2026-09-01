import { useNavigate } from 'react-router-dom'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useToast } from '../ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useCreateDM } from '../../hooks/useChannels'
import { isClientRole } from '../../lib/roles'
import { cn } from '../../lib/cn'

interface StartDMButtonProps {
  profileId: string
  name: string
  role: string
  /** `icon` for table rows and lists; `button` for a labelled profile action. */
  variant?: 'icon' | 'button'
  className?: string
}

/**
 * Opens (or starts) a direct message with someone, from anywhere they're shown.
 * Renders nothing for yourself or for client-portal users, since chat is
 * internal-only — the same boundary the DM RPC enforces server-side.
 */
export function StartDMButton({ profileId, name, role, variant = 'icon', className }: StartDMButtonProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuthContext()
  const { mutate: createDM, isPending } = useCreateDM()

  const isSelf = profile?.id === profileId
  // Chat is internal-only, on both sides of the conversation.
  if (isSelf || isClientRole(profile?.role) || isClientRole(role)) return null

  const open = () => {
    createDM(profileId, {
      onSuccess: (channelId) => navigate(`/chat/${channelId}`),
      onError: () => toast(`Could not open a chat with ${name}`, 'error'),
    })
  }

  const firstName = name.split(' ')[0]
  const label = `Message ${firstName}`

  if (variant === 'button') {
    return (
      <button
        onClick={open}
        disabled={isPending}
        title={label}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border border-border-default px-3 py-1.5 font-ui text-[12px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 disabled:opacity-60',
          className,
        )}
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); open() }}
      disabled={isPending}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-7 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-surface-3 hover:text-text-1 disabled:opacity-60',
        className,
      )}
    >
      {isPending ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={14} />}
    </button>
  )
}
