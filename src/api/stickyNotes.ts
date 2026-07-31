import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type StickyNote = Tables<'sticky_notes'>

export type NoteColor = 'pink' | 'lavender' | 'mint' | 'peach' | 'butter' | 'sky'
export type NoteShape =
  | 'square'
  | 'folded'
  | 'torn'
  | 'wavy'
  | 'tag'
  | 'petal'
  | 'ticket'
  | 'scallop'
  | 'parallelogram'
  | 'star'
  | 'house'
  | 'bubble'
  | 'hexagon'
  | 'pennant'

/** Paragraph alignment, applied via the TipTap editor to the block(s) in range. */
export type NoteAlign = 'left' | 'center' | 'right'

export const NOTE_COLORS: NoteColor[] = ['pink', 'lavender', 'mint', 'peach', 'butter', 'sky']
export const NOTE_SHAPES: NoteShape[] = [
  'square',
  'folded',
  'torn',
  'wavy',
  'tag',
  'petal',
  'ticket',
  'scallop',
  'parallelogram',
  'star',
  'house',
  'bubble',
  'hexagon',
  'pennant',
]

/**
 * Notes are owner-only at the database level, so no profile filter is needed
 * here — RLS returns exactly the caller's board.
 */
export async function fetchStickyNotes(): Promise<StickyNote[]> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export interface CreateStickyNoteInput {
  profileId: string
  content?: string
  color: NoteColor
  shape: NoteShape
  rotation: number
  posX: number
  posY: number
  /** Edge length in board units; omit to take the DB default. */
  size?: number
}

export async function createStickyNote(input: CreateStickyNoteInput): Promise<StickyNote> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .insert({
      profile_id: input.profileId,
      content: input.content ?? '',
      color: input.color,
      shape: input.shape,
      rotation: input.rotation,
      pos_x: input.posX,
      pos_y: input.posY,
      ...(input.size === undefined ? {} : { size: input.size }),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface UpdateStickyNoteInput {
  id: string
  /** TipTap JSON (stringified). Bold/italic/strike/alignment now live inside it. */
  content?: string
  color?: NoteColor
  shape?: NoteShape
  posX?: number
  posY?: number
  /** Paint order; the board raises a note by stamping it with max + 1. */
  zIndex?: number
  /** Edge length in board units. */
  size?: number
}

export async function updateStickyNote(
  { id, posX, posY, zIndex, ...rest }: UpdateStickyNoteInput,
): Promise<void> {
  const { error } = await supabase
    .from('sticky_notes')
    .update({
      ...rest,
      ...(posX === undefined ? {} : { pos_x: posX }),
      ...(posY === undefined ? {} : { pos_y: posY }),
      ...(zIndex === undefined ? {} : { z_index: zIndex }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteStickyNote(id: string): Promise<void> {
  const { error } = await supabase.from('sticky_notes').delete().eq('id', id)
  if (error) throw error
}
