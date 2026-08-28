import { useState } from 'react'
import { Hash, Megaphone, MessageSquare, Settings2, ShieldCheck, UserMinus, Users, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Avatar } from '../ui/Avatar'
import { MultiSelectPeople } from '../ui/MultiSelectPeople'
import { RoleBadge } from '../shared/RoleBadge'
import { PersonLink } from '../shared/PersonLink'
import { RolePicker } from './RolePicker'
import { useToast } from '../ui/toast-context'
import { useChannelMembers, useAddChannelMembers, useRemoveChannelMember } from '../../hooks/useChannelMembers'
import { useChannelRoles, useAddChannelRole, useRemoveChannelRole } from '../../hooks/useChannelRoles'
import { useUpdateChannel, useSetChannelPostPolicy, useSetChannelManager } from '../../hooks/useChannels'
import { useChannelCategories, useSetChannelCategory } from '../../hooks/useChannelCategories'
import { usePeople } from '../../hooks/usePeople'
import { toUserRole } from '../../lib/peopleAccess'
import { cn } from '../../lib/cn'
import type { ChannelListItem } from '../../api/channels'

type Tab = 'overview' | 'people' | 'permissions'

/**
 * Everything about a channel, in one dialog.
 *
 * Settings used to sit inline in the info panel while members lived in a modal,
 * which meant two different surfaces for one job and a rename control that
 * nobody found. One dialog, three tabs: what the channel is, who is in it, and
 * what they may do.
 */
