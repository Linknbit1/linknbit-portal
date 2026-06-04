import { useMemo, useState } from 'react'
import {
  Plus, Search, Loader2, X, Mail, Copy, Check, UserCheck, UserX, ShieldAlert,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Drawer } from '../../components/ui/Drawer'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useTeams } from '../../hooks/useTeams'
import { useServices } from '../../hooks/useServices'
import {
  usePeople, useInviteUser, useUpdatePersonRole, useUpdatePersonDetails, useSetPersonActive,
} from '../../hooks/usePeople'
import type { Person, InviteResult } from '../../api/people'
import {
  canManagePeople, canInvite, canEditDetails, canManageTarget, assignableRoles, toUserRole,
} from '../../lib/peopleAccess'
import { ROLE_LABELS } from '../../lib/utils'
import { cn } from '../../lib/cn'

type Option = { value: string; label: string }

// ── Invite modal ─────────────────────────────────────────────────────────────────

function InviteModal({ actorRole, teams, serviceOptions, onClose }: {
  actorRole: string
  teams: { id: string; name: string }[]
  serviceOptions: Option[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: invite, isPending } = useInviteUser()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [teamId, setTeamId] = useState('')
  const [service, setService] = useState('')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const roleOptions = assignableRoles(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] }))

  const submit = () => {
    invite(
      { name: name.trim(), email: email.trim(), role, team_id: teamId || null, service_type: service || null },
      {
        onSuccess: (res) => {
          setResult(res)
          toast(res.emailed ? `Invite emailed to ${email}` : 'User created — share the invite link below', 'success')
        },
        onError: (e) => toast(e.message || 'Invite failed', 'error'),
      },
    )
  }

  const copyLink = () => {
    if (!result?.invite_link) return
    navigator.clipboard.writeText(result.invite_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2"><Mail size={16} className="text-brand-red" /> Invite User</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="font-ui text-[13px] text-text-2">
              {result.emailed
                ? `An invitation email has been sent to ${email}.`
                : 'Email delivery is not configured — copy this invite link and send it to the user:'}
            </p>
            {result.invite_link && (
              <div className="flex items-center gap-2 bg-surface-inset border border-border-default rounded-md px-3 py-2">
                <span className="font-mono text-[11px] text-text-3 truncate flex-1">{result.invite_link}</span>
                <button onClick={copyLink} className="text-text-3 hover:text-text-1 flex-shrink-0">{copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}</button>
              </div>
            )}
            <Button size="sm" className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3.5">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmad Karimi" />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmad@linknbit.com" />
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Role</label>
                <Select value={role} onChange={setRole} options={roleOptions} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Team</label>
                  <Select value={teamId} onChange={setTeamId} options={[{ value: '', label: 'No team' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Service</label>
                  <Select value={service} onChange={setService} options={serviceOptions} />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="flex-1" disabled={!name.trim() || !email.trim() || isPending} onClick={submit}>
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Send Invite
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Edit drawer ──────────────────────────────────────────────────────────────────

function EditDrawer({ person, actorRole, teams, serviceOptions, onClose }: {
  person: Person
  actorRole: string
  teams: { id: string; name: string }[]
  serviceOptions: Option[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutateAsync: saveRole, isPending: savingRole } = useUpdatePersonRole()
  const { mutateAsync: saveDetails, isPending: savingDetails } = useUpdatePersonDetails()

  const mayManage = canManageTarget(actorRole, person.role)
  const mayDetails = canEditDetails(actorRole) && !(actorRole === 'admin' && person.role === 'super_admin')

  const [name, setName] = useState(person.name)
  const [avatarUrl, setAvatarUrl] = useState(person.avatar_url ?? '')
  const [role, setRole] = useState(person.role)
  const [teamId, setTeamId] = useState(person.team_id ?? '')
  const [service, setService] = useState(person.service_type ?? '')

  const roleOptions = assignableRoles(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] }))
  const isPending = savingRole || savingDetails

  const detailsChanged = name !== person.name || (avatarUrl || null) !== person.avatar_url
  const roleChanged = role !== person.role || (teamId || null) !== person.team_id || (service || null) !== person.service_type

  const save = async () => {
    try {
      if (mayDetails && detailsChanged) {
        await saveDetails({ profileId: person.id, name: name.trim(), avatarUrl: avatarUrl.trim() || null })
      }
      if (mayManage && roleChanged) {
        await saveRole({ profileId: person.id, role, teamId: teamId || null, serviceType: service || null })
      }
      toast('Changes saved', 'success')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? humanizeError(e.message) : 'Save failed', 'error')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={<div className="flex items-center gap-3"><Avatar name={person.name} size="md" /><div><p className="font-display font-bold text-[15px] text-text-1">{person.name}</p><p className="font-mono text-[11px] text-text-3">{person.email}</p></div></div>}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={isPending || (!detailsChanged && !roleChanged)} onClick={save}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Changes
          </Button>
        </div>
      }
    >
      <div className="p-5 flex flex-col gap-5">
        {mayDetails && (
          <section className="space-y-3.5">
            <h4 className="font-mono text-[10px] text-text-4 uppercase tracking-wider">Personal details</h4>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </section>
        )}

        {mayManage ? (
          <section className="space-y-3.5">
            <h4 className="font-mono text-[10px] text-text-4 uppercase tracking-wider">Role & assignment</h4>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Role</label>
              <Select value={role} onChange={setRole} options={roleOptions} />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Team</label>
              <Select value={teamId} onChange={setTeamId} options={[{ value: '', label: 'No team' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Service</label>
              <Select value={service} onChange={setService} options={serviceOptions} />
              <p className="font-mono text-[10px] text-text-4 mt-1">A team assignment overrides this with the team's service.</p>
            </div>
          </section>
        ) : (
          <p className="font-ui text-[12.5px] text-text-3 flex items-center gap-2"><ShieldAlert size={14} className="text-text-4" /> You don't have permission to change this user's role.</p>
        )}
      </div>
    </Drawer>
  )
}

function humanizeError(msg: string): string {
  if (msg.includes('forbidden_target') || msg.includes('forbidden_role') || msg.includes('forbidden')) return 'Not allowed for your role'
  if (msg.includes('cannot_manage_self')) return "You can't change your own role"
  return msg
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const myRole = profile?.role ?? ''
  const canManage = canManagePeople(myRole)

  const { data: people = [], isLoading } = usePeople()
  const { data: teams = [] } = useTeams()
  const { data: services = [] } = useServices()
  const { mutate: setActive } = useSetPersonActive()

  const serviceOptions = useMemo(
    () => [{ value: '', label: 'None' }, ...services.filter((s) => s.is_active).map((s) => ({ value: s.slug, label: s.name }))],
    [services],
  )

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [confirmActive, setConfirmActive] = useState<string | null>(null)

  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])

  const filtered = people.filter((p) => {
    const q = search.toLowerCase()
    const matchesText = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    const matchesRole = !roleFilter || p.role === roleFilter
    return matchesText && matchesRole
  })

  const toggleActive = (p: Person) => {
    setActive({ profileId: p.id, active: !p.is_active }, {
      onSuccess: () => { toast(p.is_active ? `${p.name} deactivated` : `${p.name} reactivated`, 'success'); setConfirmActive(null) },
      onError: (e) => { toast(humanizeError(e.message), 'error'); setConfirmActive(null) },
    })
  }

  const roleFilterOptions = [
    { value: '', label: 'All roles' },
    ...Array.from(new Set(people.map((p) => p.role))).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] })),
  ]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="People" />
      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-surface-inset border border-border-default rounded-md pl-9 pr-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <div className="w-44"><Select value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} /></div>
          <div className="flex-1" />
          {canInvite(myRole) && <Button size="sm" onClick={() => setInviteOpen(true)}><Plus size={13} /> Invite User</Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_140px_120px_90px_120px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
              {['Member', 'Role', 'Team', 'Service', 'Level', ''].map((h) => <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>)}
            </div>
            {filtered.length === 0 && <div className="px-5 py-10 text-center text-text-4 font-ui text-[13px]">No people match.</div>}
            {filtered.map((p) => {
              const mayManage = canManageTarget(myRole, p.role)
              return (
                <div key={p.id} className={cn('grid grid-cols-[1fr_130px_140px_120px_90px_120px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0', !p.is_active && 'opacity-55')}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={p.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-ui font-semibold text-[13px] text-text-1 truncate flex items-center gap-1.5">
                        {p.name}
                        {!p.is_active && <span className="font-mono text-[9px] text-error bg-error/10 px-1 py-0.5 rounded-xs">INACTIVE</span>}
                      </p>
                      <p className="font-mono text-[11px] text-text-3 truncate">{p.email}</p>
                    </div>
                  </div>
                  <RoleBadge role={toUserRole(p.role)} />
                  <span className="font-ui text-[12px] text-text-2 truncate">{p.team_id ? teamName.get(p.team_id) ?? '—' : '—'}</span>
                  <span>{p.service_type ? <ServiceChip service={p.service_type} /> : <span className="font-mono text-[11px] text-text-4">—</span>}</span>
                  <span className="font-display font-bold text-[12px] text-text-1">Lv {p.level}</span>
                  <div className="flex justify-end gap-1.5">
                    {canManage && (
                      <Button size="sm" variant="ghost" disabled={!mayManage && !canEditDetails(myRole)} onClick={() => setEditing(p)}>Edit</Button>
                    )}
                    {canManage && mayManage && (
                      confirmActive === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleActive(p)} className="font-mono text-[10.5px] text-error font-bold">Confirm</button>
                          <span className="text-text-4 text-[10px]">/</span>
                          <button onClick={() => setConfirmActive(null)} className="font-mono text-[10.5px] text-text-3">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmActive(p.id)} className={cn('p-1.5', p.is_active ? 'text-text-4 hover:text-error' : 'text-text-4 hover:text-success')} title={p.is_active ? 'Deactivate' : 'Reactivate'}>
                          {p.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {inviteOpen && <InviteModal actorRole={myRole} teams={teams.map((t) => ({ id: t.id, name: t.name }))} serviceOptions={serviceOptions} onClose={() => setInviteOpen(false)} />}
      {editing && <EditDrawer person={editing} actorRole={myRole} teams={teams.map((t) => ({ id: t.id, name: t.name }))} serviceOptions={serviceOptions} onClose={() => setEditing(null)} />}
    </div>
  )
}
