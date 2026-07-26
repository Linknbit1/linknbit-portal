import { Hash, Users as UsersIcon } from 'lucide-react'
import { ChannelFilesPanel } from './ChannelFilesPanel'
import { UserProfileBody } from './UserProfileBody'
import type { ChannelListItem } from '../../api/channels'
import type { PersonMini } from '../../api/projects'

interface ConversationInfoPanelProps {
  channel: ChannelListItem | null
  counterpart: PersonMini | null
  title: string
  memberCount: number
}

/**
 * The right-hand panel: who (or what) you're talking to, then everything
 * shared in the conversation. DMs show the other person's profile — the same
 * block the popover card uses.
 */
export function ConversationInfoPanel({ channel, counterpart, title, memberCount }: ConversationInfoPanelProps) {
  const isDM = channel?.kind === 'dm'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border-default p-4">
        {isDM && counterpart ? (
          <UserProfileBody
            profileId={counterpart.id}
            fallbackName={counterpart.name}
            fallbackAvatar={counterpart.avatar_url}
          />
        ) : (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 text-text-3">
              {channel?.kind === 'group_dm' ? <UsersIcon size={26} /> : <Hash size={26} />}
            </span>
            <h3 className="mt-3 font-display text-[16px] font-bold text-text-1">{title}</h3>
            {channel?.description && (
              <p className="mt-1 font-ui text-[12.5px] text-text-3">{channel.description}</p>
            )}
            <p className="mt-2 font-mono text-[11px] text-text-4">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {channel && <ChannelFilesPanel channelId={channel.id} />}
      </div>
    </div>
  )
}
