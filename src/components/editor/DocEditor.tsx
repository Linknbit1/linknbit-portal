import { useEffect, useRef } from 'react'
import type { JSONContent } from '@tiptap/react'
import { RichEditor } from './RichEditor'
import { extractMentionIds, isEmptyDoc, toDbDoc, fromDbDoc } from '../../lib/richText'
import { useSyncMentions } from '../../hooks/useMentions'
import type { PersonMini } from '../../api/projects'
import type { FileMentionItem } from './fileMention'
import type { MentionSource } from '../../api/mentions'
import type { Json } from '../../types/database'

interface DocEditorProps {
  value: Json | null
  /** Persist the document (null when empty). Called when the field is left, not per keystroke. */
  onSave: (doc: Json | null) => void
  mentionItems: PersonMini[]
  /** Project files/links taggable with #. */
  fileItems?: FileMentionItem[]
  placeholder?: string
  /** Where this doc lives, so newly-added @mentions can be recorded/notified. */
  source: { type: MentionSource; id: string; projectId: string }
  className?: string
}

/**
 * How long a field can sit untouched before it saves anyway. Long on purpose:
 * blur is the real trigger, and this only exists so a tab closed mid-sentence
 * does not lose the paragraph.
 */
const IDLE_SAVE_MS = 30_000

/**
 * Autosaving rich-text field: persists the doc when you leave it, and records
 * new @mentions (which notify). Give it a stable `key` per record (task/project
 * id) so switching records remounts it with fresh content.
 *
 * Saving on blur rather than a short keystroke debounce is deliberate. Every
 * write to tasks.description lands in the audit trail and the task's Activity
 * feed, and notifies watchers — at 700ms per pause, typing one paragraph
 * produced a dozen "description updated" entries and a dozen pings. One edit
 * should read as one event, and the moment you stop editing is when that is
 * known.
 */
export function DocEditor({ value, onSave, mentionItems, fileItems, placeholder, source, className }: DocEditorProps) {
  const syncMentions = useSyncMentions()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef<JSONContent | null>(fromDbDoc(value))
  /** Nothing to write unless something actually changed since the last save. */
  const dirty = useRef(false)

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = undefined }
    if (!dirty.current) return
    dirty.current = false

    const doc = latest.current
    onSave(isEmptyDoc(doc) ? null : toDbDoc(doc))
    if (source.id) {
      syncMentions.mutate({ sourceType: source.type, sourceId: source.id, projectId: source.projectId, profileIds: extractMentionIds(doc) })
    }
  }

  const handleChange = (doc: JSONContent) => {
    latest.current = doc
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, IDLE_SAVE_MS)
  }

  // Leaving the drawer/page counts as leaving the field.
  useEffect(() => () => { flush() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RichEditor
      value={fromDbDoc(value)}
      onChange={handleChange}
      onBlur={flush}
      mentionItems={mentionItems}
      fileItems={fileItems}
      placeholder={placeholder}
      className={className}
    />
  )
}
