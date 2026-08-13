import React, { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Shield, ChevronRight, CircleDot, Loader2, Shapes, IdCard, Plus, Trash2, Smartphone, Bell, Eye, type LucideIcon } from 'lucide-react'
import { useStatusLabels, useStatusOverrides, useSaveStatusLabel, useResetStatusLabel } from '../../hooks/useStatusLabels'
import { STATUS_LABELS, PROJECT_STATUS_LABELS } from '../../lib/utils'
import type { StatusScope } from '../../api/statusLabels'
import { Topbar } from '../../components/layout/Topbar'
import { StackScreen } from '../../components/layout/StackScreen'
import { HubRow } from '../../components/layout/MobileHub'
import { MyDevicesCard } from '../../components/shared/MyDevicesCard'
import { PushDevicesCard } from '../../components/shared/PushDevicesCard'
import { NotificationPreferencesCard } from '../../components/shared/NotificationPreferencesCard'
import { RoleManager } from '../../components/shared/RoleManager'
import { PermissionDetailModal } from '../../components/shared/PermissionDetailModal'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useCanManageRoles } from '../../hooks/useRoleFlags'
import {
  usePermissionCatalog, useRolePermissions, useRoles, useSetRolePermission,
} from '../../hooks/usePermissions'
import {
  useServices, useCreateService, useUpdateService, useDeleteService, useServiceUsage,
} from '../../hooks/useServices'
import {
  useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation, useDesignationUsage,
} from '../../hooks/useDesignations'
import type { Service } from '../../api/services'
import type { Designation } from '../../api/designations'
import type { PermissionRow } from '../../api/permissions'
import { isPermissionLocked, LOCKED_REASON } from '../../lib/roleLocks'
import { cn } from '../../lib/cn'

type Tab = 'devices' | 'notifications' | 'services' | 'statuses' | 'designations' | 'permissions'

// Mobile section metadata: drives the hub rows + stack-screen titles. Visibility is
// role-gated (see visibleSectionsFor): Services → super_admin/admin; Designations →
// super_admin/admin/hr; Permissions → super_admin/admin and only when WIP is enabled.
const SETTINGS_SECTIONS: { key: Tab; label: string; icon: LucideIcon }[] = [
  // Personal — every signed-in staff member.
  { key: 'devices',       label: 'My Devices',    icon: Smartphone },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  // Administrative — role-filtered below.
  { key: 'services',     label: 'Services',     icon: Shapes },
  { key: 'statuses',     label: 'Statuses',     icon: CircleDot },
  { key: 'designations', label: 'Designations', icon: IdCard },
  { key: 'permissions',  label: 'Permissions',  icon: Shield },
]

function visibleSectionsFor(role: string | undefined): typeof SETTINGS_SECTIONS {
  return SETTINGS_SECTIONS.filter(({ key }) => {
    if (key === 'devices' || key === 'notifications') return !!role
    if (key === 'services')     return role === 'super_admin' || role === 'admin'
    if (key === 'statuses')     return role === 'super_admin' || role === 'admin'
    if (key === 'designations') return role === 'super_admin' || role === 'admin' || role === 'hr'
    // Now that flags genuinely drive RLS, this panel has to exist in production —
    // it is the only way to administer capabilities.
    if (key === 'permissions')  return role === 'super_admin' || role === 'admin'
    return false
  })
}

// ── Services management ──────────────────────────────────────────────────────────

