import { useEffect, useRef } from 'react'
import type { JSONContent } from '@tiptap/react'
import { RichEditor } from './RichEditor'
import { extractMentionIds, isEmptyDoc, toDbDoc, fromDbDoc, docToPlainText } from '../../lib/richText'
import { useSyncBdMentions } from '../../hooks/useBd'
import type { BdMentionSource } from '../../api/bd'
import type { PersonMini } from '../../api/projects'
import type { Json } from '../../types/database'

interface BdDocEditorProps {
  value: Json | null | undefined
  /**
   * Persist the document and its plain-text mirror. `doc` is null when the field
   * has been emptied, so the column stores null rather than an empty paragraph.
   */
  onSave: (doc: Json | null, plainText: string | null) => void
  mentionItems: PersonMini[]
  placeholder?: string
  /** Where this doc lives, so newly-added @mentions can be recorded and notified. */
  source: { type: BdMentionSource; id: string }
  className?: string
}

/**
 * How long a field can sit untouched before it saves anyway. Long on purpose:
 * blur is the real trigger, and this only exists so a tab closed mid-sentence
 * does not lose the paragraph.
 */
const IDLE_SAVE_MS = 30_000

/**
 * Autosaving rich-text description for a BD record — the BD twin of DocEditor.
 *
 * Separate from DocEditor for one reason: mentions. That component records
 * against the `mentions` table, whose project_id is a NOT NULL foreign key to
 * delivery `projects`, and a lead has no delivery project. Everything else — the
 * editor, the document format, the blur-to-save contract — is genuinely shared.
 *
 * Saving on blur rather than a keystroke debounce is deliberate: one edit should
 * read as one event, and the moment you stop editing is when that is known.
 *
 * Give it a stable `key` per record so switching records remounts it with fresh
 * content — RichEditor does not re-sync its `value` while mounted, or an autosave
 * round trip would overwrite whatever was typed during it.
 */
export function BdDocEditor({ value, onSave, mentionItems, placeholder, source, className }: BdDocEditorProps) {
  const syncMentions = useSyncBdMentions()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef<JSONContent | null>(fromDbDoc(value ?? null))
  /** Nothing to write unless something actually changed since the last save. */
  const dirty = useRef(false)

  // Read through refs: `flush` is captured by an unmount effect that must not
  // re-run per render, so the values it reads have to be current, not captured.
  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  const sourceRef = useRef(source)
  useEffect(() => { sourceRef.current = source }, [source])

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = undefined }
    if (!dirty.current) return
    dirty.current = false

    const doc = latest.current
    const empty = isEmptyDoc(doc)
    onSaveRef.current(empty ? null : toDbDoc(doc), empty ? null : docToPlainText(doc))

    const mentioned = extractMentionIds(doc)
    if (sourceRef.current.id && mentioned.length > 0) {
      syncMentions.mutate({
        sourceType: sourceRef.current.type,
        sourceId: sourceRef.current.id,
        profileIds: mentioned,
      })
    }
  }

  const handleChange = (doc: JSONContent) => {
    latest.current = doc
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, IDLE_SAVE_MS)
  }

  // Closing the drawer or leaving the page counts as leaving the field.
  useEffect(() => () => { flush() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RichEditor
      value={fromDbDoc(value ?? null)}
      onChange={handleChange}
      onBlur={flush}
      mentionItems={mentionItems}
      placeholder={placeholder}
      className={className}
    />
  )
}
