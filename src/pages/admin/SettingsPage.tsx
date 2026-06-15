import React, { useState } from 'react'
import { Check, Bell, Layers, Link2, Palette, Shield, ChevronRight, Loader2, Shapes, Plus, Trash2 } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { isAuthoritative } from '../../lib/roles'
import { useRoleFlags, useUpdateRoleFlag } from '../../hooks/useRoleFlags'
import {
  useServices, useCreateService, useUpdateService, useDeleteService, useServiceUsage,
} from '../../hooks/useServices'
import type { Service } from '../../api/services'
import { cn } from '../../lib/cn'

type Tab = 'general' | 'services' | 'stages' | 'notifications' | 'integrations' | 'permissions'

// `personal` tabs are available to every internal user; the rest are company
// settings, shown only to authoritative (management) roles.
const TABS: { key: Tab; label: string; icon: typeof Check; personal?: boolean }[] = [
  { key: 'general',       label: 'General',       icon: Palette },
  { key: 'services',     label: 'Services',        icon: Shapes },
  { key: 'stages',       label: 'Stages',          icon: Layers },
  { key: 'notifications', label: 'Notifications', icon: Bell, personal: true },
  { key: 'integrations', label: 'Integrations',    icon: Link2 },
  { key: 'permissions',  label: 'Permissions',     icon: Shield },
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
        className="w-8 h-8 rounded-md bg-transparent border border-border-default cursor-pointer disabled:cursor-default" aria-label={`${service.name} colour`} />
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
              className="w-8 h-8 rounded-md bg-transparent border border-border-default cursor-pointer" aria-label="New service colour" />
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0">
      <div>
        <p className="font-ui font-medium text-[13.5px] text-text-1">{label}</p>
        {hint && <p className="font-ui text-[12px] text-text-3 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0 ml-6">{children}</div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-48 bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
    />
  )
}

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

