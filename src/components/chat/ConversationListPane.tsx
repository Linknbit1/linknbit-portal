import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Search, Hash, MessageSquarePlus, Loader2 } from 'lucide-react'
import { Input } from '../ui/Input'
import { Skeleton } from '../ui/Skeleton'
import { Popover } from '../ui/Popover'
import { ConversationListRow } from './ConversationListRow'
import { cn } from '../../lib/cn'
import { formatRelativeTime } from '../../lib/utils'
import { channelTitle } from './chatUtils'
import { useChannels } from '../../hooks/useChannels'
import { useMessageSearch } from '../../hooks/useMessages'
import { useChatUnreadMap } from '../../hooks/useChatUnreadCount'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useAuthContext } from '../../context/AuthContext'

type Filter = 'channels' | 'dms'

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 border-b border-border-subtle bg-surface-2/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-4">
      {children}
    </p>
  )
}

interface ConversationListPaneProps {
  activeChannelId?: string
  onSelect: (channelId: string) => void
  onNewChannel: () => void
  onNewDM: () => void
  /** Fired when a conversation leaves the list, so an open thread can close. */
  onRemoved: (channelId: string) => void
}

export function ConversationListPane({ activeChannelId, onSelect, onNewChannel, onNewDM, onRemoved }: ConversationListPaneProps) {
  const { profile } = useAuthContext()
  const { data: channels = [], isLoading } = useChannels()
  const unreadMap = useChatUnreadMap()
  const canCreateChannels = useCanAccess('can_create_channels')
  const [filter, setFilter] = useState<Filter>('channels')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const newBtnRef = useRef<HTMLButtonElement>(null)

  const query = search.trim()
  const { data: messageHits = [], isFetching: searchingMessages } = useMessageSearch(query)

  const shown = useMemo(() => {
    const q = query.toLowerCase()
    return channels.filter((c) => {
      if (filter === 'channels' && c.kind !== 'channel') return false
      if (filter === 'dms' && c.kind === 'channel') return false
      if (!q) return true
      // Match the conversation's name, or any member's name, so searching a
      // person finds the group channels they're in too.
      const title = channelTitle(c, profile?.id).toLowerCase()
      const memberNames = c.members.map((m) => m.name.toLowerCase())
      return title.includes(q) || memberNames.some((n) => n.includes(q))
    })
  }, [channels, filter, query, profile?.id])

  // Totals for the tab labels — deliberately unfiltered by the search box, so
  // the counts read as "how many I have", not "how many match".
  const counts = useMemo(() => ({
    dms: channels.filter((c) => c.kind !== 'channel').length,
    channels: channels.filter((c) => c.kind === 'channel').length,
  }), [channels])

  // Message hits are grouped per conversation so one busy thread can't flood
  // the results, and rows for conversations already listed above are dropped.
  const messageResults = useMemo(() => {
    if (query.length < 2) return []
    const channelById = new Map(channels.map((c) => [c.id, c]))
    const seen = new Set<string>()
    return messageHits.flatMap((hit) => {
      if (seen.has(hit.channel_id)) return []
      const channel = channelById.get(hit.channel_id)
      if (!channel) return []
      seen.add(hit.channel_id)
      return [{ hit, channel, title: channelTitle(channel, profile?.id) }]
    })
  }, [messageHits, channels, query, profile?.id])

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
              <div className="w-52 overflow-hidden rounded-md border border-border-strong bg-surface-2 py-1 shadow-lg">
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

        {/* Segmented control — each half claims equal width so the counts line up. */}
        <div className="flex items-center gap-0.5 rounded-md bg-surface-inset p-0.5">
          {(['dms', 'channels'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm font-ui font-medium text-[12px] transition-colors',
                filter === f
                  ? 'bg-surface-3 text-text-1'
                  : 'text-text-3 hover:bg-surface-2/60 hover:text-text-1',
              )}
            >
              {f === 'dms' ? 'DMs' : 'Channels'}
              <span
                className={cn(
                  'rounded-full px-1.5 font-mono text-[10px] tabular-nums transition-colors',
                  filter === f ? 'bg-brand-red/20 text-brand-red' : 'bg-surface-2 text-text-4',
                )}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : shown.length === 0 && messageResults.length === 0 ? (
          <p className="px-6 py-12 text-center font-ui text-[12.5px] text-text-4">
            {channels.length === 0
              ? 'No conversations yet. Start one with the + button.'
              : query
                ? `Nothing matches "${query}".`
                : filter === 'channels'
                  ? 'No channels yet.'
                  : 'No direct messages yet.'}
          </p>
        ) : (
          <>
            {shown.length > 0 && (
              <>
                {query && <SectionLabel>Conversations</SectionLabel>}
                {shown.map((c) => (
                  <ConversationListRow
                    key={c.id}
                    channel={c}
                    myProfileId={profile?.id}
                    unread={unreadMap.get(c.id) ?? 0}
                    active={c.id === activeChannelId}
                    onClick={() => onSelect(c.id)}
                    onRemoved={onRemoved}
                  />
                ))}
              </>
            )}

            {query.length >= 2 && (
              <>
                <SectionLabel>
                  Messages {searchingMessages && <Loader2 size={11} className="animate-spin" />}
                </SectionLabel>
                {messageResults.length === 0 ? (
                  <p className="p-3 font-ui text-[12px] text-text-4">
                    {searchingMessages ? 'Searching…' : 'No messages found.'}
                  </p>
                ) : (
                  messageResults.map(({ hit, title }) => (
                    <button
                      key={hit.id}
                      onClick={() => onSelect(hit.channel_id)}
                      className="flex w-full items-start gap-2.5 border-b border-border-subtle px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2/50"
                    >
                      <Search size={13} className="mt-0.5 shrink-0 text-text-4" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-ui text-[12.5px] text-text-2">{title}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-text-4">
                            {formatRelativeTime(hit.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate font-ui text-[12px] text-text-3">
                          {hit.author?.name ? `${hit.author.name}: ` : ''}{hit.body_text}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
