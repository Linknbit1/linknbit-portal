import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { PersonMini } from './projects'

export type ChannelRow = Tables<'channels'>
export type ChannelKind = 'channel' | 'dm' | 'group_dm'

export interface ChannelListItem extends ChannelRow {
  members: PersonMini[]
  last_message_at: string | null
  last_message_preview: string | null
  /** When the viewer removed this from their own list, if they did. */
  hidden_at?: string | null
}

export interface CreateChannelArgs {
  name: string
  description?: string | null
  memberIds: string[]
}

/**
 * Every channel the caller belongs to (RLS scopes this to their memberships),
 * newest activity first. Member profiles come along so DM rows can render the
 * other person's name/avatar without a second round-trip.
 */
export async function fetchChannels(): Promise<ChannelListItem[]> {
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id ?? null

  const { data, error } = await supabase
    .from('channels')
    .select('*, channel_members(profile_id,hidden_at,profile:profiles(id,name,avatar_url)), messages(body_text,created_at)')
    .order('updated_at', { ascending: false })
    // Only the newest message per channel — without these two the nested select
    // would pull each channel's entire history just to render a one-line preview.
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
  if (error) throw error

  return data
    .map((c) => {
      const latest = c.messages?.[0] ?? null
      const membership = (c.channel_members ?? []).find((m) => m.profile_id === me)
      return {
        ...c,
        members: (c.channel_members ?? []).flatMap((m) => (m.profile ? [m.profile] : [])),
        last_message_at: latest?.created_at ?? null,
        last_message_preview: latest?.body_text ?? null,
        hidden_at: membership?.hidden_at ?? null,
      }
    })
    // A conversation you removed from your list stays hidden until someone
    // sends something new, which is what makes "delete" non-destructive.
    .filter((c) => !c.hidden_at || (c.last_message_at !== null && c.last_message_at > c.hidden_at))
}

/** Removes a conversation from your own list only; history and other members are untouched. */
export async function hideChannel(channelId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_hide_channel', { p_channel_id: channelId })
  if (error) throw error
}

export async function fetchChannel(id: string): Promise<ChannelListItem | null> {
  const { data, error } = await supabase
    .from('channels')
    .select('*, channel_members(profile:profiles(id,name,avatar_url))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...data,
    members: (data.channel_members ?? []).flatMap((m) => (m.profile ? [m.profile] : [])),
    last_message_at: null,
    last_message_preview: null,
  }
}

/** Named channel + its member rows. Creator becomes the channel owner. */
export async function createChannel(args: CreateChannelArgs): Promise<ChannelRow> {
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id ?? null

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({ kind: 'channel', name: args.name, description: args.description ?? null, created_by: me })
    .select()
    .single()
  if (error) throw error

  const rows = [
    { channel_id: channel.id, profile_id: me!, role_in_channel: 'owner' },
    ...args.memberIds
      .filter((id) => id !== me)
      .map((profile_id) => ({ channel_id: channel.id, profile_id, role_in_channel: 'member' })),
  ]

  const { error: memberError } = await supabase
    .from('channel_members')
    .upsert(rows, { onConflict: 'channel_id,profile_id' })
  if (memberError) {
    // Don't leave a channel nobody can reach behind.
    await supabase.from('channels').delete().eq('id', channel.id)
    throw memberError
  }

  return channel
}

/** Returns the existing 1:1 dm with this person, or creates it. */
export async function createDM(otherProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_get_or_create_dm', { p_other_profile_id: otherProfileId })
  if (error) throw error
  return data
}

export async function updateChannel(
  id: string,
  patch: { name?: string | null; description?: string | null; is_archived?: boolean },
): Promise<void> {
  const { error } = await supabase.from('channels').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from('channels').delete().eq('id', id)
  if (error) throw error
}
