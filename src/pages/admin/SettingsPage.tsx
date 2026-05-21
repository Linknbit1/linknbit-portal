import { useState } from 'react'
import { Check, Bell, Zap, Layers, Link2, Palette, Shield, ChevronRight, Loader2 } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useRoleFlags, useUpdateRoleFlag } from '../../hooks/useRoleFlags'
import { cn } from '../../lib/cn'

type Tab = 'general' | 'xp' | 'stages' | 'notifications' | 'integrations' | 'permissions'

const TABS: { key: Tab; label: string; icon: typeof Check }[] = [
  { key: 'general',       label: 'General',       icon: Palette },
  { key: 'xp',           label: 'XP & Rewards',   icon: Zap },
  { key: 'stages',       label: 'Stages',          icon: Layers },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'integrations', label: 'Integrations',    icon: Link2 },
  { key: 'permissions',  label: 'Permissions',     icon: Shield },
]

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

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 bg-surface-inset border border-border-default rounded-md px-2.5 py-1.5 text-[13px] font-mono text-text-1 outline-none focus:border-border-focus text-right"
    />
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
const FEATURE_ORDER = [
  'can_view_reports', 'can_approve_tasks', 'can_delete_projects',
  'can_manage_clients', 'can_view_clients', 'can_view_projects',
  'can_manage_rewards', 'can_manage_quests', 'can_give_shoutout',
  'can_mark_attendance', 'can_view_all_attendance',
  'can_manage_people', 'can_grant_xp', 'can_manage_integrations',
] as const
const FEATURE_LABELS: Record<string, string> = {
  can_view_reports: 'View Reports',
  can_approve_tasks: 'Approve Tasks',
  can_delete_projects: 'Delete Projects',
  can_manage_clients: 'Manage Clients',
  can_view_clients: 'View Clients',
  can_view_projects: 'View Projects',
  can_manage_rewards: 'Manage Rewards',
  can_manage_quests: 'Manage Quests',
  can_give_shoutout: 'Give Shoutouts',
  can_mark_attendance: 'Mark Attendance',
  can_view_all_attendance: 'View All Attendance',
  can_manage_people: 'Manage People',
  can_grant_xp: 'Grant XP',
  can_manage_integrations: 'Manage Integrations',
}

export default function SettingsPage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: flags = [], isLoading: flagsLoading } = useRoleFlags()
  const { mutate: updateFlag, isPending: updatingFlag } = useUpdateRoleFlag()
  const canEditFlags = profile?.role === 'super_admin' || profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState<Tab>('general')

  // General
  const [agencyName, setAgencyName] = useState('Linknbit')
  const [timezone, setTimezone] = useState('Asia/Karachi')

  // XP
  const [easyTaskXP, setEasyTaskXP] = useState(25)
  const [mediumTaskXP, setMediumTaskXP] = useState(50)
  const [hardTaskXP, setHardTaskXP] = useState(85)
  const [stdShoutoutXP, setStdShoutoutXP] = useState(100)
  const [highShoutoutXP, setHighShoutoutXP] = useState(135)
  const [monthlyReset, setMonthlyReset] = useState(true)
  const [penaltyEnabled, setPenaltyEnabled] = useState(false)

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
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-ui font-medium transition-colors border-b border-border-subtle last:border-0',
                    activeTab === key
                      ? 'bg-brand-red/10 text-brand-red'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                  )}
                >
                  <Icon size={14} />
                  {label}
                  {activeTab === key && <ChevronRight size={12} className="ml-auto" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-1 border border-border-default rounded-xl p-6">

              {activeTab === 'general' && (
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

              {activeTab === 'xp' && (
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 mb-1">XP & Rewards Rules</h2>
                  <p className="font-ui text-[13px] text-text-3 mb-5">Configure Link Points (LP) values per the rewards policy.</p>

                  <div className="mb-4">
                    <p className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider mb-2">Task Completion</p>
                    <Field label="Easy Task" hint="Simple tasks (20–30 LP recommended)">
                      <NumberInput value={easyTaskXP} onChange={setEasyTaskXP} min={10} max={50} />
                    </Field>
                    <Field label="Medium Task" hint="Standard tasks (40–60 LP recommended)">
                      <NumberInput value={mediumTaskXP} onChange={setMediumTaskXP} min={20} max={80} />
                    </Field>
                    <Field label="Hard Task" hint="Complex/urgent tasks (70–100 LP recommended)">
                      <NumberInput value={hardTaskXP} onChange={setHardTaskXP} min={50} max={120} />
                    </Field>
                  </div>

                  <div className="mb-4">
                    <p className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider mb-2">Shoutouts</p>
                    <Field label="Standard Shoutout" hint="Manager/TL/HR issued (100 LP recommended)">
                      <NumberInput value={stdShoutoutXP} onChange={setStdShoutoutXP} min={50} max={150} />
                    </Field>
                    <Field label="High Impact Shoutout" hint="Exceptional contribution (120–150 LP)">
                      <NumberInput value={highShoutoutXP} onChange={setHighShoutoutXP} min={100} max={200} />
                    </Field>
                  </div>

                  <div>
                    <p className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider mb-2">System Rules</p>
                    <Field label="Monthly LP Reset" hint="LP resets to zero at end of each month">
                      <Toggle checked={monthlyReset} onChange={setMonthlyReset} />
                    </Field>
                    <Field label="LP Penalty Deduction" hint="Disabled per policy — use participation restriction instead">
                      <Toggle checked={penaltyEnabled} onChange={setPenaltyEnabled} />
                    </Field>
                  </div>
                </div>
              )}

              {activeTab === 'stages' && (
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

              {activeTab === 'notifications' && (
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

              {activeTab === 'integrations' && (
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

              {activeTab === 'permissions' && (
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
                            <th className="text-left py-2 font-mono text-text-4 uppercase text-[10px] tracking-wider pr-6 min-w-[160px]">Feature</th>
                            {INTERNAL_ROLES.map((role) => (
                              <th key={role} className="text-center py-2 font-ui font-semibold text-text-3 px-2 min-w-[70px]">
                                {ROLE_LABELS[role]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {FEATURE_ORDER.map((featureKey) => {
                            const label = FEATURE_LABELS[featureKey] ?? featureKey
                            return (
                              <tr key={featureKey} className="border-b border-border-subtle last:border-0">
                                <td className="py-3 font-ui text-[13px] text-text-2 pr-6 whitespace-nowrap">{label}</td>
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
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              {activeTab !== 'permissions' && activeTab !== 'stages' && (
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
