import React, { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Shield, ChevronRight, Loader2, Shapes, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { StackScreen } from '../../components/layout/StackScreen'
import { HubRow } from '../../components/layout/MobileHub'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useRoleFlags, useUpdateRoleFlag } from '../../hooks/useRoleFlags'
import {
  useServices, useCreateService, useUpdateService, useDeleteService, useServiceUsage,
} from '../../hooks/useServices'
import type { Service } from '../../api/services'
import { cn } from '../../lib/cn'

type Tab = 'services' | 'permissions'

// Mobile section metadata: drives the hub rows + stack-screen titles. Only the two
// fully-wired company-settings areas remain in production (super_admin / admin only).
const SETTINGS_SECTIONS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'services',    label: 'Services',    icon: Shapes },
  { key: 'permissions', label: 'Permissions', icon: Shield },
]

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

// ── Permissions (role × feature flag matrix) ─────────────────────────────────────

const INTERNAL_ROLES = ['super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance'] as const
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', project_manager: 'PM',
  team_lead: 'Team Lead', employee: 'Employee', hr: 'HR', finance: 'Finance',
}
const FEATURE_LABELS: Record<string, string> = {
  can_view_reports:                'View Reports',
  can_approve_tasks:               'Approve Tasks',
  can_delete_projects:             'Delete Projects',
  can_manage_clients:              'Manage Clients',
  can_view_clients:                'View Clients',
  can_view_projects:               'View Projects',
  can_manage_people:               'Manage People',
  can_manage_integrations:         'Manage Integrations',
}

const FEATURE_SECTIONS: { label: string; features: string[] }[] = [
  { label: 'Projects',     features: ['can_view_projects', 'can_delete_projects'] },
  { label: 'Tasks',        features: ['can_approve_tasks'] },
  { label: 'Clients',      features: ['can_view_clients', 'can_manage_clients'] },
  { label: 'People',       features: ['can_manage_people'] },
  { label: 'Reports',      features: ['can_view_reports'] },
  { label: 'Integrations', features: ['can_manage_integrations'] },
]

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
                          const enabled = flag?.enabled ?? false
                          return (
                            <td key={role} className="text-center py-3 px-2">
                              <div className="flex justify-center">
                                <Toggle
                                  checked={enabled}
                                  onChange={(val) => {
                                    if (!canEdit || updating) return
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

// Route guarded to super_admin / admin (see App.tsx + SETTINGS_ROLES). Desktop keeps
// the sidebar-tab layout; mobile uses the hub → stack-screen pattern.
export default function SettingsPage({ mobileSection }: { mobileSection?: string } = {}) {
  const { profile } = useAuthContext()
  const isDesktop = useIsDesktop()
  const canEditFlags = profile?.role === 'super_admin' || profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState<Tab>('services')
  const showHub = !isDesktop && !mobileSection

  const renderPanel = (tab: Tab) =>
    tab === 'services'
      ? <ServicesPanel canManage={canEditFlags} />
      : <PermissionsPanel canEdit={canEditFlags} />

  // Mobile drill-in: one section rendered as a stack screen with its own back chrome.
  if (mobileSection) {
    const entry = SETTINGS_SECTIONS.find((s) => s.key === mobileSection)
    if (!entry) return <Navigate to="/settings" replace />
    return (
      <StackScreen title={entry.label}>
        <div className="bg-surface-1 border border-border-default rounded-xl p-5">
          {renderPanel(entry.key)}
        </div>
      </StackScreen>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Settings" back="/more" />

      <div className="px-4 py-6 lg:p-6 max-w-content mx-auto w-full">
        {showHub ? (
          <div className="flex flex-col gap-2.5">
            {SETTINGS_SECTIONS.map((s) => (
              <HubRow key={s.key} to={`/settings/${s.key}`} label={s.label} icon={s.icon} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Section nav — sidebar on desktop */}
            <div className="w-full lg:w-48 shrink-0">
              <nav className="flex lg:flex-col bg-surface-1 border border-border-default rounded-xl overflow-x-auto">
                {SETTINGS_SECTIONS.map(({ key, label, icon: Icon }) => (
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
              <div className="bg-surface-1 border border-border-default rounded-xl p-6">
                {renderPanel(activeTab)}
              </div>
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
