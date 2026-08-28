import { useRef, useState } from 'react'
import { MoreVertical, CheckCheck, LogOut, Trash2, Bell, BellOff, Circle } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../ui/toast-context'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useHideChannel, useDeleteChannel } from '../../hooks/useChannels'
import { useLeaveChannel, useSetChannelMuted } from '../../hooks/useChannelMembers'
import { useMarkChannelRead, useMarkChannelUnread } from '../../hooks/useMessages'
import { cn } from '../../lib/cn'
import type { ChannelListItem } from '../../api/channels'

type PendingAction = 'leave' | 'delete' | 'hide'

interface ConversationMenuProps {
  channel: ChannelListItem
  title: string
  hasUnread: boolean
  /** Called after the conversation leaves the list, so an open thread can close. */
  onRemoved: (channelId: string) => void
}

/**
 * Per-conversation actions. What "remove this" means depends on the kind:
 * a DM is hidden from your own list (the other person keeps theirs, and a new
 * message brings it back), while a channel is something you leave — or, with
 * the right permission, delete for everyone.
 */
export function ConversationMenu({ channel, title, hasUnread, onRemoved }: ConversationMenuProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<PendingAction | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const canManageAll = useCanAccess('can_manage_all_channels')
  const { mutate: markRead } = useMarkChannelRead()
  const { mutate: markUnread } = useMarkChannelUnread()
  const { mutate: hide, isPending: hiding } = useHideChannel()
  const { mutate: leave, isPending: leaving } = useLeaveChannel()
  const { mutate: destroy, isPending: destroying } = useDeleteChannel()
  const { mutate: setMuted } = useSetChannelMuted()

  const isDM = channel.kind === 'dm'
  const canDeleteForEveryone = channel.kind === 'channel' && canManageAll

  const run = (action: PendingAction) => {
    const done = (message: string) => () => { toast(message, 'success'); setConfirming(null); onRemoved(channel.id) }
    const fail = (message: string) => () => toast(message, 'error')

    if (action === 'hide') {
      hide(channel.id, { onSuccess: done('Conversation removed from your list'), onError: fail('Could not remove that conversation') })
    } else if (action === 'leave') {
      leave(channel.id, { onSuccess: done(`You left ${title}`), onError: fail('Could not leave that conversation') })
    } else {
      destroy(channel.id, { onSuccess: done(`${title} deleted`), onError: fail('Could not delete that channel') })
    }
  }

  const confirmCopy: Record<PendingAction, { title: string; message: string; confirmLabel: string }> = {
    hide: {
      title: 'Delete conversation',
      message: `This removes the conversation with ${title} from your list. They keep their copy, and it comes back here if either of you sends a new message.`,
      confirmLabel: 'Delete',
    },
    leave: {
      title: 'Leave conversation',
      message: `You'll stop receiving messages from ${title} and it disappears from your list. Someone will need to add you back to rejoin.`,
      confirmLabel: 'Leave',
    },
    delete: {
      title: 'Delete channel',
      message: `${title} and its entire message history will be permanently deleted for everyone. This can't be undone.`,
      confirmLabel: 'Delete for everyone',
    },
  }

  const itemClass = 'flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left font-ui text-[12.5px] text-text-2 transition-colors hover:bg-surface-3 hover:text-text-1'

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        aria-label={`Options for ${title}`}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-surface-3 hover:text-text-1',
          open && 'bg-surface-3 text-text-1',
        )}
      >
        <MoreVertical size={15} />
      </button>

      <Popover anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        <div className="w-52 rounded-md border border-border-strong bg-surface-2 p-1 shadow-lg">
          {hasUnread ? (
            <button
              className={itemClass}
              onClick={() => { markRead(channel.id); setOpen(false) }}
            >
              <CheckCheck size={13} /> Mark as read
            </button>
          ) : (
            // Only offered on a conversation that is already read: on an unread
            // one it would do nothing you can see.
            <button
              className={itemClass}
              onClick={() => {
                markUnread(
                  { channelId: channel.id },
                  { onError: () => toast('Could not mark it unread', 'error') },
                )
                setOpen(false)
              }}
            >
              <Circle size={13} /> Mark as unread
            </button>
          )}

          <button
            className={itemClass}
            onClick={() => {
              setMuted(
                { channelId: channel.id, muted: !channel.muted },
                { onError: () => toast('Could not change notifications', 'error') },
              )
              setOpen(false)
            }}
          >
            {channel.muted ? <><Bell size={13} /> Unmute notifications</> : <><BellOff size={13} /> Mute notifications</>}
          </button>

          {!isDM && (
            <button
              className={itemClass}
              onClick={() => { setOpen(false); setConfirming('leave') }}
            >
              <LogOut size={13} /> Leave conversation
            </button>
          )}

          {isDM && (
            <button
              className={cn(itemClass, 'text-error hover:text-error')}
              onClick={() => { setOpen(false); setConfirming('hide') }}
            >
              <Trash2 size={13} /> Delete conversation
            </button>
          )}

          {canDeleteForEveryone && (
            <button
              className={cn(itemClass, 'text-error hover:text-error')}
              onClick={() => { setOpen(false); setConfirming('delete') }}
            >
              <Trash2 size={13} /> Delete for everyone
            </button>
          )}
        </div>
      </Popover>

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && run(confirming)}
        isPending={hiding || leaving || destroying}
        danger
        title={confirming ? confirmCopy[confirming].title : ''}
        message={confirming ? confirmCopy[confirming].message : ''}
        confirmLabel={confirming ? confirmCopy[confirming].confirmLabel : 'Confirm'}
      />
    </>
  )
}
