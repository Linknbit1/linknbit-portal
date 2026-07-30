import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, Info } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { StackScreen } from '../components/layout/StackScreen'
import { Drawer } from '../components/ui/Drawer'
import { ConversationListPane } from '../components/chat/ConversationListPane'
import { ConversationListRow } from '../components/chat/ConversationListRow'
import { ConversationInfoPanel } from '../components/chat/ConversationInfoPanel'
import { ChatThread } from '../components/chat/ChatThread'
import { CreateChannelModal } from '../components/chat/CreateChannelModal'
import { NewDMPicker } from '../components/chat/NewDMPicker'
import { Skeleton } from '../components/ui/Skeleton'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useChannels } from '../hooks/useChannels'
import { useChatUnreadMap } from '../hooks/useChatUnreadCount'
import { useAuthContext } from '../context/AuthContext'
import { channelTitle, dmCounterpart } from '../components/chat/chatUtils'

/**
 * Desktop renders the list and thread side by side; mobile uses the hub →
 * stack-screen idiom used elsewhere (Attendance, Gamification, Settings).
 */
export default function ChatPage() {
  const isDesktop = useIsDesktop()
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [dmOpen, setDmOpen] = useState(false)

  const openChannel = (id: string) => navigate(`/chat/${id}`)
  const afterCreate = (id: string) => { setCreateOpen(false); setDmOpen(false); openChannel(id) }
  // Leaving the removed conversation open would show an empty thread you can no
  // longer post to, so fall back to the chat index.
  const afterRemoved = (id: string) => { if (id === channelId) navigate('/chat', { replace: true }) }

  const modals = (
    <>
      <CreateChannelModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={afterCreate} />
      <NewDMPicker open={dmOpen} onClose={() => setDmOpen(false)} onCreated={afterCreate} />
    </>
  )

  if (!isDesktop) {
    if (channelId) {
      return <MobileThreadScreen channelId={channelId} />
    }
    return (
      <>
        <MobileChatHub
          onSelect={openChannel}
          onNewChannel={() => setCreateOpen(true)}
          onNewDM={() => setDmOpen(true)}
          onRemoved={afterRemoved}
        />
        {modals}
      </>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar title="Chat" />
      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr]">
        <ConversationListPane
          activeChannelId={channelId}
          onSelect={openChannel}
          onNewChannel={() => setCreateOpen(true)}
          onNewDM={() => setDmOpen(true)}
          onRemoved={afterRemoved}
        />
        {channelId ? (
          <ChatThread key={channelId} channelId={channelId} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3">
              <MessageSquare size={22} />
            </span>
            <p className="font-ui font-semibold text-[14px] text-text-1">Pick a conversation</p>
            <p className="font-ui text-[12px] text-text-4 max-w-sm">Choose a channel or direct message on the left, or start a new one.</p>
          </div>
        )}
      </div>
      {modals}
    </div>
  )
}

function MobileThreadScreen({ channelId }: { channelId: string }) {
  const { profile } = useAuthContext()
  const { data: channels = [] } = useChannels()
  const [infoOpen, setInfoOpen] = useState(false)
  const channel = channels.find((c) => c.id === channelId)
  const title = channel ? channelTitle(channel, profile?.id) : 'Chat'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar
        title={title}
        back="/chat"
        actions={
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="Conversation details"
            className="flex size-9 items-center justify-center rounded-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            <Info size={18} />
          </button>
        }
      />
      <ChatThread key={channelId} channelId={channelId} hideHeader />

      {/* The desktop info pane is an lg-only sidebar, so phones reach the same
          content (profile, members, shared media) through a bottom sheet. */}
      <Drawer open={infoOpen} onClose={() => setInfoOpen(false)} title="Details" side="bottom">
        <div className="h-[70vh]">
          <ConversationInfoPanel
            channel={channel ?? null}
            counterpart={channel ? dmCounterpart(channel, profile?.id) : null}
            title={title}
            memberCount={channel?.members.length ?? 0}
          />
        </div>
      </Drawer>
    </div>
  )
}

interface MobileChatHubProps {
  onRemoved: (channelId: string) => void
  onSelect: (id: string) => void
  onNewChannel: () => void
  onNewDM: () => void
}

function MobileChatHub({ onSelect, onNewChannel, onNewDM, onRemoved }: MobileChatHubProps) {
  const { profile } = useAuthContext()
  const { data: channels = [], isLoading } = useChannels()
  const unreadMap = useChatUnreadMap()

  return (
    <StackScreen title="Chat" back={false}>
      <div className="flex items-center gap-2">
        <button
          onClick={onNewDM}
          className="flex-1 h-9 rounded-md bg-surface-2 border border-border-default font-ui text-[12.5px] text-text-2 hover:text-text-1 transition-colors"
        >
          New message
        </button>
        <button
          onClick={onNewChannel}
          className="flex-1 h-9 rounded-md bg-surface-2 border border-border-default font-ui text-[12.5px] text-text-2 hover:text-text-1 transition-colors"
        >
          New channel
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : channels.length === 0 ? (
        <p className="font-ui text-[12.5px] text-text-4 text-center py-12">No conversations yet.</p>
      ) : (
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          {channels.map((c) => (
            <ConversationListRow
              key={c.id}
              channel={c}
              myProfileId={profile?.id}
              unread={unreadMap.get(c.id) ?? 0}
              onClick={() => onSelect(c.id)}
              onRemoved={onRemoved}
            />
          ))}
        </div>
      )}
    </StackScreen>
  )
}
