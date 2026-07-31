import { type RefObject } from 'react'
import { Popover } from '../ui/Popover'
import { UserProfileBody } from './UserProfileBody'

interface UserProfileCardProps {
  profileId: string
  name?: string
  avatarUrl?: string | null
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
}

/** Discord-style mini profile, opened by clicking someone's avatar or name in a message. */
export function UserProfileCard({ profileId, name, avatarUrl, open, onClose, anchorRef }: UserProfileCardProps) {
  return (
    <Popover anchorRef={anchorRef} open={open} onClose={onClose}>
      <div className="w-64 rounded-lg border border-border-strong bg-surface-2 p-4 shadow-lg">
        <UserProfileBody
          profileId={profileId}
          fallbackName={name}
          fallbackAvatar={avatarUrl}
          variant="card"
          onNavigate={onClose}
        />
      </div>
    </Popover>
  )
}
