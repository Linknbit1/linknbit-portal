import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { StackScreen } from '../components/layout/StackScreen'
import { ConversationListPane } from '../components/chat/ConversationListPane'
import { ConversationListRow } from '../components/chat/ConversationListRow'
import { ChatThread } from '../components/chat/ChatThread'
import { CreateChannelModal } from '../components/chat/CreateChannelModal'
import { NewDMPicker } from '../components/chat/NewDMPicker'
import { Skeleton } from '../components/ui/Skeleton'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useChannels } from '../hooks/useChannels'
import { useChatUnreadMap } from '../hooks/useChatUnreadCount'
import { useAuthContext } from '../context/AuthContext'
import { channelTitle } from '../components/chat/chatUtils'

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
        <MobileChatHub onSelect={openChannel} onNewChannel={() => setCreateOpen(true)} onNewDM={() => setDmOpen(true)} />
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
  const channel = channels.find((c) => c.id === channelId)
  const title = channel ? channelTitle(channel, profile?.id) : 'Chat'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar title={title} back="/chat" />
      <ChatThread key={channelId} channelId={channelId} hideHeader />
    </div>
  )
}

interface MobileChatHubProps {
  onSelect: (id: string) => void
  onNewChannel: () => void
  onNewDM: () => void
}

function MobileChatHub({ onSelect, onNewChannel, onNewDM }: MobileChatHubProps) {
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
            />
          ))}
        </div>
      )}
    </StackScreen>
  )
}