function ServiceRow({ service, canManage }: { service: Service; canManage: boolean }) {
  const toast = useToast()
  const { mutate: update, isPending: saving } = useUpdateService()
  const { mutate: del, isPending: deleting } = useDeleteService()
  const [name, setName] = useState(service.name)
  const [color, setColor] = useState(service.color)
  const [confirming, setConfirming] = useState(false)
  const usage = useServiceUsage(service.slug, confirming, service.id)
  const dirty = name !== service.name || color !== service.color
  const inUse = (usage.data?.people ?? 0) + (usage.data?.teams ?? 0) + (usage.data?.projects ?? 0) > 0

  const save = () => update(
    { id: service.id, updates: { name: name.trim(), color } },
    { onSuccess: () => toast('Service updated', 'success'), onError: (e) => toast(e.message.includes('unique') ? 'That name already exists' : 'Update failed', 'error') },
  )
  const remove = () => del(service.id, {
    onSuccess: () => { toast('Service deleted', 'success'); setConfirming(false) },
    onError: () => toast('Could not delete service', 'error'),
  })

  return (
    <div className="grid grid-cols-[36px_1fr_auto_auto] gap-3 items-center px-4 py-2.5 border-b border-border-subtle last:border-0">
      <input type="color" value={color} disabled={!canManage} onChange={(e) => setColor(e.target.value)}
        className="size-8 rounded-md bg-transparent border border-border-default cursor-pointer disabled:cursor-default" aria-label={`${service.name} colour`} />
      <div className="flex items-center gap-2 min-w-0">
        <input value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)}
          className="bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus w-52 disabled:opacity-70" />
        <span className="font-mono text-[10px] text-text-4 truncate">{service.slug}</span>
      </div>
      <div className="flex items-center gap-2">
        <Toggle checked={service.is_active} onChange={(v) => canManage && update({ id: service.id, updates: { is_active: v } }, { onSuccess: () => toast(v ? 'Activated' : 'Deactivated', 'success') })} />
        <span className="font-mono text-[10px] text-text-4 w-7">{service.is_active ? 'On' : 'Off'}</span>
      </div>
      {canManage && (
        confirming ? (
          <div className="flex items-center gap-2">
            {usage.isLoading ? <Loader2 size={12} className="animate-spin text-text-4" />
              : inUse ? <span className="font-mono text-[10.5px] text-error">In use: {usage.data?.teams}t · {usage.data?.projects} project{usage.data?.projects === 1 ? '' : 's'}</span>
              : <button onClick={remove} disabled={deleting} className="font-mono text-[10.5px] text-error font-bold">Delete</button>}
            <button onClick={() => setConfirming(false)} className="font-mono text-[10.5px] text-text-3">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {dirty && <Button size="sm" variant="secondary" disabled={saving} onClick={save}>Save</Button>}
            <button onClick={() => setConfirming(true)} className="p-1.5 text-text-4 hover:text-error" title="Delete service"><Trash2 size={13} /></button>
          </div>
        )
      )}
    </div>
  )
}

function ServicesPanel({ canManage }: { canManage: boolean }) {
  const toast = useToast()
  const { data: services = [], isLoading } = useServices()
  const { mutate: create, isPending: creating } = useCreateService()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#A78BFA')

  const add = () => {
    if (!newName.trim()) return
    create({ name: newName.trim(), color: newColor }, {
      onSuccess: () => { toast('Service created', 'success'); setNewName(''); setNewColor('#A78BFA') },
      onError: (e) => toast(/unique|duplicate/i.test(e.message) ? 'That name already exists' : 'Could not create service', 'error'),
    })
  }

  return (
    <div>
      <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Services</h2>
      <p className="font-ui text-[13px] text-text-3 mb-5">
        Create, rename, recolour, or retire the service lines used across teams, people, and projects.
        A service in use can't be deleted — reassign or deactivate it first.
      </p>

      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <div className="grid grid-cols-[36px_1fr_auto_auto] gap-3 px-4 py-2 border-b border-border-subtle bg-surface-2">
          {['', 'Name', 'Active', ''].map((h, i) => <span key={i} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>)}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10 text-text-4"><Loader2 size={18} className="animate-spin" /></div>
        ) : (
          services.map((s) => <ServiceRow key={s.id} service={s} canManage={canManage} />)
        )}
        {canManage && (
          <div className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-4 py-3 bg-surface-2/40">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
              className="size-8 rounded-md bg-transparent border border-border-default cursor-pointer" aria-label="New service colour" />
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New service name (e.g. SEO)"
              className="bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus w-64" />
            <Button size="sm" disabled={!newName.trim() || creating} onClick={add}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </Button>
          </div>
        )}
      </div>
      {!canManage && <p className="font-mono text-[11px] text-text-4 mt-3">Only Super Admins and Admins can manage services.</p>}
    </div>
  )
}


// ── Status names & colours ───────────────────────────────────────────────────────

