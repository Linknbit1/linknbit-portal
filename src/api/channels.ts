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
  /** Whether the viewer silenced notifications for this conversation. */
  muted?: boolean
  /** Whether the viewer may rename it, recategorise it and manage its people. */
  can_manage?: boolean
}

export interface CreateChannelArgs {
  name: string
  description?: string | null
  memberIds: string[]
  /** Roles granted the channel — every current holder is added as a member. */
  roles?: string[]
  /** Confidential: only channel managers may add people. */
  isPrivate?: boolean
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
    .select('*, channel_members(profile_id,hidden_at,notifications_muted,can_manage,profile:profiles(id,name,avatar_url)), messages(body_text,created_at)')
    .order('updated_at', { ascending: false })
    // A deleted message leaves a tombstone in the thread, but it must not be the
    // line that represents the conversation in the list -- the preview would go
    // on quoting text that is no longer there. Filtering the embedded rows (no
    // `!inner`) keeps channels that have nothing left to preview.
    .is('messages.deleted_at', null)
    // Only the newest surviving message per channel. Without these two the
    // nested select would pull each channel's entire history just to render a
    // one-line preview.
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
        muted: membership?.notifications_muted ?? false,
        can_manage: membership?.can_manage ?? false,
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
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('channels')
    .select('*, channel_members(profile_id,can_manage,profile:profiles(id,name,avatar_url))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const mine = (data.channel_members ?? []).find((m) => m.profile_id === auth.user?.id)
  return {
    ...data,
    members: (data.channel_members ?? []).flatMap((m) => (m.profile ? [m.profile] : [])),
    can_manage: mine?.can_manage ?? false,
    last_message_at: null,
    last_message_preview: null,
  }
}

/**
 * Creates a channel with its owner, members, and role grants in one atomic
 * call. This has to be a single server-side function: the channels SELECT
 * policy requires membership, so an INSERT ... RETURNING from the client fails
 * on the way back — the creator isn't a member until the next statement.
 */
export async function createChannel(args: CreateChannelArgs): Promise<ChannelRow> {
  const { data: channelId, error } = await supabase.rpc('fn_create_channel', {
    p_name: args.name,
    p_description: args.description ?? undefined,
    p_is_private: args.isPrivate ?? false,
    p_member_ids: args.memberIds,
    p_roles: args.roles ?? [],
  })
  if (error) throw error

  // Readable now that the owner row exists.
  const { data, error: fetchError } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single()
  if (fetchError) throw fetchError
  return data
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

/** Who may post in a channel. DMs ignore this: both people always can. */
export async function setChannelPostPolicy(
  channelId: string,
  policy: 'everyone' | 'managers',
): Promise<void> {
  const { error } = await supabase.from('channels').update({ post_policy: policy }).eq('id', channelId)
  if (error) throw error
}

/**
 * Grants or removes the right to change a channel.
 *
 * A flag on the membership rather than a role called "owner": several people can
 * hold it, losing one does not leave the channel unmanageable, and it does not
 * imply anybody owns a conversation.
 */
export async function setChannelManager(
  channelId: string,
  profileId: string,
  canManage: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('channel_members')
    .update({ can_manage: canManage })
    .eq('channel_id', channelId)
    .eq('profile_id', profileId)
  if (error) throw error
}
