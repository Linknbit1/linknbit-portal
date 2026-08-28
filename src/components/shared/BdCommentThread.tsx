import { useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import { MessageSquare, Send, Trash2, Pencil, X, Check } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { PersonLink } from './PersonLink'
import { RichEditor } from '../editor/RichEditor'
import { RichRenderer } from '../editor/RichRenderer'
import { useAuthContext } from '../../context/AuthContext'
import { useBd } from '../../context/BdContext'
import {
  useBdComments, useCreateBdComment, useDeleteBdComment, useUpdateBdComment, useSyncBdMentions,
} from '../../hooks/useBd'
import { useRealtimeBdComments } from '../../hooks/realtime/useRealtimeBdComments'
import { docToPlainText, extractMentionIds, fromDbDoc, isEmptyDoc, toDbDoc } from '../../lib/richText'
import { formatRelativeTime } from '../../lib/utils'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import type { BdComment, BdCommentParent } from '../../api/bd'

interface BdCommentThreadProps {
  parentType: BdCommentParent
  parentId: string
  /** Renders inside a fixed-height column that scrolls, rather than growing the page. */
  fill?: boolean
  className?: string
}

/**
 * The discussion on a BD record — a lead, a task or a campaign.
 *
 * One component for all three, because the thread is the same object in each
 * case and splitting it produced three drifting copies in the delivery module.
 *
 * ── Why it never shows a spinner ─────────────────────────────────────────────
 * Pressing Enter paints the comment immediately, dimmed, and sends behind it.
 * A failure removes the bubble and says so — which is honest, and faster than
 * every alternative. See the optimistic contract in src/hooks/useBd.ts.
 *
 * Other people's comments arrive live over Realtime, so two reps working the
 * same lead see one conversation rather than two halves of one.
 */
export function BdCommentThread({ parentType, parentId, fill, className }: BdCommentThreadProps) {
  const { profile } = useAuthContext()
  const { people } = useBd()

  const { data: comments = [] } = useBdComments(parentType, parentId)
  useRealtimeBdComments(parentType, parentId)

  const createComment = useCreateBdComment()
  const deleteComment = useDeleteBdComment(parentType, parentId)
  const updateComment = useUpdateBdComment(parentType, parentId)
  const syncMentions = useSyncBdMentions()

  const [draft, setDraft] = useState<JSONContent | null>(null)
  /**
   * Remounts the composer after a send. The editor deliberately does not sync its
   * `value` prop while mounted (that would fight the typist), so clearing it is a
   * remount — the same reset path every other RichEditor call site uses.
   */
  const [composerKey, setComposerKey] = useState(0)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<JSONContent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BdComment | null>(null)

  /** Anyone in the department is taggable — BD access is department-wide. */
  const mentionItems = useMemo(
    () => people.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })),
    [people],
  )

  /** Oldest first: a thread reads like a conversation, with the composer beneath. */
  const feed = useMemo(
    () => [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments],
  )

  const send = () => {
    if (!profile?.id || isEmptyDoc(draft)) return

    const id = randomUUID()
    const now = new Date().toISOString()
    createComment.mutate({
      comment: {
        id,
        parentType,
        parentId,
        content: docToPlainText(draft),
        doc: toDbDoc(draft),
        authorId: profile.id,
        authorName: profile.name,
        authorAvatar: profile.avatar_url,
        createdAt: now,
        updatedAt: now,
      },
    })

    const mentioned = extractMentionIds(draft)
    if (mentioned.length > 0) {
      syncMentions.mutate({ sourceType: 'bd_comment', sourceId: id, profileIds: mentioned })
    }

    setDraft(null)
    setComposerKey((k) => k + 1)
  }

  const saveEdit = (comment: BdComment) => {
    if (isEmptyDoc(editDraft)) { setEditingId(null); return }
    updateComment.mutate({ id: comment.id, content: docToPlainText(editDraft), doc: toDbDoc(editDraft) })
    // Editing can add a tag that was not there before; the same idempotent sync
    // means a name already tagged is not pinged twice.
    const mentioned = extractMentionIds(editDraft)
    if (mentioned.length > 0) {
      syncMentions.mutate({ sourceType: 'bd_comment', sourceId: comment.id, profileIds: mentioned })
    }
    setEditingId(null)
  }

  return (
    <div className={cn('flex flex-col', fill && 'min-h-0 flex-1', className)}>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border-default px-3 py-2">
        <MessageSquare size={13} className="text-text-4" />
        <span className="font-ui text-[12.5px] font-semibold text-text-2">Comments</span>
        {feed.length > 0 && (
          <span className="rounded-sm bg-surface-3 px-1.5 font-mono text-[10px] font-bold text-text-3">
            {feed.length}
          </span>
        )}
      </div>

      <div className={cn('space-y-4 p-4', fill ? 'flex-1 overflow-y-auto' : 'max-h-96 overflow-y-auto')}>
        {feed.length === 0 && (
          <p className="py-8 text-center font-ui text-[12.5px] text-text-4">
            No comments yet, start the thread.
          </p>
        )}

        {feed.map((c) => {
          const mine = c.authorId === profile?.id
          const editing = editingId === c.id

          return (
            <div key={c.id} className={cn('group/comment flex gap-2.5', c.pending && 'opacity-55')}>
              <Avatar name={c.authorName} src={c.authorAvatar ?? undefined} size="sm" personId={c.authorId ?? undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PersonLink personId={c.authorId} className="font-ui text-[12.5px] font-semibold text-text-1">
                    {c.authorName}
                  </PersonLink>
                  <span className="font-mono text-[10px] text-text-4">{formatRelativeTime(c.createdAt)}</span>
                  {c.updatedAt !== c.createdAt && !c.pending && (
                    <span className="font-ui text-[10px] text-text-4">edited</span>
                  )}
                  {mine && !editing && !c.pending && (
                    <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100">
                      <button
                        type="button"
                        onClick={() => { setEditingId(c.id); setEditDraft(fromDbDoc(c.doc)) }}
                        aria-label="Edit comment"
                        className="flex size-6 items-center justify-center rounded-xs text-text-4 hover:bg-surface-3 hover:text-text-2"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(c)}
                        aria-label="Delete comment"
                        className="flex size-6 items-center justify-center rounded-xs text-text-4 hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  )}
                </div>

                {editing ? (
                  <div className="mt-1 space-y-1.5">
                    <div className="rounded-md border border-border-focus bg-surface-inset px-3 py-2">
                      <RichEditor
                        value={fromDbDoc(c.doc)}
                        onChange={setEditDraft}
                        compact
                        onSubmit={() => saveEdit(c)}
                        mentionItems={mentionItems}
                        autoFocus
                        placeholder="Edit your comment…"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" iconLeft={<Check size={12} />} onClick={() => saveEdit(c)}>Save</Button>
                      <Button size="sm" variant="secondary" iconLeft={<X size={12} />} onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : c.doc ? (
                  <RichRenderer doc={fromDbDoc(c.doc)} className="font-ui text-[13px] text-text-2" />
                ) : (
                  <p className="whitespace-pre-wrap font-ui text-[13px] text-text-2">{c.content}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border-default p-3">
        <div className="min-h-16 rounded-md border border-border-default bg-surface-inset px-3 py-2 focus-within:border-border-focus">
          <RichEditor
            key={composerKey}
            value={null}
            onChange={setDraft}
            compact
            onSubmit={send}
            mentionItems={mentionItems}
            placeholder="Write a comment… @ to mention someone"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-ui text-[11px] text-text-4">Enter to send · Shift+Enter for a new line</span>
          <Button size="sm" iconLeft={<Send size={13} />} onClick={send}>Send</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteComment.mutate({ id: confirmDelete.id })
          setConfirmDelete(null)
        }}
        title="Delete this comment?"
        message={confirmDelete?.content || 'This comment will be removed for everyone.'}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