/** The fixed keys, in board order. New ones can't be added — see status_labels. */
const TASK_STATUS_KEYS: string[] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PROJECT_STATUS_KEYS: string[] = ['todo', 'in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed']

function StatusRow({ scope, statusKey, fallbackLabel, canManage }: {
  scope: StatusScope
  statusKey: string
  fallbackLabel: string
  canManage: boolean
}) {
  const toast = useToast()
  const overrides = useStatusOverrides(scope)
  const { mutate: save, isPending: saving } = useSaveStatusLabel()
  const { mutate: reset, isPending: resetting } = useResetStatusLabel()

  const current = overrides[statusKey]
  const [label, setLabel] = useState(current?.label ?? fallbackLabel)
  const [color, setColor] = useState(current?.color ?? '#8A93A3')
  const dirty = label !== (current?.label ?? fallbackLabel) || color !== (current?.color ?? '#8A93A3')

  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-0">
      <input
        type="color"
        value={color}
        disabled={!canManage}
        onChange={(e) => setColor(e.target.value)}
        className="size-8 cursor-pointer rounded-md border border-border-default bg-transparent disabled:cursor-default"
        aria-label={`${fallbackLabel} colour`}
      />
      <div className="flex min-w-0 items-center gap-2">
        <input
          value={label}
          disabled={!canManage}
          onChange={(e) => setLabel(e.target.value)}
          className="w-52 rounded-md border border-border-default bg-surface-inset px-3 py-1.5 font-ui text-[13px] text-text-1 outline-none focus:border-border-focus disabled:opacity-70"
        />
        {/* The key is what the database and every trigger use; it never changes. */}
        <span className="truncate font-mono text-[10px] text-text-4">{statusKey}</span>
      </div>
      {canManage && (
        <div className="flex items-center gap-1.5">
          {dirty && (
            <Button
              size="sm"
              variant="secondary"
              disabled={saving || !label.trim()}
              onClick={() => save(
                { scope, key: statusKey, label, color },
                { onSuccess: () => toast('Status updated', 'success'), onError: () => toast('Could not save that status', 'error') },
              )}
            >
              Save
            </Button>
          )}
          {current && !dirty && (
            <button
              onClick={() => reset({ scope, key: statusKey }, {
                onSuccess: () => { setLabel(fallbackLabel); toast('Reset to default', 'success') },
                onError: () => toast('Could not reset that status', 'error'),
              })}
              disabled={resetting}
              className="p-1.5 font-mono text-[10.5px] text-text-4 transition-colors hover:text-text-1"
              title="Reset to the built-in name and colour"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatusGroup({ title, scope, keys, labels, canManage }: {
  title: string
  scope: StatusScope
  keys: string[]
  labels: Record<string, string>
  canManage: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
      <div className="grid grid-cols-[36px_1fr_auto] gap-3 border-b border-border-subtle bg-surface-2 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-4" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">{title}</span>
        <span />
      </div>
      {keys.map((k) => (
        <StatusRow key={k} scope={scope} statusKey={k} fallbackLabel={labels[k] ?? k} canManage={canManage} />
      ))}
    </div>
  )
}

function StatusesPanel({ canManage }: { canManage: boolean }) {
  const { isLoading } = useStatusLabels()

  return (
    <div>
      <h2 className="mb-1 font-display text-[16px] font-bold text-text-1">Statuses</h2>
      <p className="mb-5 font-ui text-[13px] text-text-3">
        Rename and recolour the statuses used on task and project boards. The set itself is fixed —
        automations like project progress and completion alerts are keyed to these, so statuses can
        be renamed but not added or removed. Reset puts one back to its built-in name and colour.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10 text-text-4"><Loader2 size={18} className="animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          <StatusGroup title="Task statuses" scope="task" keys={TASK_STATUS_KEYS} labels={STATUS_LABELS} canManage={canManage} />
          <StatusGroup title="Project statuses" scope="project" keys={PROJECT_STATUS_KEYS} labels={PROJECT_STATUS_LABELS} canManage={canManage} />
        </div>
      )}

      {!canManage && <p className="mt-3 font-mono text-[11px] text-text-4">Only Super Admins and Admins can manage statuses.</p>}
    </div>
  )
}

// ── Designations management ─────────────────────────────────────────────────────

function DesignationRow({ designation, canManage }: { designation: Designation; canManage: boolean }) {
  const toast = useToast()
  const { mutate: update, isPending: saving } = useUpdateDesignation()
  const { mutate: del, isPending: deleting } = useDeleteDesignation()
  const [name, setName] = useState(designation.name)
  const [confirming, setConfirming] = useState(false)
  const usage = useDesignationUsage(designation.id, confirming)
  const dirty = name !== designation.name
  const inUse = (usage.data?.people ?? 0) > 0

  const save = () => update(
    { id: designation.id, updates: { name: name.trim() } },
    { onSuccess: () => toast('Designation updated', 'success'), onError: (e) => toast(e.message.includes('unique') ? 'That name already exists' : 'Update failed', 'error') },
  )
  const remove = () => del(designation.id, {
    onSuccess: () => { toast('Designation deleted', 'success'); setConfirming(false) },
    onError: () => toast('Could not delete designation', 'error'),
  })

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-2.5 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <input value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)}
          className="bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus w-52 disabled:opacity-70" />
        <span className="font-mono text-[10px] text-text-4 truncate">{designation.slug}</span>
      </div>
      <div className="flex items-center gap-2">
        <Toggle checked={designation.is_active} onChange={(v) => canManage && update({ id: designation.id, updates: { is_active: v } }, { onSuccess: () => toast(v ? 'Activated' : 'Deactivated', 'success') })} />
        <span className="font-mono text-[10px] text-text-4 w-7">{designation.is_active ? 'On' : 'Off'}</span>
      </div>
      {canManage && (
        confirming ? (
          <div className="flex items-center gap-2">
            {usage.isLoading ? <Loader2 size={12} className="animate-spin text-text-4" />
              : <button onClick={remove} disabled={deleting} className="font-mono text-[10.5px] text-error font-bold">{inUse ? `Delete (unsets ${usage.data?.people})` : 'Delete'}</button>}
            <button onClick={() => setConfirming(false)} className="font-mono text-[10.5px] text-text-3">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {dirty && <Button size="sm" variant="secondary" disabled={saving} onClick={save}>Save</Button>}
            <button onClick={() => setConfirming(true)} className="p-1.5 text-text-4 hover:text-error" title="Delete designation"><Trash2 size={13} /></button>
          </div>
        )
      )}
    </div>
  )
}

