import { useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { MultiSelectPeople } from '../ui/MultiSelectPeople'
import { Select } from '../ui/Select'
import { useToast } from '../ui/toast-context'
import {
  ADMINISTRATOR,
  useAssignRole,
  useCreateRole,
  useDeleteRole,
  useMyPermissions,
  useProfileRoles,
  useRevokeRole,
  useRoles,
} from '../../hooks/usePermissions'
import { usePeople } from '../../hooks/usePeople'
import { useAuthContext } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

/**
 * Create roles and decide who holds them.
 *
 * Two rules are enforced in the database and mirrored here so the UI does not
 * offer an action that will be rejected:
 *  - you may only touch roles positioned below your own highest role
 *  - system roles cannot be deleted
 *
 * Assigning a role also updates the person's primary role (profiles.role) via a
 * database trigger, because 57 policies still read that column. That is why
 * moving someone off Admin here genuinely removes their admin access rather
 * than only half of it.
 */

/** Slug from a display name: "Portal Developer" -> "portal-developer". */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ROLE_COLORS = ['#EE2737', '#F87171', '#FBBF24', '#34D399', '#22D3EE', '#A78BFA', '#94A3B8']

export function RoleManager({ canEdit }: { canEdit: boolean }) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: assignments = [], isLoading: assignmentsLoading } = useProfileRoles()
  const { data: people = [], isLoading: peopleLoading } = usePeople()
  const { data: myPermissions = [] } = useMyPermissions()

  const { mutate: createRole, isPending: creating } = useCreateRole()
  const { mutate: deleteRole } = useDeleteRole()
  const { mutate: assignRole } = useAssignRole()
  const { mutate: revokeRole } = useRevokeRole()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [placeBelowId, setPlaceBelowId] = useState('')
  const [newColor, setNewColor] = useState(ROLE_COLORS[5])
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)

  const isLoading = rolesLoading || assignmentsLoading || peopleLoading

  const membersByRole = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of assignments) {
      const list = map.get(a.role_id) ?? []
      list.push(a.profile_id)
      map.set(a.role_id, list)
    }
    return map
  }, [assignments])

  const peopleOptions = useMemo(
    () => people.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })),
    [people],
  )

  /**
   * Position is a rank, not a free-form setting, so the form does not ask for a
   * number. You pick which role the new one sits under and the position is
   * derived from the gap beneath it. System roles are spaced by 10 precisely so
   * there is always room to slot one in.
   */
  const myTopPosition = useMemo(() => {
    if (myPermissions.includes(ADMINISTRATOR)) return Number.POSITIVE_INFINITY
    const mine = new Set(
      assignments.filter((a) => a.profile_id === profile?.id).map((a) => a.role_id),
    )
    return roles.reduce((top, r) => (mine.has(r.id) && r.position > top ? r.position : top), -1)
  }, [assignments, roles, profile?.id, myPermissions])

  // roles arrive ordered by position descending, so the next entry is the one below.
  const placements = useMemo(
    () =>
      roles
        .map((role, i) => {
          const below = roles[i + 1]
          const position = below
            ? Math.floor((role.position + below.position) / 2)
            : Math.max(1, Math.floor(role.position / 2))
          const fits = below
            ? position > below.position && position < role.position
            : position < role.position
          return { role, position, usable: fits && position < myTopPosition }
        })
        .filter((p) => p.usable),
    [roles, myTopPosition],
  )

  const placeBelow = placements.find((p) => p.role.id === placeBelowId) ?? placements[0]

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) {
      toast('Give the role a name', 'error')
      return
    }
    if (!placeBelow) {
      toast('No room to add a role below your own', 'error')
      return
    }
    createRole(
      { slug: slugify(name), name, color: newColor, position: placeBelow.position },
      {
        onSuccess: () => {
          setShowCreate(false)
          setNewName('')
          toast(`Created ${name}`, 'success')
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to create role'
          toast(
            message.includes('forbidden_role_hierarchy')
              ? 'That position is at or above your own role — pick a lower number'
              : message,
            'error',
          )
        },
      },
    )
  }

  const handleMembersChange = (roleId: string, next: string[]) => {
    const current = membersByRole.get(roleId) ?? []
    const added = next.filter((id) => !current.includes(id))
    const removed = current.filter((id) => !next.includes(id))

    const onError = (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update members'
      toast(
        message.includes('forbidden_role_hierarchy')
          ? 'That role is at or above your own — you cannot assign it'
          : message,
        'error',
      )
    }

    for (const profileId of added) assignRole({ profileId, roleId }, { onError })
    for (const profileId of removed) revokeRole({ profileId, roleId }, { onError })
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Roles</h2>
          <p className="font-ui text-[13px] text-text-3">
            A person can hold several roles. What they can do is the total of all of them.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New role
          </Button>
        )}
      </div>
      <p className="font-mono text-[11px] text-text-4 mb-4">
        Listed by rank, most authority first. You can only manage roles ranked below your own.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-text-4">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {roles.map((role) => {
            const members = membersByRole.get(role.id) ?? []
            const isOpen = openRoleId === role.id
            return (
              <div key={role.id} className="border border-border-default rounded-md bg-surface-1">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="inline-block size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color ?? 'transparent' }}
                  />
                  <span className="font-ui font-semibold text-[13px] text-text-1">{role.name}</span>
                  {role.is_system && (
                    <span className="font-mono text-[10px] text-text-4 uppercase tracking-wider">system</span>
                  )}
                  {role.is_default && (
                    <span className="font-mono text-[10px] text-text-4 uppercase tracking-wider">default</span>
                  )}
                  <span className="font-mono text-[11px] text-text-4 ml-auto">rank {role.position}</span>
                  <button
                    type="button"
                    onClick={() => setOpenRoleId(isOpen ? null : role.id)}
                    className="flex items-center gap-1 font-mono text-[11px] text-text-3 hover:text-text-1"
                  >
                    <Users size={13} />
                    {members.length}
                  </button>
                  {canEdit && !role.is_system && (
                    <button
                      type="button"
                      aria-label={`Delete ${role.name}`}
                      onClick={() =>
                        deleteRole(role.id, {
                          onSuccess: () => toast(`Deleted ${role.name}`, 'success'),
                          onError: () => toast('Failed to delete role', 'error'),
                        })
                      }
                      className="text-text-4 hover:text-brand-red"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 py-3 border-t border-border-subtle">
                    <label className="block font-mono text-[10px] text-text-4 uppercase tracking-wider mb-2">
                      Members
                    </label>
                    <MultiSelectPeople
                      value={members}
                      onChange={(next) => handleMembersChange(role.id, next)}
                      options={peopleOptions}
                      size="sm"
                      placeholder="Nobody"
                      className={cn(!canEdit && 'pointer-events-none opacity-60')}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New role"
        size="sm"
        busy={creating}
        footer={
          <div className="flex gap-2.5">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleCreate} loading={creating}>
              Create role
            </Button>
          </div>
        }
      >
        <div className="p-5 space-y-4">
          <Input
            label="Role name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Portal Developer"
            autoFocus
          />

          <div>
            <Select
              label="Rank below"
              value={placeBelow?.role.id ?? ''}
              onChange={setPlaceBelowId}
              options={placements.map((p) => ({ value: p.role.id, label: p.role.name }))}
              placeholder="Choose a role"
            />
            <p className="font-ui text-[12px] text-text-3 mt-1.5">
              {placeBelow
                ? `Ranks under ${placeBelow.role.name}. Members of this role can be managed by ${placeBelow.role.name} and above, and cannot manage anyone at their own rank or higher.`
                : 'There is no room to add a role below your own.'}
            </p>
          </div>

          <div>
            <span className="block font-ui text-[13px] text-text-2 mb-2">Colour</span>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={newColor === c}
                  onClick={() => setNewColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-shadow',
                    'ring-offset-2 ring-offset-surface-1',
                    newColor === c ? 'ring-2 ring-text-1' : 'ring-1 ring-border-default hover:ring-border-strong',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <p className="font-ui text-[12px] text-text-3 border-t border-border-subtle pt-3">
            The role starts with no permissions. Grant them in the matrix below, then add members.
          </p>
        </div>
      </Modal>
    </div>
  )
}
