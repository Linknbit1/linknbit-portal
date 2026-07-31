import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import {
  usePermissionCatalog,
  useRolePermissions,
  useRoles,
  useSetRolePermission,
  useUpdateRole,
} from '../../hooks/usePermissions'
import { isPermissionLocked, LOCKED_REASON } from '../../lib/roleLocks'
import { cn } from '../../lib/cn'
import type { PermissionRow, RoleRow } from '../../api/permissions'

const ROLE_COLORS = ['#EE2737', '#F87171', '#FBBF24', '#34D399', '#22D3EE', '#A78BFA', '#94A3B8']

interface RoleEditModalProps {
  role: RoleRow
  canEdit: boolean
  onClose: () => void
  onShowPermissionDetail: (permission: PermissionRow) => void
}

/**
 * Edit one role: its identity (custom roles only) and everything it can do.
 *
 * The matrix in Settings is better for comparing roles against each other; this
 * is better for answering "what exactly can a Team Lead do?" without reading
 * across a wide table. Permission toggles save immediately, matching the matrix.
 * Name and colour are staged and saved on Done, because a half-typed name
 * should not hit the database on every keystroke.
 */
export function RoleEditModal({ role, canEdit, onClose, onShowPermissionDetail }: RoleEditModalProps) {
  const toast = useToast()
  const { data: catalog = [] } = usePermissionCatalog()
  const { data: grants = [] } = useRolePermissions()
  const { data: roles = [] } = useRoles()
  const { mutate: setPermission, isPending: saving } = useSetRolePermission()
  const { mutate: updateRole, isPending: renaming } = useUpdateRole()

  const [name, setName] = useState(role.name)
  const [color, setColor] = useState(role.color ?? ROLE_COLORS[5])

  // System role slugs are wired into the profiles.role sync, so their identity
  // is fixed. Their permissions remain fully editable.
  const identityEditable = canEdit && !role.is_system

  const granted = useMemo(() => {
    const set = new Set<string>()
    for (const g of grants) if (g.role_id === role.id) set.add(g.permission_key)
    return set
  }, [grants, role.id])

  const adminCarrierCount = useMemo(() => {
    const byRole = new Map<string, Set<string>>()
    for (const g of grants) {
      const s = byRole.get(g.role_id) ?? new Set<string>()
      s.add(g.permission_key)
      byRole.set(g.role_id, s)
    }
    return roles.filter((r) => {
      const s = byRole.get(r.id)
      return !!s && (s.has('administrator') || s.has('can_manage_roles'))
    }).length
  }, [grants, roles])

  const sections = useMemo(() => {
    const byCategory = new Map<string, PermissionRow[]>()
    for (const perm of catalog) {
      const list = byCategory.get(perm.category) ?? []
      list.push(perm)
      byCategory.set(perm.category, list)
    }
    return [...byCategory.entries()].map(([label, permissions]) => ({ label, permissions }))
  }, [catalog])

  const grantedCount = granted.size

  const handleDone = () => {
    const trimmed = name.trim()
    const identityChanged =
      identityEditable && (trimmed !== role.name || color !== (role.color ?? ''))

    if (!identityChanged) {
      onClose()
      return
    }
    if (!trimmed) {
      toast('Give the role a name', 'error')
      return
    }
    updateRole(
      { id: role.id, name: trimmed, color },
      {
        onSuccess: () => { toast('Role updated', 'success'); onClose() },
        onError: (err: unknown) =>
          toast(err instanceof Error ? err.message : 'Failed to update role', 'error'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${role.name}`}
      size="lg"
      busy={renaming}
      footer={
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-text-4 mr-auto">
            {grantedCount} of {catalog.length} granted
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={renaming}>Cancel</Button>
          <Button size="sm" onClick={handleDone} loading={renaming}>Done</Button>
        </div>
      }
    >
      <div className="p-5 space-y-5">
        {identityEditable ? (
          <div className="space-y-4">
            <Input
              label="Role name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Portal Developer"
            />
            <div>
              <span className="block font-ui text-[13px] text-text-2 mb-2">Colour</span>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'size-7 rounded-full transition-shadow ring-offset-2 ring-offset-surface-1',
                      color === c ? 'ring-2 ring-text-1' : 'ring-1 ring-border-default hover:ring-border-strong',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-ui text-caption/relaxed text-text-3 bg-surface-2 border border-border-subtle rounded-md px-3 py-2">
            {role.is_system
              ? 'This is a built-in role, so its name and colour are fixed. Its permissions can still be changed below.'
              : 'You need Manage Roles to rename this role.'}
          </p>
        )}

        <div className="border-t border-border-subtle pt-4">
          <span className="block font-ui text-[13px] text-text-2 mb-3">Permissions</span>

          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.label}>
                <span className="block font-mono text-[10px] font-semibold text-text-4 uppercase tracking-widest mb-2">
                  {section.label}
                </span>
                <div className="flex flex-col gap-1">
                  {section.permissions.map((perm) => {
                    const has = granted.has(perm.key)
                    const locked = isPermissionLocked(perm.key, has, adminCarrierCount)
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center gap-3 rounded-sm p-2 hover:bg-surface-2"
                      >
                        <span className="font-ui text-[13px] text-text-2 min-w-0 flex-1 truncate">
                          {perm.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onShowPermissionDetail(perm)}
                          aria-label={`What does "${perm.label}" allow?`}
                          className="text-text-4 hover:text-text-1 transition-colors shrink-0"
                        >
                          <Info size={14} />
                        </button>
                        <div
                          className={cn('shrink-0', locked && 'opacity-60')}
                          title={locked ? LOCKED_REASON : undefined}
                        >
                          <Toggle
                            checked={has}
                            disabled={locked || !canEdit || saving}
                            onChange={(val) =>
                              setPermission(
                                { roleId: role.id, permissionKey: perm.key, granted: val },
                                { onError: () => toast('Failed to update permission', 'error') },
                              )
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
