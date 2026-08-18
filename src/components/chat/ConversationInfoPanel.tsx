import { useState } from 'react'
import { Hash, Users as UsersIcon, Settings2 } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Count } from '../ui/Count'
import { ChannelFilesPanel } from './ChannelFilesPanel'
import { ChannelMembersModal } from './ChannelMembersModal'
import { UserProfileBody } from '../shared/UserProfileBody'
import { PersonLink } from '../shared/PersonLink'
import { ProfileRoles } from '../shared/ProfileRoles'
import { useChannelMembers } from '../../hooks/useChannelMembers'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useAuthContext } from '../../context/AuthContext'
import type { ChannelListItem } from '../../api/channels'
import type { PersonMini } from '../../api/projects'

interface ConversationInfoPanelProps {
  channel: ChannelListItem | null
  counterpart: PersonMini | null
  title: string
  memberCount: number
}

/**
 * The right-hand panel: who (or what) you're talking to, then everyone in the
 * conversation, then everything shared in it. DMs show the other person's
 * profile — the same block the popover card uses.
 */
export function ConversationInfoPanel({ channel, counterpart, title, memberCount }: ConversationInfoPanelProps) {
  const isDM = channel?.kind === 'dm'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border-default p-4">
        {isDM && counterpart ? (
          <UserProfileBody
            profileId={counterpart.id}
            fallbackName={counterpart.name}
            fallbackAvatar={counterpart.avatar_url}
          />
        ) : (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 text-text-3">
              {channel?.kind === 'group_dm' ? <UsersIcon size={26} /> : <Hash size={26} />}
            </span>
            <h3 className="mt-3 font-display text-[16px] font-bold text-text-1">{title}</h3>
            {channel?.description && (
              <p className="mt-1 font-ui text-[12.5px] text-text-3">{channel.description}</p>
            )}
            <p className="mt-2 font-mono text-[11px] text-text-4">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        )}
      </div>

      {channel && <MemberList channelId={channel.id} kind={channel.kind} />}

      <div className="min-h-0 flex-1">
        {channel && <ChannelFilesPanel channelId={channel.id} />}
      </div>
    </div>
  )
}

function MemberList({ channelId, kind }: { channelId: string; kind: ChannelListItem['kind'] }) {
  const { profile } = useAuthContext()
  const { data: members = [] } = useChannelMembers(channelId)
  const canManageAll = useCanAccess('can_manage_all_channels')
  const [manageOpen, setManageOpen] = useState(false)

  const isOwner = members.some((m) => m.id === profile?.id && m.role_in_channel === 'owner')
  // A 1:1 DM is fixed at two people, enforced by trg_guard_dm_membership. The
  // button is hidden here so nobody is offered a dialog the database refuses —
  // the trigger is what actually holds the line, including against admins.
  const canManage = kind !== 'dm' && (canManageAll || isOwner)

  return (
    <div className="shrink-0 border-b border-border-default">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <UsersIcon size={13} className="text-text-3" />
        <h4 className="font-display text-[13px] font-bold text-text-1">Members</h4>
        <Count value={members.length} label={`${members.length} member${members.length === 1 ? '' : 's'}`} />
        {canManage && (
          <button
            onClick={() => setManageOpen(true)}
            className="ml-auto flex items-center gap-1 rounded-sm px-1.5 py-1 font-ui text-[11.5px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            <Settings2 size={12} /> Manage
          </button>
        )}
      </div>

      {/* Capped so a large channel can't push the shared files off-screen. */}
      <div className="max-h-52 overflow-y-auto px-2 pb-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2">
            <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
            <span className="min-w-0 flex-1">
              <PersonLink personId={m.id} className="block truncate font-ui text-[12.5px] text-text-1">
                {m.name}
              </PersonLink>
              <ProfileRoles
                profileId={m.id}
                fallbackRole={m.role}
                variant="text"
                className="block truncate font-mono text-[10px] text-text-4"
              />
            </span>
            {m.role_in_channel === 'owner' && (
              <span className="shrink-0 rounded-xs bg-surface-3 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-3">
                Owner
              </span>
            )}
          </div>
        ))}
      </div>

      <ChannelMembersModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        channelId={channelId}
        canManage={canManage}
      />
    </div>
  )
}
