import { Hash, Users, BellOff, Lock } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { ConversationMenu } from './ConversationMenu'
import { cn } from '../../lib/cn'
import { formatRelativeTime } from '../../lib/utils'
import { channelTitle, dmCounterpart } from './chatUtils'
import type { ChannelListItem } from '../../api/channels'

interface ConversationListRowProps {
  channel: ChannelListItem
  myProfileId: string | undefined
  unread: number
  active?: boolean
  onClick: () => void
  onRemoved: (channelId: string) => void
}

export function ConversationListRow({ channel, myProfileId, unread, active, onClick, onRemoved }: ConversationListRowProps) {
  const title = channelTitle(channel, myProfileId)
  const counterpart = dmCounterpart(channel, myProfileId)

  return (
    // A container rather than one big button, so the actions menu isn't a
    // button nested inside a button.
    <div
      className={cn(
        'group flex items-center border-b border-border-subtle transition-colors last:border-0',
        active ? 'bg-brand-red/13' : 'hover:bg-surface-2/50',
        unread > 0 && !active && 'bg-brand-red/4',
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left">
        {channel.kind === 'channel' ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-3">
            <Hash size={16} />
          </span>
        ) : channel.kind === 'group_dm' ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-3">
            <Users size={16} />
          </span>
        ) : (
          <Avatar name={counterpart?.name ?? '?'} src={counterpart?.avatar_url ?? undefined} size="lg" />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn('truncate font-ui text-[14px]', unread > 0 ? 'font-semibold text-text-1' : 'text-text-2')}>
              {title}
            </span>
            {channel.is_private && <Lock size={11} className="shrink-0 text-text-4" aria-label="Private channel" />}
            {channel.muted && <BellOff size={11} className="shrink-0 text-text-4" aria-label="Muted" />}
            {channel.last_message_at && (
              <span className="ml-auto shrink-0 font-mono text-[10.5px] text-text-4">
                {formatRelativeTime(channel.last_message_at)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="flex-1 truncate font-ui text-[13px] text-text-3">
              {channel.last_message_preview || 'No messages yet'}
            </span>
            {unread > 0 && (
              <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-sm bg-brand-red px-1.5 font-mono text-[10px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
        </span>
      </button>

      {/* Always visible on touch — there is no hover to reveal it. Hover-gated
          from lg up only, and the lg: variants must carry group-hover too, or
          the plain lg:opacity-0 (emitted later) would win and hide it always. */}
      <span className="shrink-0 pr-1.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
        <ConversationMenu channel={channel} title={title} hasUnread={unread > 0} onRemoved={onRemoved} />
      </span>
    </div>
  )
}
