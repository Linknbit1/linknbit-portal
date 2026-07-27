import { supabase } from '../lib/supabase'
import type { PersonMini } from './projects'

export interface ChannelMember extends PersonMini {
  role: string
  role_in_channel: string
  notifications_muted: boolean
  /** Set when the role granted this membership, rather than an individual invite. */
  added_via_role: string | null
}

export async function fetchChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const { data, error } = await supabase
    .from('channel_members')
    .select('role_in_channel, notifications_muted, added_via_role, profile:profiles(id,name,avatar_url,role)')
    .eq('channel_id', channelId)
  if (error) throw error
  return data.flatMap((m) =>
    m.profile
      ? [{
          id: m.profile.id,
          name: m.profile.name,
          avatar_url: m.profile.avatar_url,
          role: m.profile.role,
          role_in_channel: m.role_in_channel,
          notifications_muted: m.notifications_muted,
          added_via_role: m.added_via_role,
        }]
      : [],
  )
}

export async function addChannelMembers(channelId: string, profileIds: string[]): Promise<void> {
  if (profileIds.length === 0) return
  const { error } = await supabase
    .from('channel_members')
    .upsert(
      profileIds.map((profile_id) => ({ channel_id: channelId, profile_id })),
      { onConflict: 'channel_id,profile_id' },
    )
  if (error) throw error
}

export async function removeChannelMember(channelId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('profile_id', profileId)
  if (error) throw error
}

export async function leaveChannel(channelId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('not_authenticated')
  await removeChannelMember(channelId, auth.user.id)
}

export async function setChannelMuted(channelId: string, muted: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('not_authenticated')
  const { error } = await supabase
    .from('channel_members')
    .update({ notifications_muted: muted })
    .eq('channel_id', channelId)
    .eq('profile_id', auth.user.id)
  if (error) throw error
}
