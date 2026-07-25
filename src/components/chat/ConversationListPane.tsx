import { useMemo, useRef, useState } from 'react'
import { Plus, Search, Hash, MessageSquarePlus } from 'lucide-react'
import { Input } from '../ui/Input'
import { Skeleton } from '../ui/Skeleton'
import { Popover } from '../ui/Popover'
import { ConversationListRow } from './ConversationListRow'
import { cn } from '../../lib/cn'
import { channelTitle } from './chatUtils'
import { useChannels } from '../../hooks/useChannels'
import { useChatUnreadMap } from '../../hooks/useChatUnreadCount'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useAuthContext } from '../../context/AuthContext'

type Filter = 'all' | 'unread' | 'channels' | 'dms'

interface ConversationListPaneProps {
  activeChannelId?: string
  onSelect: (channelId: string) => void
  onNewChannel: () => void
  onNewDM: () => void
}

export function ConversationListPane({ activeChannelId, onSelect, onNewChannel, onNewDM }: ConversationListPaneProps) {
  const { profile } = useAuthContext()
  const { data: channels = [], isLoading } = useChannels()
  const unreadMap = useChatUnreadMap()
  const canCreateChannels = useCanAccess('can_create_channels')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const newBtnRef = useRef<HTMLButtonElement>(null)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return channels.filter((c) => {
      if (filter === 'unread' && !unreadMap.get(c.id)) return false
      if (filter === 'channels' && c.kind !== 'channel') return false
      if (filter === 'dms' && c.kind === 'channel') return false
      if (q && !channelTitle(c, profile?.id).toLowerCase().includes(q)) return false
      return true
    })
  }, [channels, filter, search, unreadMap, profile?.id])

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface-1 border-r border-border-default">
      <div className="p-3 flex flex-col gap-2.5 border-b border-border-default">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-[15px] text-text-1">Chat</h2>
          <div className="ml-auto">
            <button
              ref={newBtnRef}
              onClick={() => setNewOpen((v) => !v)}
              aria-label="New conversation"
              className="size-7 rounded-sm flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface-3 transition-colors"
            >
              <Plus size={16} />
            </button>
            <Popover anchorRef={newBtnRef} open={newOpen} onClose={() => setNewOpen(false)}>
              <div className="w-52 py-1">
                <button
                  onClick={() => { setNewOpen(false); onNewDM() }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 font-ui text-[13px] text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
                >
                  <MessageSquarePlus size={14} /> New message
                </button>
                {canCreateChannels && (
                  <button
                    onClick={() => { setNewOpen(false); onNewChannel() }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 font-ui text-[13px] text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
                  >
                    <Hash size={14} /> New channel
                  </button>
                )}
              </div>
            </Popover>
          </div>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-8 h-8 text-[12.5px]" />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'unread', 'channels', 'dms'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 h-6 rounded-sm font-ui font-medium text-[11.5px] capitalize transition-colors',
                filter === f ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
              )}
            >
              {f === 'dms' ? 'DMs' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : shown.length === 0 ? (
          <p className="font-ui text-[12.5px] text-text-4 text-center px-6 py-12">
            {channels.length === 0 ? 'No conversations yet. Start one with the + button.' : 'Nothing matches those filters.'}
          </p>
        ) : (
          shown.map((c) => (
            <ConversationListRow
              key={c.id}
              channel={c}
              myProfileId={profile?.id}
              unread={unreadMap.get(c.id) ?? 0}
              active={c.id === activeChannelId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
