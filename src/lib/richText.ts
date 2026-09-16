import type { JSONContent } from '@tiptap/react'
import type { Json } from '../types/database'

/** An empty ProseMirror document (single empty paragraph). */
export function emptyDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

// TipTap's JSONContent and Supabase's Json both describe arbitrary JSON; the two
// converters below are the single sanctioned boundary between them (jsonb columns
// store the editor document verbatim). The casts are safe: a ProseMirror doc is
// always valid JSON.
export function toDbDoc(doc: JSONContent | null): Json {
  return (doc ?? null) as unknown as Json
}
export function fromDbDoc(json: Json | null | undefined): JSONContent | null {
  return (json ?? null) as JSONContent | null
}

/** True when a doc has no meaningful content (used to store null instead of an empty doc). */
export function isEmptyDoc(doc: JSONContent | null | undefined): boolean {
  if (!doc) return true
  return docToPlainText(doc).trim().length === 0
}

/**
 * Flatten a rich doc to plain text — used for card excerpts, search, and the
 * plain-text mirror stored alongside the rich `doc` (comment.content, etc.).
 * Mention/file-ref nodes contribute their label so notifications read naturally.
 */
export function docToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) return ''
  const parts: string[] = []
  const walk = (node: JSONContent) => {
    if (node.type === 'text' && typeof node.text === 'string') parts.push(node.text)
    else if (node.type === 'mention') parts.push(`@${node.attrs?.label ?? node.attrs?.id ?? ''}`)
    else if (node.type === 'fileRef') parts.push(node.attrs?.label ?? 'file')
    // A hard break is a line with no block of its own, so it has to end its line
    // here or the two halves run together in every preview and notification.
    else if (node.type === 'hardBreak') parts.push('\n')
    if (Array.isArray(node.content)) {
      node.content.forEach(walk)
      // Block-level nodes end a line.
      if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type ?? '')) parts.push('\n')
    }
  }
  walk(doc)
  return parts.join('').replace(/\n{2,}/g, '\n').trim()
}

/**
 * Inverse of docToPlainText, for surfaces that edit the mirror rather than the
 * rich doc (the task form's plain textarea). Each line becomes a paragraph, so
 * the rich editor shows the same text instead of going stale.
 */
export function plainTextToDoc(text: string): JSONContent | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return {
    type: 'doc',
    content: trimmed.split('\n').map((line) =>
      line.length > 0
        ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
        : { type: 'paragraph' },
    ),
  }
}

/** Collect the profile ids of every @mention in a doc (deduped). */
/**
 * The id behind @everyone. A real-looking UUID that can belong to no profile:
 * fn_extract_mention_ids only keeps values of UUID shape, so a literal
 * "everyone" would be dropped before the notifier ever saw it.
 */
export const EVERYONE_MENTION_ID = '00000000-0000-0000-0000-000000000000'

export function extractMentionIds(doc: JSONContent | null | undefined): string[] {
  const ids = new Set<string>()
  const walk = (node: JSONContent) => {
    if (node.type === 'mention' && typeof node.attrs?.id === 'string') ids.add(node.attrs.id)
    if (Array.isArray(node.content)) node.content.forEach(walk)
  }
  if (doc) walk(doc)
  return [...ids]
}
