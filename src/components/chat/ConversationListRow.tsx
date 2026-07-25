import { Hash, Users } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
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
}

export function ConversationListRow({ channel, myProfileId, unread, active, onClick }: ConversationListRowProps) {
  const title = channelTitle(channel, myProfileId)
  const counterpart = dmCounterpart(channel, myProfileId)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex gap-3 items-center transition-colors border-b border-border-subtle last:border-0',
        active ? 'bg-brand-red/13' : 'hover:bg-surface-2/50',
        unread > 0 && !active && 'bg-brand-red/4',
      )}
    >
      {channel.kind === 'channel' ? (
        <span className="size-9 rounded-lg bg-surface-2 flex items-center justify-center text-text-3 shrink-0">
          <Hash size={16} />
        </span>
      ) : channel.kind === 'group_dm' ? (
        <span className="size-9 rounded-lg bg-surface-2 flex items-center justify-center text-text-3 shrink-0">
          <Users size={16} />
        </span>
      ) : (
        <Avatar name={counterpart?.name ?? '?'} src={counterpart?.avatar_url ?? undefined} size="md" />
      )}

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn('font-ui text-[13px] truncate', unread > 0 ? 'text-text-1 font-semibold' : 'text-text-2')}>
            {title}
          </span>
          {channel.last_message_at && (
            <span className="ml-auto font-mono text-[10px] text-text-4 shrink-0">
              {formatRelativeTime(channel.last_message_at)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 mt-0.5">
          <span className="font-ui text-[12px] text-text-3 truncate flex-1">
            {channel.last_message_preview || 'No messages yet'}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand-red text-white font-mono text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
