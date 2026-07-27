import React, { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Shield, ChevronRight, Loader2, Shapes, IdCard, Plus, Trash2, Smartphone, Bell, type LucideIcon } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { StackScreen } from '../../components/layout/StackScreen'
import { HubRow } from '../../components/layout/MobileHub'
import { MyDevicesCard } from '../../components/shared/MyDevicesCard'
import { PushDevicesCard } from '../../components/shared/PushDevicesCard'
import { NotificationPreferencesCard } from '../../components/shared/NotificationPreferencesCard'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useRoleFlags, useUpdateRoleFlag } from '../../hooks/useRoleFlags'
import {
  useServices, useCreateService, useUpdateService, useDeleteService, useServiceUsage,
} from '../../hooks/useServices'
import {
  useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation, useDesignationUsage,
} from '../../hooks/useDesignations'
import type { Service } from '../../api/services'
import type { Designation } from '../../api/designations'
import { cn } from '../../lib/cn'

type Tab = 'devices' | 'notifications' | 'services' | 'designations' | 'permissions'

// Mobile section metadata: drives the hub rows + stack-screen titles. Visibility is
// role-gated (see visibleSectionsFor): Services → super_admin/admin; Designations →
// super_admin/admin/hr; Permissions → super_admin/admin and only when WIP is enabled.
const SETTINGS_SECTIONS: { key: Tab; label: string; icon: LucideIcon }[] = [
  // Personal — every signed-in staff member.
  { key: 'devices',       label: 'My Devices',    icon: Smartphone },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  // Administrative — role-filtered below.
  { key: 'services',     label: 'Services',     icon: Shapes },
  { key: 'designations', label: 'Designations', icon: IdCard },
  { key: 'permissions',  label: 'Permissions',  icon: Shield },
]

function visibleSectionsFor(role: string | undefined): typeof SETTINGS_SECTIONS {
  return SETTINGS_SECTIONS.filter(({ key }) => {
    if (key === 'devices' || key === 'notifications') return !!role
    if (key === 'services')     return role === 'super_admin' || role === 'admin'
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
  const usage = useServiceUsage(service.slug, confirming)
  const dirty = name !== service.name || color !== service.color
  const inUse = (usage.data?.people ?? 0) + (usage.data?.teams ?? 0) > 0

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
              : inUse ? <span className="font-mono text-[10.5px] text-error">In use: {usage.data?.people}p · {usage.data?.teams}t</span>
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

// ── Designations management ──────────────────────────────────────────────────────

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

// ── Permissions (role × feature flag matrix) ─────────────────────────────────────

const INTERNAL_ROLES = ['super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance'] as const
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', project_manager: 'PM',
  team_lead: 'Team Lead', employee: 'Employee', hr: 'HR', finance: 'Finance',
}
const FEATURE_LABELS: Record<string, string> = {
  can_create_projects:      'Create Projects',
  can_delete_projects:      'Delete Projects',
  can_view_budget:          'View Budget',
  can_view_confidential:    'View Confidential Docs',
  can_approve_tasks:        'Approve Tasks',
  can_manage_clients:       'Manage Clients',
  can_manage_people:        'Manage People',
  can_view_reports:         'View Reports',
  can_manage_attendance:    'Manage Attendance',
  can_approve_requests:     'Approve Leave / WFH / Overtime',
  can_view_all_attendance:  'View All Attendance (vs own team)',
  can_govern_gamification:  'Govern Gamification',
  can_recognize:            'Post Quests & Shoutouts',
  can_create_channels:      'Create Channels',
  can_manage_all_channels:  'Manage Any Channel (members, roles, delete)',
  can_delete_any_message:   'Delete Any Message',
}

const FEATURE_SECTIONS: { label: string; features: string[] }[] = [
  { label: 'Projects',     features: ['can_create_projects', 'can_delete_projects', 'can_view_budget', 'can_view_confidential'] },
  { label: 'Tasks',        features: ['can_approve_tasks'] },
  { label: 'Clients',      features: ['can_manage_clients'] },
  { label: 'People',       features: ['can_manage_people'] },
  { label: 'Reports',      features: ['can_view_reports'] },
  { label: 'Attendance',   features: ['can_manage_attendance', 'can_approve_requests', 'can_view_all_attendance'] },
  { label: 'Gamification', features: ['can_govern_gamification', 'can_recognize'] },
  { label: 'Chat',         features: ['can_create_channels', 'can_manage_all_channels', 'can_delete_any_message'] },
]

/**
 * Some switches must never be flipped off or the org locks itself out — there is no
 * super_admin account to recover with, so `admin` must keep People management (the
 * only route back into this panel). super_admin is always-on by definition
 * (has_feature() short-circuits it server-side).
 */
function isLockedOn(role: string, featureKey: string): boolean {
  return role === 'super_admin' || (role === 'admin' && featureKey === 'can_manage_people')
}

function PermissionsPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast()
  const { data: flags = [], isLoading } = useRoleFlags()
  const { mutate: updateFlag, isPending: updating } = useUpdateRoleFlag()

  return (
    <div>
      <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Permissions</h2>
      <p className="font-ui text-[13px] text-text-3 mb-1">Role-based feature access. Toggle to enable or disable per role.</p>
      {!canEdit
        ? <p className="font-mono text-[11px] text-text-4 mb-4">View only — only Super Admins and Admins can change permissions.</p>
        : <p className="font-mono text-[11px] text-text-4 mb-4">Changes take effect immediately for all sessions.</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-4">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-175">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-2 font-mono text-text-4 uppercase text-[10px] tracking-wider pr-6 min-w-45">Feature</th>
                {INTERNAL_ROLES.map((role) => (
                  <th key={role} className="text-center p-2 font-ui font-semibold text-text-3 min-w-17.5">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_SECTIONS.map((section) => (
                <React.Fragment key={section.label}>
                  <tr className="border-b border-border-subtle">
                    <td colSpan={INTERNAL_ROLES.length + 1} className="py-2 px-3 bg-surface-2">
                      <span className="font-mono text-[10px] font-semibold text-text-4 uppercase tracking-widest">
                        {section.label}
                      </span>
                    </td>
                  </tr>
                  {section.features.map((featureKey, i) => {
                    const label = FEATURE_LABELS[featureKey] ?? featureKey
                    const isLast = i === section.features.length - 1
                    return (
                      <tr key={featureKey} className={cn('border-b border-border-subtle', isLast && 'border-border-default')}>
                        <td className="py-3 pl-3 font-ui text-[13px] text-text-2 pr-6 whitespace-nowrap">{label}</td>
                        {INTERNAL_ROLES.map((role) => {
                          const flag = flags.find((f) => f.role === role && f.feature_key === featureKey)
                          const locked = isLockedOn(role, featureKey)
                          const enabled = locked || (flag?.enabled ?? false)
                          return (
                            <td key={role} className="text-center py-3 px-2">
                              <div
                                className={cn('flex justify-center', locked && 'opacity-60')}
                                title={locked ? 'Always on — cannot be disabled without locking everyone out' : undefined}
                              >
                                <Toggle
                                  checked={enabled}
                                  disabled={locked}
                                  onChange={(val) => {
                                    if (!canEdit || updating || locked) return
                                    updateFlag(
                                      { role, featureKey, enabled: val },
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
    : tab === 'designations' ? <DesignationsPanel canManage={canManageDesignations} />
    : <PermissionsPanel canEdit={canEditFlags} />

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
