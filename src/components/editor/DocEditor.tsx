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
  /** Persist the document (null when empty). Called debounced. */
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
 * Autosaving rich-text field: debounces edits, persists the doc, and records new
 * @mentions (which notify). Give it a stable `key` per record (task/project id)
 * so switching records remounts it with fresh content.
 */
export function DocEditor({ value, onSave, mentionItems, fileItems, placeholder, source, className }: DocEditorProps) {
  const syncMentions = useSyncMentions()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef<JSONContent | null>(fromDbDoc(value))

  const flush = () => {
    const doc = latest.current
    onSave(isEmptyDoc(doc) ? null : toDbDoc(doc))
    if (source.id) {
      syncMentions.mutate({ sourceType: source.type, sourceId: source.id, projectId: source.projectId, profileIds: extractMentionIds(doc) })
    }
  }

  const handleChange = (doc: JSONContent) => {
    latest.current = doc
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }

  // Flush any pending edit when the field unmounts (e.g. closing the drawer).
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); flush() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RichEditor
      value={fromDbDoc(value)}
      onChange={handleChange}
      mentionItems={mentionItems}
      fileItems={fileItems}
      placeholder={placeholder}
      className={className}
    />
  )
}
