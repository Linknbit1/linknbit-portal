import { useEffect, useMemo, useState } from 'react'
import { type JSONContent } from '@tiptap/react'
import { Hash, Users as UsersIcon, PanelRight, Lock } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/cn'
import { ConversationInfoPanel } from './ConversationInfoPanel'
import { MessageList } from './MessageList'
import { MessageComposer, type ComposerPayload } from './MessageComposer'
import { useToast } from '../ui/toast-context'
import { useChannel } from '../../hooks/useChannels'
import { useChannelMembers } from '../../hooks/useChannelMembers'
import { useFlatMessages, useSendMessage, useEditMessage, useDeleteMessage, useMarkChannelRead } from '../../hooks/useMessages'
import { useMessageAttachments } from '../../hooks/useMessageAttachments'
import { useChannelReactions, useToggleReaction } from '../../hooks/useMessageReactions'
import { useRealtimeChatMessages } from '../../hooks/realtime/useRealtimeChatMessages'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useTeams } from '../../hooks/useTeams'
import { useServices } from '../../hooks/useServices'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { EVERYONE_MENTION_ID } from '../../lib/richText'
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
  // Read out once: several memos below depend on the id, not the whole profile.
  const myId = profile?.id
  const { data: channel } = useChannel(channelId)
  // live: these rows carry every member's last_read_at, which is what draws the ticks.
  const { data: members = [] } = useChannelMembers(channelId, { live: true })
  const canModerate = useCanAccess('can_administer_channels')

  const { messages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useFlatMessages(channelId)
  const { mutate: sendMessage } = useSendMessage()
  const { mutate: editMessage } = useEditMessage()
  const { mutate: deleteMessage } = useDeleteMessage()
  const { mutate: markRead } = useMarkChannelRead()
  const { data: attachments = [] } = useMessageAttachments(channelId)
  const { data: reactions = [] } = useChannelReactions(channelId)
  const { mutate: toggleReaction } = useToggleReaction()
  const [editing, setEditing] = useState<{ id: string; doc: JSONContent | null } | null>(null)
  const [replyTo, setReplyTo] = useState<MessageWithAuthor | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useRealtimeChatMessages(channelId)

  // Clear the unread badge on open and whenever new messages land while open.
  useEffect(() => {
    if (channelId) markRead(channelId)
  }, [channelId, messages.length, markRead])

  /**
   * Who has read as far as a given message.
   *
   * Derived from last_read_at rather than stored per message: a receipt table
   * would be one row per member per message for information that this single
   * timestamp already carries. You are excluded, since your own message being
   * seen by you is not news.
   */
  /**
   * Everyone except me, with how far they have read, as a timestamp.
   *
   * The memo holds data rather than a closure: memoising a returned function is
   * something the React Compiler cannot preserve, and it bails out of optimising
   * the whole component when it sees one.
   */
  const otherReaders = useMemo(
    () => (myId
      ? members
          .filter((m) => m.id !== myId && m.last_read_at)
          .map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url, at: new Date(m.last_read_at).getTime() }))
      : []),
    [members, myId],
  )

  // Not memoised: it closes over `otherReaders`, which is.
  const readersOf = (message: MessageWithAuthor) => {
    const sentAt = new Date(message.created_at).getTime()
    return otherReaders.filter((r) => r.at >= sentAt)
  }

  const mentionItems = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })),
    [members],
  )

  // Only offered to people allowed to use it. Someone without the permission can
  // still type the text, it just reaches nobody, which is how @everyone behaves.
  const canMentionTeams = useCanAccess('can_mention_teams')
  const { data: teams = [] } = useTeams()
  const { data: services = [] } = useServices()
  const teamItems = useMemo(() => {
    if (!canMentionTeams) return []
    // teams.service_type is a service slug, which is where the colour lives.
    const colorBySlug = new Map(services.map((s) => [s.slug, s.color]))
    return teams.map((t) => ({ id: t.id, name: t.name, color: colorBySlug.get(t.service_type) ?? null }))
  }, [canMentionTeams, teams, services])

  /**
   * Ids that make a message "about me": my own, plus every team I am on, plus
   * the @everyone sentinel. Compared against the ids in each message's doc so
   * the thread can pick out the ones that were aimed at me.
   */
  const { data: memberships = [] } = useTeamMembers()
  const myMentionIds = useMemo(() => {
    const ids = new Set<string>([EVERYONE_MENTION_ID])
    if (myId) ids.add(myId)
    for (const m of memberships) {
      if (m.profile_id === myId) ids.add(m.team_id)
    }
    return ids
  }, [memberships, myId])

  const title = channel ? channelTitle(channel, profile?.id) : ''
  const counterpart = channel ? dmCounterpart(channel, profile?.id) : null

  const handleSend = (payload: ComposerPayload) => {
    sendMessage(
      {
        channelId,
        bodyText: payload.bodyText,
        bodyDoc: payload.bodyDoc,
        attachmentIds: payload.attachmentIds,
        replyToId: replyTo?.id ?? null,
        // The quote for the optimistic bubble, so the reply renders complete
        // rather than losing its context until the realtime row arrives.
        replyTo: replyTo
          ? {
              id: replyTo.id,
              body_text: replyTo.body_text,
              deleted_at: null,
              author: replyTo.author ? { id: replyTo.author.id, name: replyTo.author.name } : null,
            }
          : null,
        author: profile ? { id: profile.id, name: profile.name, avatar_url: profile.avatar_url, role: profile.role } : null,
      },
      { onError: () => toast('Message failed to send', 'error') },
    )
    setReplyTo(null)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {!hideHeader && (
        <header className="h-14 shrink-0 border-b border-border-default bg-surface-1 px-4 flex items-center gap-3">
          {channel?.kind === 'channel' ? (
            <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3"><Hash size={15} /></span>
          ) : channel?.kind === 'group_dm' ? (
            <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3"><UsersIcon size={15} /></span>
          ) : (
            <Avatar name={counterpart?.name ?? '?'} src={counterpart?.avatar_url ?? undefined} size="sm" personId={counterpart?.id} />
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 truncate font-display text-[15px] font-bold text-text-1">
              {title}
              {channel?.is_private && (
                <Lock size={12} className="shrink-0 text-text-3" aria-label="Private channel" />
              )}
            </h2>
            {channel?.description && (
              <p className="font-ui text-[11.5px] text-text-4 truncate">{channel.description}</p>
            )}
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1">
            {/* Opens the details panel rather than a modal: managing who is in a
                conversation belongs beside it, and a DM has nobody to add. */}
            <button
              onClick={() => setInfoOpen(true)}
              title="Show members and shared files"
              className="rounded-sm px-2 py-1 font-ui text-[12px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
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
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Wallpaper sits behind the thread as a sibling, never as a wrapper:
              opacity on an ancestor would make the day divider's blur inert. */}
          <span aria-hidden className="chat-wallpaper" />
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
            onReply={setReplyTo}
            readersOf={readersOf}
            audienceSize={members.filter((m) => m.id !== profile?.id).length}
            myMentionIds={myMentionIds}
            // In a one-to-one the side a bubble sits on already says who sent
            // it, so the name above every run is noise.
            showAuthor={channel?.kind !== 'dm'}
          />
        </div>

        {infoOpen && (
          <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-border-default bg-surface-1 lg:flex">
            <ConversationInfoPanel
              channel={channel ?? null}
              counterpart={counterpart}
              title={title}
              memberCount={members.length}
            />
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
        teamItems={teamItems}
        replyTo={replyTo}
        replyAttachment={replyTo ? attachments.find((a) => a.message_id === replyTo.id) : null}
        onCancelReply={() => setReplyTo(null)}
        onSaveEdit={(payload) => {
          if (!editing) return
          editMessage(
            { id: editing.id, channelId, bodyText: payload.bodyText, bodyDoc: payload.bodyDoc },
            { onError: () => toast('Could not save the edit', 'error') },
          )
          setEditing(null)
        }}
      />

    </div>
  )
}
