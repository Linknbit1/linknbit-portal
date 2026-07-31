import { useMemo } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useProfileRoles, useRolePermissions, useRoles } from '../../hooks/usePermissions'
import type { PermissionRow } from '../../api/permissions'

interface PermissionDetailModalProps {
  permission: PermissionRow
  onClose: () => void
}

/**
 * Full detail for a single permission: what it means, which roles grant it, and
 * how many people that works out to right now.
 *
 * The headcount matters more than the role list — "3 roles" is abstract,
 * "8 people can read every confidential document" is the thing worth knowing
 * before you leave a switch on.
 */
export function PermissionDetailModal({ permission, onClose }: PermissionDetailModalProps) {
  const { data: roles = [] } = useRoles()
  const { data: grants = [] } = useRolePermissions()
  const { data: assignments = [] } = useProfileRoles()

  const { holders, peopleCount } = useMemo(() => {
    const roleIds = new Set(
      grants.filter((g) => g.permission_key === permission.key).map((g) => g.role_id),
    )
    const holderRoles = roles.filter((r) => roleIds.has(r.id))
    const people = new Set(
      assignments.filter((a) => roleIds.has(a.role_id)).map((a) => a.profile_id),
    )
    return { holders: holderRoles, peopleCount: people.size }
  }, [grants, roles, assignments, permission.key])

  const isAdministrator = permission.key === 'administrator'

  return (
    <Modal
      open
      onClose={onClose}
      title={permission.label}
      size="md"
      footer={
        <Button size="sm" className="w-full" onClick={onClose}>Close</Button>
      }
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-4 bg-surface-2 rounded-xs px-1.5 py-0.5">
            {permission.category}
          </span>
          <span className="font-mono text-[11px] text-text-4 truncate">{permission.key}</span>
        </div>

        <p className="font-ui text-body-sm/relaxed text-text-2">
          {permission.description ?? 'No description recorded for this permission.'}
        </p>

        {isAdministrator && (
          <p className="font-ui text-caption/relaxed text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-md px-3 py-2">
            This grants every other permission, including ones added in future. A role carrying it
            bypasses all rank checks. Assign it sparingly.
          </p>
        )}

        <div>
          <span className="block font-ui text-[13px] text-text-2 mb-2">
            Granted to {holders.length} {holders.length === 1 ? 'role' : 'roles'}
            {holders.length > 0 && (
              <span className="text-text-3">
                {' '}— {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
              </span>
            )}
          </span>
          {holders.length === 0 ? (
            <p className="font-ui text-[12px] text-text-4">
              Nobody currently has this permission.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {holders.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1"
                >
                  <span
                    className="inline-block size-2 rounded-full shrink-0"
                    style={{ backgroundColor: r.color ?? 'transparent' }}
                  />
                  <span className="font-ui text-[12px] text-text-2">{r.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
