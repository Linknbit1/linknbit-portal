import { useState } from 'react'
import { Hash, Users as UsersIcon, Settings2 } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { ChannelFilesPanel, CHANNEL_FILE_TABS, type ChannelFileTab } from './ChannelFilesPanel'
import { ChannelSettingsModal } from './ChannelSettingsModal'
import { UserProfileBody } from '../shared/UserProfileBody'
import { PersonLink } from '../shared/PersonLink'
import { ProfileRoles } from '../shared/ProfileRoles'
import { useChannelMembers } from '../../hooks/useChannelMembers'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useSetChannelManager } from '../../hooks/useChannels'
import { useToast } from '../ui/toast-context'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import type { ChannelListItem } from '../../api/channels'
import type { ChannelMember } from '../../api/channelMembers'
import type { PersonMini } from '../../api/projects'

type Tab = 'members' | ChannelFileTab

const TABS: { id: Tab; label: string; icon: typeof UsersIcon }[] = [
  { id: 'members', label: 'Members', icon: UsersIcon },
  ...CHANNEL_FILE_TABS,
]

interface ConversationInfoPanelProps {
  channel: ChannelListItem | null
  counterpart: PersonMini | null
  title: string
  memberCount: number
}

/**
 * The right-hand panel: a one-line identity strip, then one tab set covering
 * everyone in the conversation and everything shared in it. Members used to sit
 * above the file tabs in a capped 13rem box; folding it in as a fourth tab gives
 * the roster the panel's full height instead of a fifth of it.
 */
export function ConversationInfoPanel({ channel, counterpart, title, memberCount }: ConversationInfoPanelProps) {
  const { profile } = useAuthContext()
  const isDM = channel?.kind === 'dm'
  const { data: members = [] } = useChannelMembers(channel?.id)
  const canManageAll = useCanAccess('can_manage_all_channels')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('members')

  const iManage = members.some((m) => m.id === profile?.id && m.can_manage)
  // A 1:1 DM is fixed at two people, enforced by trg_guard_dm_membership. The
  // gear is hidden there so nobody is offered a dialog the database refuses —
  // the trigger is what actually holds the line, including against admins.
  const canManage = !!channel && channel.kind !== 'dm' && (canManageAll || iManage)

  // A DM's header already is the other person, so a two-row roster under it
  // would only say the same thing twice.
  const tabs = isDM ? TABS.filter((t) => t.id !== 'members') : TABS
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isDM && counterpart ? (
        <div className="shrink-0 border-b border-border-default p-4">
          <UserProfileBody
            profileId={counterpart.id}
            fallbackName={counterpart.name}
            fallbackAvatar={counterpart.avatar_url}
          />
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border-default px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3">
            {channel?.kind === 'group_dm' ? <UsersIcon size={15} /> : <Hash size={15} />}
          </span>
          <span className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[13.5px] font-bold text-text-1" title={title}>{title}</h3>
            {/* Count and description share one line: the description is optional
                and usually short, and a second row here costs the roster a row. */}
            <p className="truncate font-mono text-[10px] text-text-4" title={channel?.description ?? undefined}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {channel?.description ? ` · ${channel.description}` : ''}
            </p>
          </span>
          {channel && channel.kind !== 'dm' && (
            <button
              onClick={() => setSettingsOpen(true)}
              title="Channel settings"
              aria-label="Channel settings"
              className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
            >
              <Settings2 size={14} />
            </button>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-border-default p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={active === t.id}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-ui text-[12px] transition-colors',
              active === t.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
            )}
          >
            <t.icon size={13} />
            {t.label}
            {t.id === 'members' && members.length > 0 && (
              <span className="font-mono text-[10px] tabular-nums opacity-70">{members.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {active === 'members' ? (
          channel && <MemberList channelId={channel.id} members={members} canManage={canManage} />
        ) : (
          channel && <ChannelFilesPanel channelId={channel.id} tab={active} />
        )}
      </div>

      {channel && (
        <ChannelSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          channel={channel}
          canManage={canManage}
        />
      )}
    </div>
  )
}

function MemberList({ channelId, members, canManage }: {
  channelId: string
  members: ChannelMember[]
  canManage: boolean
}) {
  const setManager = useSetChannelManager()
  const toast = useToast()

  return (
    <div className="h-full overflow-y-auto p-2">
      {members.map((m) => (
        <div key={m.id} className="group/member flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2">
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
          {/* A manager, not an owner: several people can hold it, and losing
              one does not leave the channel stuck. Clickable for anyone who
              may manage, so handing it over is one press. */}
          {canManage ? (
            <button
              type="button"
              onClick={() => setManager.mutate(
                { channelId, profileId: m.id, canManage: !m.can_manage },
                { onError: (e) => toast(e instanceof Error ? e.message : 'Could not change that', 'error') },
              )}
              title={m.can_manage ? 'Remove as manager' : 'Make a manager'}
              className={cn(
                'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition-colors',
                m.can_manage
                  ? 'bg-brand-red/12 text-brand-red hover:bg-brand-red/20'
                  : 'bg-surface-3 text-text-4 opacity-0 group-hover/member:opacity-100 hover:text-text-1',
              )}
            >
              {m.can_manage ? 'Manager' : 'Make manager'}
            </button>
          ) : m.can_manage && (
            <span className="shrink-0 rounded-xs bg-surface-3 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-3">
              Manager
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