export function ChannelSettingsModal({
  open, onClose, channel, canManage,
}: {
  open: boolean
  onClose: () => void
  channel: ChannelListItem
  canManage: boolean
}) {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [name, setName] = useState(channel.name ?? '')
  const [toAdd, setToAdd] = useState<string[]>([])

  const { data: members = [] } = useChannelMembers(channel.id)
  const { data: people = [] } = usePeople()
  const { data: categories = [] } = useChannelCategories()
  const { data: channelRoles = [] } = useChannelRoles(channel.id)

  const { mutate: addMembers, isPending: adding } = useAddChannelMembers()
  const { mutate: removeMember } = useRemoveChannelMember()
  const { mutate: addRole, isPending: addingRole } = useAddChannelRole()
  const { mutate: removeRole } = useRemoveChannelRole()
  const update = useUpdateChannel()
  const setCategory = useSetChannelCategory()
  const setPolicy = useSetChannelPostPolicy()
  const setManager = useSetChannelManager()

  const isDM = channel.kind === 'dm'
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Could not save that', 'error')

  const grantedRoles = channelRoles.map((r) => r.role)
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = people.filter((p) => !memberIds.has(p.id) && p.is_active)
  const policy = channel.post_policy ?? 'everyone'

  const commitName = () => {
    const next = name.trim()
    if (!next || next === channel.name) { setName(channel.name ?? ''); return }
    update.mutate({ id: channel.id, patch: { name: next } }, {
      onSuccess: () => toast('Channel renamed', 'success'),
      onError: fail,
    })
  }

  // A DM has no name, no category and no posting rules, so the only tab that
  // says anything is the list of the two people in it.
  const tabs: { key: Tab; label: string; icon: typeof Settings2 }[] = isDM
    ? [{ key: 'people', label: 'People', icon: Users }]
    : [
        { key: 'overview', label: 'Overview', icon: Settings2 },
        { key: 'people', label: `People (${members.length})`, icon: Users },
        { key: 'permissions', label: 'Permissions', icon: ShieldCheck },
      ]
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key

  return (
    <Modal open={open} onClose={onClose} title={isDM ? 'Conversation' : `#${channel.name ?? 'channel'}`} size="md">
      <div className="flex items-center gap-1 border-b border-border-default px-5 pt-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-ui text-[12.5px] font-medium transition-colors',
              active === t.key
                ? 'border-brand-red text-text-1'
                : 'border-transparent text-text-3 hover:text-text-1',
            )}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-5">
        {active === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-4">Name</label>
              <Input
                value={name}
                disabled={!canManage}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                iconLeft={<Hash size={13} />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-4">Category</label>
              <Select
                value={channel.category_id ?? ''}
                disabled={!canManage}
                onChange={(v) => setCategory.mutate({ channelId: channel.id, categoryId: v || null }, { onError: fail })}
                options={[
                  { value: '', label: 'Uncategorised' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <p className="font-ui text-[11.5px] text-text-4">
                Headings are renamed from the conversation list, on the heading itself.
              </p>
            </div>
          </div>
        )}

        {active === 'people' && (
          <div className="flex flex-col gap-4">
            {canManage && !isDM && candidates.length > 0 && (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <MultiSelectPeople
                    value={toAdd}
                    onChange={setToAdd}
                    options={candidates.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
                    placeholder="Add people"
                    size="sm"
                  />
                </div>
                <Button
                  size="sm"
                  loading={adding}
                  disabled={toAdd.length === 0}
                  onClick={() => addMembers({ channelId: channel.id, profileIds: toAdd }, {
                    onSuccess: () => { toast(`Added ${toAdd.length}`, 'success'); setToAdd([]) },
                    onError: fail,
                  })}
                >
                  Add
                </Button>
              </div>
            )}

            <div className="flex flex-col">
              {members.map((m) => (
                <div key={m.id} className="group/row flex items-center gap-3 border-b border-border-subtle py-2 last:border-0">
                  <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
                  <span className="min-w-0 flex-1">
                    <PersonLink personId={m.id} className="block truncate font-ui text-[13px] text-text-1">{m.name}</PersonLink>
                    <span className="block font-mono text-[10.5px] text-text-4">
                      {m.role.replace(/_/g, ' ')}
                      {m.added_via_role && ' · via role'}
                    </span>
                  </span>

                  {canManage && !isDM ? (
                    <button
                      onClick={() => setManager.mutate(
                        { channelId: channel.id, profileId: m.id, canManage: !m.can_manage },
                        { onError: fail },
                      )}
                      title={m.can_manage ? 'Remove as manager' : 'Make a manager'}
                      className={cn(
                        'shrink-0 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors',
                        m.can_manage
                          ? 'bg-brand-red/12 text-brand-red hover:bg-brand-red/20'
                          : 'bg-surface-3 text-text-4 opacity-0 hover:text-text-1 group-hover/row:opacity-100',
                      )}
                    >
                      {m.can_manage ? 'Manager' : 'Make manager'}
                    </button>
                  ) : m.can_manage && (
                    <span className="shrink-0 rounded-sm bg-surface-3 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-3">
                      Manager
                    </span>
                  )}

                  {canManage && !isDM && (
                    <button
                      onClick={() => removeMember({ channelId: channel.id, profileId: m.id }, {
                        onSuccess: () => toast(`Removed ${m.name}`, 'success'),
                        onError: fail,
                      })}
                      aria-label={`Remove ${m.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-surface-3 hover:text-error"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'permissions' && (
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Who can post</span>
              <div className="flex gap-1 rounded-sm border border-border-default bg-surface-1 p-1">
                {([
                  { key: 'everyone', label: 'Everyone', icon: MessageSquare },
                  { key: 'managers', label: 'Managers only', icon: Megaphone },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    disabled={!canManage}
                    onClick={() => setPolicy.mutate({ channelId: channel.id, policy: opt.key }, { onError: fail })}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-sm p-2 font-ui text-[12.5px] font-medium transition-colors disabled:opacity-50',
                      policy === opt.key ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
                    )}
                  >
                    <opt.icon size={13} /> {opt.label}
                  </button>
                ))}
              </div>
              <p className="font-ui text-[11.5px] text-text-4">
                {policy === 'managers'
                  ? 'Only managers can send here. Everyone else reads and reacts.'
                  : 'Anyone in the channel can send.'}
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Roles with access</span>
              {canManage && (
                <RolePicker
                  value={[]}
                  lockedRoles={grantedRoles}
                  disabled={addingRole}
                  onChange={(next) => {
                    const role = next[0]
                    if (role) addRole({ channelId: channel.id, role }, {
                      onSuccess: () => toast(`Everyone in ${role.replace(/_/g, ' ')} was added`, 'success'),
                      onError: fail,
                    })
                  }}
                />
              )}
              {grantedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {grantedRoles.map((role) => (
                    <span key={role} className="flex items-center gap-1.5 rounded-sm border border-brand-red/40 bg-brand-red/13 py-1 pl-2 pr-1">
                      <RoleBadge role={toUserRole(role)} size="sm" />
                      {canManage && (
                        <button
                          onClick={() => removeRole({ channelId: channel.id, role }, {
                            onSuccess: () => toast('Role removed', 'success'),
                            onError: fail,
                          })}
                          aria-label={`Remove ${role.replace(/_/g, ' ')} access`}
                          className="flex size-4 items-center justify-center rounded-full text-text-3 transition-colors hover:text-error"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <p className="font-ui text-[11.5px] text-text-4">
                Removing a role only removes the people it added, anyone invited individually stays.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
