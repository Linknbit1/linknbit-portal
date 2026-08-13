import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type StatusLabelRow = Tables<'status_labels'>
export type StatusScope = 'task' | 'project'

export interface StatusLabelPatch {
  scope: StatusScope
  key: string
  label: string
  color: string
}

/**
 * Every status override, both scopes in one round trip — the set is fourteen
 * rows and chips render everywhere, so splitting it per scope would only add
 * requests.
 */
export async function fetchStatusLabels(): Promise<StatusLabelRow[]> {
  const { data, error } = await supabase.from('status_labels').select('*')
  if (error) throw error
  return data
}

/**
 * Upsert rather than update: the table is presentation, so a key with no row is
 * legitimate (it falls back to the built-in label), and saving one should create
 * it rather than fail.
 */
export async function saveStatusLabel(patch: StatusLabelPatch): Promise<StatusLabelRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('status_labels')
    .upsert(
      {
        scope: patch.scope,
        key: patch.key,
        label: patch.label.trim(),
        color: patch.color,
        updated_by: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'scope,key' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Drops the override so the status falls back to its built-in name and colour. */
export async function resetStatusLabel(scope: StatusScope, key: string): Promise<void> {
  const { error } = await supabase.from('status_labels').delete().eq('scope', scope).eq('key', key)
  if (error) throw error
}
