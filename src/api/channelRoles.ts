import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ChannelRoleRow = Tables<'channel_roles'>

/** Roles granted access to a channel. */
export async function fetchChannelRoles(channelId: string): Promise<ChannelRoleRow[]> {
  const { data, error } = await supabase
    .from('channel_roles')
    .select('*')
    .eq('channel_id', channelId)
    .order('role')
  if (error) throw error
  return data
}

/**
 * Grants a role the channel. Every current holder is added as a member by the
 * RPC, and anyone who takes that role later is added automatically.
 */
export async function addChannelRole(channelId: string, role: string): Promise<void> {
  const { error } = await supabase.rpc('fn_add_channel_role', { p_channel_id: channelId, p_role: role })
  if (error) throw error
}

/** Revokes the role, removing only the members it brought in. */
export async function removeChannelRole(channelId: string, role: string): Promise<void> {
  const { error } = await supabase.rpc('fn_remove_channel_role', { p_channel_id: channelId, p_role: role })
  if (error) throw error
}