export default function SettingsPage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: flags = [], isLoading: flagsLoading } = useRoleFlags()
  const { mutate: updateFlag, isPending: updatingFlag } = useUpdateRoleFlag()
  const canEditFlags = profile?.role === 'super_admin' || profile?.role === 'admin'

  const authoritative = isAuthoritative(profile?.role)
  const visibleTabs = authoritative ? TABS : TABS.filter((t) => t.personal)

  const [activeTab, setActiveTab] = useState<Tab>('general')
  // Clamp to a visible tab (e.g. a non-authoritative user only has personal tabs).
  const effectiveTab: Tab = visibleTabs.some((t) => t.key === activeTab)
    ? activeTab
    : visibleTabs[0].key

  // General
  const [agencyName, setAgencyName] = useState('Linknbit')
  const [timezone, setTimezone] = useState('Asia/Karachi')

  // Notifications
  const [notifTaskComplete, setNotifTaskComplete] = useState(true)
  const [notifApprovals, setNotifApprovals] = useState(true)
  const [notifDeadlines, setNotifDeadlines] = useState(true)
  const [notifXP, setNotifXP] = useState(true)
  const [emailNotif, setEmailNotif] = useState(false)

  // Integrations
  const [clickupKey, setClickupKey] = useState('cu_xxxxxxxxxxxxxxxx')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [autoSync, setAutoSync] = useState(true)

  const handleSave = () => {
    toast('Settings saved successfully', 'success')
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Settings" />

      <div className="p-6 max-w-content mx-auto w-full">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              {visibleTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-ui font-medium transition-colors border-b border-border-subtle last:border-0',
                    effectiveTab === key
                      ? 'bg-brand-red/10 text-brand-red'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                  )}
                >
                  <Icon size={14} />
                  {label}
                  {effectiveTab === key && <ChevronRight size={12} className="ml-auto" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-1 border border-border-default rounded-xl p-6">

              {effectiveTab === 'general' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">General Settings</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-5">Agency identity and regional settings.</p>
                  <Field label="Agency Name" hint="Displayed in the portal header and reports">
                    <TextInput value={agencyName} onChange={setAgencyName} placeholder="Your Agency" />
                  </Field>
                  <Field label="Timezone" hint="Used for attendance and deadline calculations">
                    <TextInput value={timezone} onChange={setTimezone} placeholder="Asia/Karachi" />
                  </Field>
                  <Field label="Default Currency" hint="For budget and reward display">
                    <select className="bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus">
                      <option>PKR — Pakistani Rupee</option>
                      <option>USD — US Dollar</option>
                    </select>
                  </Field>
                </div>
              )}

              {effectiveTab === 'services' && <ServicesPanel canManage={canEditFlags} />}

              {effectiveTab === 'stages' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Stage Templates</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-5">Manage service-based workflow stages.</p>
                  {[
                    { service: 'Design', color: '#A78BFA', stages: ['Discovery & Brief', 'Research & Strategy', 'Wireframing', 'UI Design', 'Internal Review', 'Client Review', 'Revisions', 'Final Approval', 'Handover'] },
                    { service: 'Development', color: '#22D3EE', stages: ['Requirement Finalization', 'Technical Planning', 'Setup & Architecture', 'Development', 'Internal QA', 'Client Testing (UAT)', 'Bug Fixing', 'Deployment', 'Support'] },
                    { service: 'Marketing', color: '#FBBF24', stages: ['Onboarding', 'Audit & Research', 'Strategy', 'Creative Production', 'Campaign Setup', 'Launch', 'Optimization', 'Reporting', 'Scaling'] },
                  ].map(({ service, color, stages }) => (
                    <div key={service} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="font-display font-semibold text-[13.5px] text-text-1">{service}</span>
                        <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-1.5 py-0.5 rounded">{stages.length} stages</span>
                        <button
                          onClick={() => toast(`Edit ${service} stages`, 'info')}
                          className="ml-auto text-[11.5px] font-ui font-semibold text-text-3 hover:text-text-1 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stages.map((stage, i) => (
                          <span
                            key={stage}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle rounded-md text-[11.5px] font-ui text-text-2"
                          >
                            <span className="font-mono text-[9.5px] text-text-4">{i + 1}.</span>
                            {stage}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {effectiveTab === 'notifications' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Notifications</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-5">Control which events trigger notifications.</p>
                  <Field label="Task Completed" hint="Notify when a task is marked complete">
                    <Toggle checked={notifTaskComplete} onChange={setNotifTaskComplete} />
                  </Field>
                  <Field label="Stage Approvals" hint="Notify on approval requests and responses">
                    <Toggle checked={notifApprovals} onChange={setNotifApprovals} />
                  </Field>
                  <Field label="Deadline Alerts" hint="Warn 3 days before due dates">
                    <Toggle checked={notifDeadlines} onChange={setNotifDeadlines} />
                  </Field>
                  <Field label="XP & Rewards" hint="Notify when XP is earned or rewards redeemed">
                    <Toggle checked={notifXP} onChange={setNotifXP} />
                  </Field>
                  <Field label="Email Notifications" hint="Send emails in addition to in-app alerts">
                    <Toggle checked={emailNotif} onChange={setEmailNotif} />
                  </Field>
                </div>
              )}

              {effectiveTab === 'integrations' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Integrations</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-5">Connect external services.</p>
                  <Field label="ClickUp API Key" hint="Used to sync projects and tasks">
                    <input
                      value={clickupKey}
                      onChange={(e) => setClickupKey(e.target.value)}
                      type="password"
                      className="w-52 bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus"
                    />
                  </Field>
                  <Field label="Discord Webhook" hint="Post notifications to a Discord channel">
                    <input
                      value={discordWebhook}
                      onChange={(e) => setDiscordWebhook(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-52 bg-surface-inset border border-border-default rounded-md px-3 py-1.5 text-[13px] font-mono text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                    />
                  </Field>
                  <Field label="Auto Sync ClickUp" hint="Sync automatically every 15 minutes">
                    <Toggle checked={autoSync} onChange={setAutoSync} />
                  </Field>
                  <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={() => toast('Testing ClickUp connection...', 'info')}>
                      Test Connection
                    </Button>
                  </div>
                </div>
              )}

              {effectiveTab === 'permissions' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">Permissions</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-1">Role-based feature access. Toggle to enable or disable per role.</p>
                  {!canEditFlags && (
                    <p className="font-mono text-[11px] text-text-4 mb-4">View only — only Super Admins and Admins can change permissions.</p>
                  )}
                  {canEditFlags && <p className="font-mono text-[11px] text-text-4 mb-4">Changes take effect immediately for all sessions.</p>}

                  {flagsLoading ? (
                    <div className="flex items-center justify-center py-16 text-text-4">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px] min-w-[700px]">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left py-2 font-mono text-text-4 uppercase text-[10px] tracking-wider pr-6 min-w-[180px]">Feature</th>
                            {INTERNAL_ROLES.map((role) => (
                              <th key={role} className="text-center py-2 font-ui font-semibold text-text-3 px-2 min-w-[70px]">
                                {ROLE_LABELS[role]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {FEATURE_SECTIONS.map((section) => (
                            <React.Fragment key={section.label}>
                              <tr className="border-b border-border-subtle">
                                <td
                                  colSpan={INTERNAL_ROLES.length + 1}
                                  className="py-2 px-3 bg-surface-2"
                                >
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
                                                if (!canEditFlags || updatingFlag) return
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
              )}

              {/* Save button */}
              {effectiveTab !== 'permissions' && effectiveTab !== 'stages' && (
                <div className="mt-6 pt-5 border-t border-border-subtle flex justify-end">
                  <Button onClick={handleSave}>
                    <Check size={14} /> Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
