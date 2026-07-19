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
    if (Array.isArray(node.content)) {
      node.content.forEach(walk)
      // Block-level nodes end a line.
      if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type ?? '')) parts.push('\n')
    }
  }
  walk(doc)
  return parts.join('').replace(/\n{2,}/g, '\n').trim()
}

/** Collect the profile ids of every @mention in a doc (deduped). */
export function extractMentionIds(doc: JSONContent | null | undefined): string[] {
  const ids = new Set<string>()
  const walk = (node: JSONContent) => {
    if (node.type === 'mention' && typeof node.attrs?.id === 'string') ids.add(node.attrs.id)
    if (Array.isArray(node.content)) node.content.forEach(walk)
  }
  if (doc) walk(doc)
  return [...ids]
}
