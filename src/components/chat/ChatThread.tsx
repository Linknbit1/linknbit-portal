import { useEffect, useMemo, useState } from 'react'
import { type JSONContent } from '@tiptap/react'
import { Hash, Users as UsersIcon, PanelRight } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/cn'
import { ChannelFilesPanel } from './ChannelFilesPanel'
import { MessageList } from './MessageList'
import { MessageComposer, type ComposerPayload } from './MessageComposer'
import { ChannelMembersModal } from './ChannelMembersModal'
import { useToast } from '../ui/toast-context'
import { useChannel } from '../../hooks/useChannels'
import { useChannelMembers } from '../../hooks/useChannelMembers'
import { useFlatMessages, useSendMessage, useEditMessage, useDeleteMessage, useMarkChannelRead } from '../../hooks/useMessages'
import { useMessageAttachments } from '../../hooks/useMessageAttachments'
import { useChannelReactions, useToggleReaction } from '../../hooks/useMessageReactions'
import { useRealtimeChatMessages } from '../../hooks/realtime/useRealtimeChatMessages'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useAuthContext } from '../../context/AuthContext'
import { fromDbDoc } from '../../lib/richText'
import { channelTitle, dmCounterpart } from './chatUtils'
import type { MessageWithAuthor } from '../../api/messages'

interface ChatThreadProps {
  channelId: string
  /** The mobile stack screen supplies its own header, so this hides the inline one. */
  hideHeader?: boolean
}

export function ChatThread({ channelId, hideHeader }: ChatThreadProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: channel } = useChannel(channelId)
  const { data: members = [] } = useChannelMembers(channelId)
  const canModerate = useCanAccess('can_delete_any_message')
  const canManageAll = useCanAccess('can_manage_all_channels')

  const { messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useFlatMessages(channelId)
  const { mutate: sendMessage } = useSendMessage()
  const { mutate: editMessage } = useEditMessage()
  const { mutate: deleteMessage } = useDeleteMessage()
  const { mutate: markRead } = useMarkChannelRead()
  const { data: attachments = [] } = useMessageAttachments(channelId)
  const { data: reactions = [] } = useChannelReactions(channelId)
  const { mutate: toggleReaction } = useToggleReaction()
  const [editing, setEditing] = useState<{ id: string; doc: JSONContent | null } | null>(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useRealtimeChatMessages(channelId)

  // Clear the unread badge on open and whenever new messages land while open.
  useEffect(() => {
    if (channelId) markRead(channelId)
  }, [channelId, messages.length, markRead])

  const mentionItems = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })),
    [members],
  )

  const isOwner = members.some((m) => m.id === profile?.id && m.role_in_channel === 'owner')
  const title = channel ? channelTitle(channel, profile?.id) : ''
  const counterpart = channel ? dmCounterpart(channel, profile?.id) : null

  const handleSend = (payload: ComposerPayload) => {
    sendMessage(
      {
        channelId,
        bodyText: payload.bodyText,
        bodyDoc: payload.bodyDoc,
        attachmentIds: payload.attachmentIds,
        author: profile ? { id: profile.id, name: profile.name, avatar_url: profile.avatar_url, role: profile.role } : null,
      },
      { onError: () => toast('Message failed to send', 'error') },
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {!hideHeader && (
        <header className="h-14 shrink-0 border-b border-border-default bg-surface-1 px-4 flex items-center gap-3">
          {channel?.kind === 'channel' ? (
            <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3"><Hash size={15} /></span>
          ) : channel?.kind === 'group_dm' ? (
            <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3"><UsersIcon size={15} /></span>
          ) : (
            <Avatar name={counterpart?.name ?? '?'} src={counterpart?.avatar_url ?? undefined} size="sm" />
          )}
          <div className="min-w-0">
            <h2 className="font-display font-bold text-[15px] text-text-1 truncate">{title}</h2>
            {channel?.description && (
              <p className="font-ui text-[11.5px] text-text-4 truncate">{channel.description}</p>
            )}
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1">
            <button
              onClick={() => setMembersOpen(true)}
              className="font-ui text-[12px] text-text-3 hover:text-text-1 transition-colors px-2"
            >
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </button>
            <button
              onClick={() => setInfoOpen((v) => !v)}
              aria-label="Shared media, links and files"
              title="Shared media, links and files"
              className={cn(
                'size-7 rounded-sm flex items-center justify-center transition-colors',
                infoOpen ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1 hover:bg-surface-3',
              )}
            >
              <PanelRight size={15} />
            </button>
          </div>
        </header>
      )}

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadOlder={() => fetchNextPage()}
            canModerate={canModerate}
            myProfileId={profile?.id}
            attachments={attachments}
            reactions={reactions}
            onDelete={(id) => deleteMessage({ id, channelId }, { onError: () => toast('Could not delete that message', 'error') })}
            onEdit={(m: MessageWithAuthor) => setEditing({ id: m.id, doc: fromDbDoc(m.body_doc) })}
            onToggleReaction={(messageId, emoji) =>
              toggleReaction({ messageId, emoji, channelId }, { onError: () => toast('Could not react to that message', 'error') })}
          />
        </div>

        {infoOpen && (
          <aside className="w-72 shrink-0 border-l border-border-default bg-surface-1 hidden lg:flex flex-col min-h-0">
            <ChannelFilesPanel channelId={channelId} />
          </aside>
        )}
      </div>

      <MessageComposer
        // Remounting is what loads the message being edited into the input —
        // the composer seeds its state on mount and never re-syncs after.
        key={editing?.id ?? 'new'}
        channelId={channelId}
        mentionItems={mentionItems}
        placeholder={channel?.kind === 'channel' ? `Message #${title}` : `Message ${title}`}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSend={handleSend}
        onSaveEdit={(payload) => {
          if (!editing) return
          editMessage(
            { id: editing.id, channelId, bodyText: payload.bodyText, bodyDoc: payload.bodyDoc },
            { onError: () => toast('Could not save the edit', 'error') },
          )
          setEditing(null)
        }}
      />

      <ChannelMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        channelId={channelId}
        canManage={canManageAll || isOwner}
      />
    </div>
  )
}
