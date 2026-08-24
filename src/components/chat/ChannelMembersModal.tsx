import { useState } from 'react'
import { UserMinus, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { MultiSelectPeople } from '../ui/MultiSelectPeople'
import { RoleBadge } from '../shared/RoleBadge'
import { RolePicker } from './RolePicker'
import { useToast } from '../ui/toast-context'
import { useChannelMembers, useAddChannelMembers, useRemoveChannelMember } from '../../hooks/useChannelMembers'
import { useChannelRoles, useAddChannelRole, useRemoveChannelRole } from '../../hooks/useChannelRoles'
import { usePeople } from '../../hooks/usePeople'
import { toUserRole } from '../../lib/peopleAccess'
import { cn } from '../../lib/cn'
import { PersonLink } from '../shared/PersonLink'

interface ChannelMembersModalProps {
  open: boolean
  onClose: () => void
  channelId: string
  canManage: boolean
}

export function ChannelMembersModal({ open, onClose, channelId, canManage }: ChannelMembersModalProps) {
  const toast = useToast()
  const { data: members = [] } = useChannelMembers(channelId)
  const { data: people = [] } = usePeople()
  const { mutate: addMembers, isPending: adding } = useAddChannelMembers()
  const { mutate: removeMember } = useRemoveChannelMember()
  const { data: channelRoles = [] } = useChannelRoles(channelId)
  const { mutate: addRole, isPending: addingRole } = useAddChannelRole()
  const { mutate: removeRole } = useRemoveChannelRole()
  const [toAdd, setToAdd] = useState<string[]>([])

  const grantedRoles = channelRoles.map((r) => r.role)

  const memberIds = new Set(members.map((m) => m.id))
  const candidates = people.filter((p) => !memberIds.has(p.id) && p.is_active)

  const submitAdd = () => {
    if (toAdd.length === 0) return
    addMembers({ channelId, profileIds: toAdd }, {
      onSuccess: () => { toast(`Added ${toAdd.length} ${toAdd.length === 1 ? 'person' : 'people'}`, 'success'); setToAdd([]) },
      onError: () => toast('Could not add those people', 'error'),
    })
  }

  const remove = (profileId: string, name: string) => {
    removeMember({ channelId, profileId }, {
      onSuccess: () => toast(`Removed ${name}`, 'success'),
      onError: () => toast('Could not remove that person', 'error'),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Members (${members.length})`}>
      <div className="flex flex-col gap-4 p-5">
        {canManage && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Roles with access</span>
            <RolePicker
              value={[]}
              lockedRoles={grantedRoles}
              onChange={(next) => {
                const role = next[0]
                if (role) addRole({ channelId, role }, {
                  onSuccess: () => toast(`Everyone in ${role.replace(/_/g, ' ')} was added`, 'success'),
                  onError: () => toast('Could not add that role', 'error'),
                })
              }}
              disabled={addingRole}
            />

            {grantedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {grantedRoles.map((role) => (
                  <span
                    key={role}
                    className="flex items-center gap-1.5 rounded-sm border border-brand-red/40 bg-brand-red/13 py-1 pl-2 pr-1"
                  >
                    <RoleBadge role={toUserRole(role)} size="sm" />
                    <button
                      onClick={() => removeRole({ channelId, role }, {
                        onSuccess: () => toast('Role removed', 'success'),
                        onError: () => toast('Could not remove that role', 'error'),
                      })}
                      aria-label={`Remove ${role.replace(/_/g, ' ')} access`}
                      className="flex size-4 items-center justify-center rounded-full text-text-3 transition-colors hover:text-error"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="font-ui text-[11.5px] text-text-4">
              Removing a role only removes the people it added — anyone invited individually stays.
            </p>
          </div>
        )}

        {canManage && candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Add people</span>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <MultiSelectPeople
                  value={toAdd}
                  onChange={setToAdd}
                  options={candidates.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
                  placeholder="Choose people"
                  size="sm"
                />
              </div>
              <Button size="sm" onClick={submitAdd} loading={adding} disabled={toAdd.length === 0}>Add</Button>
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
              <Avatar name={m.name} src={m.avatar_url ?? undefined} size="sm" personId={m.id} />
              <span className="flex-1 min-w-0">
                <PersonLink personId={m.id} className="block truncate font-ui text-[13px] text-text-1">{m.name}</PersonLink>
                <span className="block font-mono text-[10.5px] text-text-4">
                  {m.role.replace(/_/g, ' ')}
                  {m.added_via_role && ' · via role'}
                </span>
              </span>
              {m.role_in_channel === 'owner' && (
                <span className={cn('px-2 py-0.5 rounded-xs font-mono text-[10px] uppercase tracking-wider', 'bg-surface-3 text-text-3')}>
                  Owner
                </span>
              )}
              {canManage && m.role_in_channel !== 'owner' && (
                <button
                  onClick={() => remove(m.id, m.name)}
                  aria-label={`Remove ${m.name}`}
                  className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-error hover:bg-surface-3 transition-colors"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
