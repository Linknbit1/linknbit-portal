import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { PersonMini } from './projects'
import { fileKind, type FileKind } from '../lib/attachment'

export type ChannelRow = Tables<'channels'>
export type ChannelKind = 'channel' | 'dm' | 'group_dm'

export interface ChannelListItem extends ChannelRow {
  members: PersonMini[]
  last_message_at: string | null
  last_message_preview: string | null
  /**
   * Who sent the newest message. The list draws read ticks on a row only when
   * the last word in it was yours, the same rule the thread uses per message.
   */
  last_message_author_id: string | null
  /** How many members other than you have read as far as that newest message. */
  last_message_seen_by: number
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
 * The one line that stands for a message in the conversation list.
 *
 * A message can be a picture and nothing else, in which case body_text is empty
 * — and an empty preview used to fall through to "No messages yet", which said
 * the conversation was empty when it plainly was not. Naming the kind of file
 * is what the messaging apps do, and it is what somebody scanning the list can
 * actually use.
 */
function messagePreview(
  bodyText: string | null,
  attachments: { file_name: string; mime_type: string | null }[] | null,
): string | null {
  if (bodyText) return bodyText

  const first = attachments?.[0]
  if (!first) return null

  const more = (attachments?.length ?? 0) - 1
  const label = LABEL_BY_KIND[fileKind(first.mime_type ?? '', first.file_name)] ?? first.file_name
  return more > 0 ? `${label} +${more}` : label
}

const LABEL_BY_KIND: Partial<Record<FileKind, string>> = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice message',
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
    .select('*, channel_members(profile_id,hidden_at,notifications_muted,can_manage,last_read_at,profile:profiles(id,name,avatar_url)), messages(author_id,body_text,created_at,message_attachments(file_name,mime_type))')
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
      // Read as far as the newest message, which is all a row-level tick needs.
      // Parsed rather than compared as strings: both are ISO timestamps today,
      // but a tick silently stuck on "sent" is a poor way to find out that
      // stopped being true.
      const latestMs = latest ? new Date(latest.created_at).getTime() : null
      const seenBy = latestMs === null
        ? 0
        : (c.channel_members ?? []).filter(
            (m) => m.profile_id !== me && m.last_read_at && new Date(m.last_read_at).getTime() >= latestMs,
          ).length
      return {
        ...c,
        members: (c.channel_members ?? []).flatMap((m) => (m.profile ? [m.profile] : [])),
        last_message_at: latest?.created_at ?? null,
        last_message_preview: latest ? messagePreview(latest.body_text, latest.message_attachments) : null,
        last_message_author_id: latest?.author_id ?? null,
        last_message_seen_by: seenBy,
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
    // The list row is what shows a preview and its ticks; the open thread draws
    // its own per-message ones, so this shape carries none.
    last_message_at: null,
    last_message_preview: null,
    last_message_author_id: null,
    last_message_seen_by: 0,
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