function DesignationsPanel({ canManage }: { canManage: boolean }) {
  const toast = useToast()
  const { data: designations = [], isLoading } = useDesignations()
  const { mutate: create, isPending: creating } = useCreateDesignation()
  const [newName, setNewName] = useState('')

  const add = () => {
    if (!newName.trim()) return
    create({ name: newName.trim() }, {
      onSuccess: () => { toast('Designation created', 'success'); setNewName('') },
      onError: (e) => toast(/unique|duplicate/i.test(e.message) ? 'That name already exists' : 'Could not create designation', 'error'),
    })
  }

  return (
    <div>
      <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Designations</h2>
      <p className="font-ui text-[13px] text-text-3 mb-5">
        Create, rename, or retire the job designations assigned to employees (e.g. Software Engineer, SEO Specialist).
        Deactivating one hides it from new assignments; deleting it unsets it on anyone who has it.
      </p>

      <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-border-subtle bg-surface-2">
          {['Name', 'Active', ''].map((h, i) => <span key={i} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>)}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10 text-text-4"><Loader2 size={18} className="animate-spin" /></div>
        ) : (
          designations.map((d) => <DesignationRow key={d.id} designation={d} canManage={canManage} />)
        )}
        {canManage && (
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-3 bg-surface-2/40">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New designation (e.g. SEO Specialist)"
              className="bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus w-64" />
            <Button size="sm" disabled={!newName.trim() || creating} onClick={add}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </Button>
          </div>
        )}
      </div>
      {!canManage && <p className="font-mono text-[11px] text-text-4 mt-3">Only Super Admins, Admins, and HR can manage designations.</p>}
    </div>
  )
}

// ── Permissions (role × permission matrix) ───────────────────────────────────────

/**
 * Both axes are read from the database rather than hardcoded, so a custom role
 * or a newly added permission key shows up here with no code change.
 * See docs/permission-model-v2.md.
 */

function PermissionsPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast()
  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: catalog = [], isLoading: catalogLoading } = usePermissionCatalog()
  const { data: grants = [], isLoading: grantsLoading } = useRolePermissions()
  const { mutate: setPermission, isPending: updating } = useSetRolePermission()
  const [detailPermission, setDetailPermission] = useState<PermissionRow | null>(null)

  const isLoading = rolesLoading || catalogLoading || grantsLoading

  const granted = useMemo(() => {
    const set = new Set<string>()
    for (const g of grants) set.add(`${g.role_id}:${g.permission_key}`)
    return set
  }, [grants])

  // How many roles still carry the ability to administer roles at all.
  const adminCarrierCount = useMemo(
    () =>
      roles.filter(
        (r) =>
          granted.has(`${r.id}:can_manage_roles`) || granted.has(`${r.id}:administrator`),
      ).length,
    [roles, granted],
  )

  const sections = useMemo(() => {
    const byCategory = new Map<string, typeof catalog>()
    for (const perm of catalog) {
      const list = byCategory.get(perm.category) ?? []
      list.push(perm)
      byCategory.set(perm.category, list)
    }
    return [...byCategory.entries()].map(([label, permissions]) => ({ label, permissions }))
  }, [catalog])

  return (
    <div>
      <RoleManager canEdit={canEdit} />

      <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Permissions</h2>
      <p className="font-ui text-[13px] text-text-3 mb-1">
        What each role can do. A person may hold several roles; their permissions are the total of all of them.
      </p>
      {!canEdit
        ? <p className="font-mono text-[11px] text-text-4 mb-4">View only — you need Manage Roles to change permissions.</p>
        : <p className="font-mono text-[11px] text-text-4 mb-4">Changes take effect immediately for all sessions.</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-4">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        // The matrix gets its own scroll box rather than growing the page: a
        // sticky header only works inside a container that actually scrolls, and
        // with 38 permissions the role columns otherwise scroll out of sight.
        <div className="overflow-auto max-h-[65vh] rounded-md border border-border-default">
          <table className="w-full text-[12px] min-w-175 border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 bg-surface-1 text-left py-2 pl-3 pr-6 min-w-45 font-mono text-text-4 uppercase text-[10px] tracking-wider border-b border-border-default">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="sticky top-0 z-20 bg-surface-1 text-center p-2 min-w-17.5 font-ui font-semibold text-text-3 border-b border-border-default"
                  >
                    <span
                      className="inline-block size-2 rounded-full mr-1 align-middle"
                      style={{ backgroundColor: role.color ?? 'transparent' }}
                    />
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <React.Fragment key={section.label}>
                  <tr>
                    <td colSpan={roles.length + 1} className="py-2 px-3 bg-surface-2 border-b border-border-subtle">
                      {/* Keeps the category label in view when scrolled sideways. */}
                      <span className="sticky left-3 inline-block font-mono text-[10px] font-semibold text-text-4 uppercase tracking-widest">
                        {section.label}
                      </span>
                    </td>
                  </tr>
                  {section.permissions.map((perm, i) => {
                    const isLast = i === section.permissions.length - 1
                    const rowBorder = isLast ? 'border-border-default' : 'border-border-subtle'
                    return (
                      <tr key={perm.key} className="group">
                        <td
                          className={cn(
                            'sticky left-0 z-10 bg-surface-1 py-3 pl-3 pr-6 border-b',
                            rowBorder,
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-ui text-[13px] text-text-2 whitespace-nowrap">
                              {perm.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDetailPermission(perm)}
                              aria-label={`What does "${perm.label}" allow?`}
                              title={`What does "${perm.label}" allow?`}
                              className="text-text-4 hover:text-text-1 transition-colors shrink-0"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                        {roles.map((role) => {
                          const has = granted.has(`${role.id}:${perm.key}`)
                          const locked = isPermissionLocked(perm.key, has, adminCarrierCount)
                          return (
                            <td key={role.id} className={cn('text-center py-3 px-2 border-b', rowBorder)}>
                              <div
                                className={cn('flex justify-center', locked && 'opacity-60')}
                                title={locked ? LOCKED_REASON : undefined}
                              >
                                <Toggle
                                  checked={has}
                                  disabled={locked || !canEdit}
                                  onChange={(val) => {
                                    if (!canEdit || updating || locked) return
                                    setPermission(
                                      { roleId: role.id, permissionKey: perm.key, granted: val },
                                      { onError: () => toast('Failed to update permission', 'error') },
                                    )
                                  }}
                                />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailPermission && (
        <PermissionDetailModal
          permission={detailPermission}
          onClose={() => setDetailPermission(null)}
        />
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────

// Route guarded to super_admin / admin / hr (see App.tsx + SETTINGS_ROLES). Sections
// are further role-filtered: HR only ever sees Designations. Desktop keeps the
// sidebar-tab layout; mobile uses the hub → stack-screen pattern.
export default function SettingsPage({ mobileSection }: { mobileSection?: string } = {}) {
  const { profile } = useAuthContext()
  const isDesktop = useIsDesktop()
  const canEditFlags = profile?.role === 'super_admin' || profile?.role === 'admin'
  const canManageDesignations = canEditFlags || profile?.role === 'hr'
  // Permissions is the one panel already converted off role checks; Services and
  // Designations follow in Phase 2.
  const canManageRoles = useCanManageRoles()

  const sections = useMemo(() => visibleSectionsFor(profile?.role), [profile?.role])
  const [activeTab, setActiveTab] = useState<Tab>(sections[0]?.key ?? 'designations')
  const showHub = !isDesktop && !mobileSection

  // The personal panels are already made of Cards, so they render bare — the
  // shared panel wrapper would nest a card inside a card.
  const isPersonalPanel = (tab: Tab) => tab === 'devices' || tab === 'notifications'

  const renderPanel = (tab: Tab) =>
    tab === 'devices' ? (
      <div className="flex flex-col gap-4">
        <MyDevicesCard />
        <PushDevicesCard />
      </div>
    )
    : tab === 'notifications' ? <NotificationPreferencesCard />
    : tab === 'services'     ? <ServicesPanel canManage={canEditFlags} />
    : tab === 'statuses'     ? <StatusesPanel canManage={canEditFlags} />
    : tab === 'designations' ? <DesignationsPanel canManage={canManageDesignations} />
    : <PermissionsPanel canEdit={canManageRoles} />

  // Mobile drill-in: one section rendered as a stack screen with its own back chrome.
  // Guard by role, not just key validity, so HR can't deep-link into Services.
  if (mobileSection) {
    const entry = sections.find((s) => s.key === mobileSection)
    if (!entry) return <Navigate to="/settings" replace />
    return (
      <StackScreen title={entry.label}>
        {isPersonalPanel(entry.key) ? (
          renderPanel(entry.key)
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl p-5">
            {renderPanel(entry.key)}
          </div>
        )}
      </StackScreen>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Settings" back="/more" />

      <div className="px-4 py-6 lg:px-8 lg:py-7">
        {showHub ? (
          <div className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <HubRow key={s.key} to={`/settings/${s.key}`} label={s.label} icon={s.icon} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Section nav — sidebar on desktop */}
            <div className="w-full lg:w-48 shrink-0">
              <nav className="flex lg:flex-col bg-surface-1 border border-border-default rounded-xl overflow-x-auto">
                {sections.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-ui font-medium whitespace-nowrap transition-colors border-r lg:border-r-0 lg:border-b border-border-subtle last:border-0',
                      activeTab === key
                        ? 'bg-brand-red/10 text-brand-red'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                    )}
                  >
                    <Icon size={14} />
                    {label}
                    {activeTab === key && <ChevronRight size={12} className="ml-auto hidden lg:block" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isPersonalPanel(activeTab) ? (
                renderPanel(activeTab)
              ) : (
                <div className="bg-surface-1 border border-border-default rounded-xl p-6">
                  {renderPanel(activeTab)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Mobile-only /settings/:section stack screen; redirects on desktop. */
export function SettingsSectionScreen() {
  const isDesktop = useIsDesktop()
  const { section } = useParams()
  const valid = SETTINGS_SECTIONS.some((s) => s.key === section)
  if (isDesktop || !section || !valid) return <Navigate to="/settings" replace />
  return <SettingsPage mobileSection={section} />
}
