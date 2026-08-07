import { useMemo, useRef, useState } from 'react'
import {
  Plus, Search, Loader2, X, Mail, Copy, Check, UserCheck, UserX, ShieldAlert,
  Pencil, Users, Table2, LayoutGrid, BriefcaseBusiness, IdCard, MapPin, Upload, Trash2,
  MoreVertical, KeyRound, MailPlus,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { StartDMButton } from '../../components/chat/StartDMButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { TimePicker } from '../../components/ui/TimePicker'
import { Drawer } from '../../components/ui/Drawer'
import { ViewToggle, type ViewToggleOption } from '../../components/ui/ViewToggle'
import { Popover } from '../../components/ui/Popover'
import { ProfileRoles } from '../../components/shared/ProfileRoles'
import { SalaryCard } from '../../components/shared/SalaryCard'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useTeams } from '../../hooks/useTeams'
import { useDesignations } from '../../hooks/useDesignations'
import { useTeamMembers, useSetProfileTeams } from '../../hooks/useTeamMembers'
import {
  useAllPeople, useInviteUser, useUpdatePersonRole, useUpdatePersonDetails, useSetPersonActive, useDeletePerson,
  useResendInvite, useSetUserPassword,
} from '../../hooks/usePeople'
import type { Person, InviteResult } from '../../api/people'
import {
  canEditDetails, canManageTarget, assignableRoles, toUserRole,
  accountStatus, canSetPassword, canResendInvite, type AccountStatus,
} from '../../lib/peopleAccess'
import { useCanManagePeople } from '../../hooks/useRoleFlags'
import { ROLE_LABELS } from '../../lib/utils'
import { cn } from '../../lib/cn'
import { ModalShell } from '../../components/ui/ModalShell'
import { validateAvatarFile } from '../../lib/avatar'

type Option = { value: string; label: string }

const JOB_TYPE_LABELS: Record<string, string> = {
  on_site: 'On-site', hybrid: 'Hybrid', remote: 'Remote',
}
const JOB_TYPE_OPTIONS: Option[] = [
  { value: 'on_site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
]

// Multi-select team picker built from the shared Toggle primitive (no native multiselect).
function TeamPicker({ teams, value, onChange }: { teams: { id: string; name: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  if (teams.length === 0) {
    return <p className="rounded-md border border-dashed border-border-default bg-surface-inset px-3 py-2 font-mono text-[11px] text-text-4">No teams yet</p>
  }
  return (
    <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-md border border-border-default bg-surface-inset p-1.5">
      {teams.map((t) => {
        const checked = value.includes(t.id)
        return (
          <label key={t.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-surface-2">
            <span className="truncate font-ui text-[12.5px] text-text-2">{t.name}</span>
            <Toggle checked={checked} onChange={(v) => onChange(v ? [...value, t.id] : value.filter((x) => x !== t.id))} />
          </label>
        )
      })}
    </div>
  )
}

// ── Invite modal ─────────────────────────────────────────────────────────────────

function InviteModal({ actorRole, teams, designationOptions, onClose }: {
  actorRole: string
  teams: { id: string; name: string }[]
  designationOptions: Option[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: invite, isPending } = useInviteUser()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [designation, setDesignation] = useState('')
  const [jobType, setJobType] = useState('on_site')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const roleOptions = assignableRoles(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] }))

  const submit = () => {
    invite(
      { name: name.trim(), email: email.trim(), role, designation_id: designation || null, job_type: jobType, team_ids: teamIds },
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
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
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
                <button onClick={copyLink} className="text-text-3 hover:text-text-1 shrink-0">{copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}</button>
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
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Designation</label>
                  <Select value={designation} onChange={setDesignation} options={designationOptions} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Job type</label>
                  <Select value={jobType} onChange={setJobType} options={JOB_TYPE_OPTIONS} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Teams</label>
                <TeamPicker teams={teams} value={teamIds} onChange={setTeamIds} />
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
    </ModalShell>
  )
}

// ── Edit drawer ──────────────────────────────────────────────────────────────────

function EditDrawer({ person, actorRole, isSelf, teams, designationOptions, currentTeamIds, onClose }: {
  person: Person
  actorRole: string
  isSelf: boolean
  teams: { id: string; name: string }[]
  designationOptions: Option[]
  currentTeamIds: string[]
  onClose: () => void
}) {
  const toast = useToast()
  const { mutateAsync: saveRole, isPending: savingRole } = useUpdatePersonRole()
  const { mutateAsync: saveDetails, isPending: savingDetails } = useUpdatePersonDetails()
  const { mutateAsync: saveTeams, isPending: savingTeams } = useSetProfileTeams()

  const mayManage = canManageTarget(actorRole, person.role)
  const mayDetails = canEditDetails(actorRole) && !(actorRole === 'admin' && person.role === 'super_admin')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(person.name)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [role, setRole] = useState(person.role)
  const [teamIds, setTeamIds] = useState<string[]>(currentTeamIds)
  const [designation, setDesignation] = useState(person.designation_id ?? '')
  const [jobType, setJobType] = useState(person.job_type ?? 'on_site')
  // Stored as a postgres `time` (HH:MM:SS); the picker works in HH:MM.
  const origAllowedCheckIn = person.allowed_check_in?.slice(0, 5) ?? ''
  const [allowedCheckIn, setAllowedCheckIn] = useState(origAllowedCheckIn)
  const [attendanceExcluded, setAttendanceExcluded] = useState(person.attendance_excluded)

  const roleOptions = assignableRoles(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] }))
  const isPending = savingRole || savingDetails || savingTeams

  const sameTeams = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()
  const detailsChanged = name !== person.name || avatarFile !== null
  const roleChanged = role !== person.role || (designation || null) !== person.designation_id
    || jobType !== person.job_type || allowedCheckIn !== origAllowedCheckIn
    || attendanceExcluded !== person.attendance_excluded
  const teamsChanged = !sameTeams(teamIds, currentTeamIds)

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const error = validateAvatarFile(file)
    if (error) { toast(error, 'error'); return }
    if (preview) URL.revokeObjectURL(preview)
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    try {
      if (mayDetails && detailsChanged) {
        await saveDetails({ profileId: person.id, name: name.trim(), avatarUrl: person.avatar_url, avatarFile })
      }
      if (mayManage && roleChanged) {
        await saveRole({ profileId: person.id, role, designationId: designation || null, jobType, allowedCheckIn, attendanceExcluded })
      }
      if (mayManage && teamsChanged) {
        await saveTeams({ profileId: person.id, teamIds })
      }
      if (preview) URL.revokeObjectURL(preview)
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
      title={<div className="flex items-center gap-3"><Avatar name={person.name} src={preview ?? person.avatar_url ?? undefined} size="md" /><div><p className="font-display font-bold text-[15px] text-text-1">{person.name}</p><p className="font-mono text-[11px] text-text-3">{person.email}</p></div></div>}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={isPending || (!detailsChanged && !roleChanged && !teamsChanged)} onClick={save}>
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
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Avatar image</label>
              <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-inset p-3">
                <Avatar name={name || person.name} src={preview ?? person.avatar_url ?? undefined} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-[12.5px] font-semibold text-text-1">
                    {avatarFile ? avatarFile.name : 'Upload a new profile image'}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-text-4">Image files only · max 10 MB</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} /> Choose
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
              </div>
            </div>
          </section>
        )}

        {mayManage ? (
          <section className="space-y-3.5">
            <h4 className="font-mono text-[10px] text-text-4 uppercase tracking-wider">Role & assignment</h4>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Role</label>
              {isSelf ? (
                <>
                  <div className="flex items-center gap-2 rounded-md border border-border-default bg-surface-inset px-3 py-2">
                    <ProfileRoles profileId={person.id} fallbackRole={role} />
                  </div>
                  <p className="font-mono text-[10px] text-text-4 mt-1">You can't change your own role.</p>
                </>
              ) : (
                <Select value={role} onChange={setRole} options={roleOptions} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Designation</label>
                <Select value={designation} onChange={setDesignation} options={designationOptions} />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Job type</label>
                <Select value={jobType} onChange={setJobType} options={JOB_TYPE_OPTIONS} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Teams</label>
              <TeamPicker teams={teams} value={teamIds} onChange={setTeamIds} />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Allowed check-in</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TimePicker value={allowedCheckIn} onChange={setAllowedCheckIn} placeholder="Use office rule…" />
                </div>
                {allowedCheckIn && (
                  <button type="button" onClick={() => setAllowedCheckIn('')} className="shrink-0 rounded-md border border-border-default px-2.5 py-2 text-text-4 transition-colors hover:text-error" title="Clear (use normal office rule)">
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="font-mono text-[10px] text-text-4 mt-1">If set, checking in at or before this time is on-time (grace period ignored). Empty = standard office rule.</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-inset px-3 py-2.5">
              <div className="min-w-0">
                <p className="font-ui text-[12.5px] font-semibold text-text-1">Exclude from attendance</p>
                <p className="font-mono text-[10px] text-text-4 mt-0.5">Exempt (e.g. CEO/COO) — no check-in, hidden from attendance lists & reports.</p>
              </div>
              <Toggle checked={attendanceExcluded} onChange={setAttendanceExcluded} />
            </div>
          </section>
        ) : (
          <p className="font-ui text-[12.5px] text-text-3 flex items-center gap-2"><ShieldAlert size={14} className="text-text-4" /> You don't have permission to change this user's role.</p>
        )}

        {['super_admin', 'admin', 'hr'].includes(actorRole) && (
          <SalaryCard profileId={person.id} context="admin" />
        )}
      </div>
    </Drawer>
  )
}

function humanizeError(msg: string): string {
  if (msg.includes('forbidden_target') || msg.includes('forbidden_role') || msg.includes('forbidden')) return 'Not allowed for your role'
  if (msg.includes('cannot_manage_self') || msg.includes('cannot_change_own_role')) return "You can't change your own role"
  if (msg.includes('already_active')) return 'This user has already signed in'
  return msg
}

// ── Change password modal (admin/HR — no old password required) ────────────────────

function ChangePasswordModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const toast = useToast()
  const { mutate: setPassword, isPending } = useSetUserPassword()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')

  const submit = () => {
    if (pw.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    if (pw !== confirm) { toast('Passwords do not match', 'error'); return }
    setPassword({ profileId: person.id, password: pw }, {
      onSuccess: () => { toast(`Password updated for ${person.name}`, 'success'); onClose() },
      onError: (e) => toast(humanizeError(e.message), 'error'),
    })
  }

  return (
    <ModalShell onClose={onClose} size="sm" contentClassName="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-[16px] font-bold text-text-1"><KeyRound size={16} className="text-brand-red" /> Change password</h3>
        <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
      </div>
      <p className="mb-4 font-ui text-[12.5px] text-text-3">Set a new password for <span className="font-semibold text-text-1">{person.name}</span>. They can change it later from their profile.</p>
      <div className="space-y-3.5">
        <Input label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
        <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password"
          error={confirm && pw !== confirm ? 'Does not match' : undefined} />
      </div>
      <div className="mt-5 flex gap-2.5">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="flex-1" disabled={!pw || !confirm || isPending} onClick={submit}>
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Update password
        </Button>
      </div>
    </ModalShell>
  )
}

// ── People list views ─────────────────────────────────────────────────────────────

type ViewMode = 'cards' | 'table'

const GRID_COLS = 'grid-cols-[minmax(260px,1.5fr)_150px_minmax(140px,1fr)_140px_120px_124px]'

const PEOPLE_VIEWS: ViewToggleOption<ViewMode>[] = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Table2 },
]

function TeamsCell({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-inset border border-dashed border-border-default font-mono text-[10.5px] text-text-4">No team</span>
  }
  const [first, ...rest] = labels
  return (
    <span className="inline-flex max-w-[140px] items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 border border-border-subtle font-ui text-[11.5px] text-text-2" title={labels.join(', ')}>
      <Users size={11} className="text-text-4 shrink-0" />
      <span className="truncate">{first}</span>
      {rest.length > 0 && <span className="shrink-0 font-mono text-[10px] text-text-4">+{rest.length}</span>}
    </span>
  )
}

function JobTypeBadge({ jobType }: { jobType: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-inset border border-border-subtle px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-3">
      <MapPin size={9} className="text-text-4" />
      {JOB_TYPE_LABELS[jobType] ?? jobType}
    </span>
  )
}

function DesignationCell({ name, jobType }: { name: string | null; jobType: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {name
        ? <span className="truncate font-ui text-[12px] font-medium text-text-1">{name}</span>
        : <span className="font-mono text-[10.5px] text-text-4">No designation</span>}
      <JobTypeBadge jobType={jobType} />
    </div>
  )
}

const STATUS_META: Record<AccountStatus, { label: string; cls: string }> = {
  invited:   { label: 'Invited',   cls: 'bg-warning/10 text-warning border-warning/30' },
  verified:  { label: 'Verified',  cls: 'bg-service-dev/10 text-service-dev border-service-dev/30' },
  onboarded: { label: 'Onboarded', cls: 'bg-success/10 text-success border-success/30' },
}

function AccountStatusChip({ person }: { person: Person }) {
  const meta = STATUS_META[accountStatus(person)]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border font-mono text-[10px] font-semibold uppercase tracking-wider', meta.cls)}>
      {meta.label}
    </span>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left font-ui text-[12.5px] font-medium transition-colors',
        danger ? 'text-error hover:bg-error/10' : 'text-text-2 hover:bg-surface-3 hover:text-text-1',
      )}
    >
      <Icon size={14} className="shrink-0" />
      {label}
    </button>
  )
}

function PersonActionsMenu({ person, myRole, myId, onEdit, onToggleActive, onDelete, onChangePassword, onResend }: {
  person: Person
  myRole: string
  myId: string
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onChangePassword: () => void
  onResend: () => void
}) {
  const canManagePeople = useCanManagePeople()
  const mayManage = canManageTarget(myRole, person.role)
  const mayEdit = mayManage || canEditDetails(myRole)
  const mayDelete = (myRole === 'super_admin' || myRole === 'admin') && mayManage
  const mayPassword = canSetPassword(myRole, person.role) && person.id !== myId
  const mayResend = canResendInvite(myRole, person.role) && accountStatus(person) === 'invited'
  const showAnyAction = canManagePeople && (mayEdit || mayManage || mayPassword || mayResend)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'active' | 'delete' | null>(null)

  const close = () => { setOpen(false); setConfirm(null) }
  const run = (fn: () => void) => { close(); fn() }

  if (!showAnyAction) return <span className="block size-8" aria-hidden />

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
        aria-label={`Actions for ${person.name}`}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={close}
        className="w-48 overflow-hidden rounded-lg border border-border-default bg-surface-2 shadow-2xl"
      >
        {confirm ? (
          <div className="p-3">
            <p className="mb-3 font-ui text-[12.5px] text-text-2">
              {confirm === 'delete'
                ? `Delete ${person.name}? This can't be undone.`
                : `${person.is_active ? 'Deactivate' : 'Reactivate'} ${person.name}?`}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button
                variant={confirm === 'delete' ? 'danger' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={() => run(confirm === 'delete' ? onDelete : onToggleActive)}
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {mayEdit && <MenuItem icon={Pencil} label="Edit" onClick={() => run(onEdit)} />}
            {mayResend && <MenuItem icon={MailPlus} label="Invite" onClick={() => run(onResend)} />}
            {mayPassword && <MenuItem icon={KeyRound} label="Change password" onClick={() => run(onChangePassword)} />}
            {mayManage && (
              <MenuItem
                icon={person.is_active ? UserX : UserCheck}
                label={person.is_active ? 'Deactivate' : 'Activate'}
                onClick={() => setConfirm('active')}
              />
            )}
            {mayDelete && <MenuItem icon={Trash2} label="Delete" danger onClick={() => setConfirm('delete')} />}
          </div>
        )}
      </Popover>
    </div>
  )
}

type RowActions = {
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onChangePassword: () => void
  onResend: () => void
}

function PersonTableRow({ person, myRole, myId, teamLabels, designationName, ...actions }: {
  person: Person
  myRole: string
  myId: string
  teamLabels: string[]
  designationName: string | null
} & RowActions) {
  const inactiveBadge = !person.is_active && (
    <span className="rounded-full bg-error/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-error">Inactive</span>
  )

  return (
    <div className={cn('grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/45', GRID_COLS, !person.is_active && 'opacity-60')}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={person.name} src={person.avatar_url ?? undefined} size="sm" personId={person.id} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-ui text-[13px] font-semibold text-text-1">
            <PersonLink personId={person.id} className="truncate">{person.name}</PersonLink>
            <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 font-display text-[10px] font-bold text-text-2">Lv {person.level}</span>
            {inactiveBadge}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-text-3">{person.email}</p>
        </div>
      </div>
      <ProfileRoles profileId={person.id} fallbackRole={person.role} />
      <TeamsCell labels={teamLabels} />
      <DesignationCell name={designationName} jobType={person.job_type} />
      <AccountStatusChip person={person} />
      <div className="flex items-center justify-end gap-1">
        <StartDMButton profileId={person.id} name={person.name} role={person.role} />
        <PersonActionsMenu person={person} myRole={myRole} myId={myId} {...actions} />
      </div>
    </div>
  )
}

function PersonCard({ person, myRole, myId, teamLabels, designationName, ...actions }: {
  person: Person
  myRole: string
  myId: string
  teamLabels: string[]
  designationName: string | null
} & RowActions) {
  const inactiveBadge = !person.is_active && (
    <span className="rounded-full bg-error/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-error">Inactive</span>
  )

  return (
    <article className={cn('overflow-visible rounded-lg border border-border-default bg-surface-1 shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition-colors hover:border-border-strong', !person.is_active && 'opacity-65')}>
      <div className="border-b border-border-subtle bg-[linear-gradient(135deg,rgba(238,39,55,0.055),rgba(34,211,238,0.045)_58%,rgba(20,29,42,0)_100%)] p-4">
        <div className="flex items-start gap-3">
          <Avatar name={person.name} src={person.avatar_url ?? undefined} size="lg" personId={person.id} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <PersonLink personId={person.id} className="truncate font-display text-[15px] font-bold leading-tight text-text-1">{person.name}</PersonLink>
              {inactiveBadge}
            </div>
            <p className="mt-1 truncate font-mono text-[11.5px] text-text-3">{person.email}</p>
          </div>
          <StartDMButton profileId={person.id} name={person.name} role={person.role} />
          <PersonActionsMenu person={person} myRole={myRole} myId={myId} {...actions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProfileRoles profileId={person.id} fallbackRole={person.role} />
          <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 font-display text-[11px] font-bold text-text-1">Lv {person.level}</span>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2/35 px-3 py-2.5">
            <BriefcaseBusiness size={14} className="shrink-0 text-text-4" />
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Teams</p>
              <p className="truncate font-ui text-[12.5px] font-semibold text-text-1" title={teamLabels.join(', ')}>{teamLabels.length ? teamLabels.join(', ') : 'No team'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2/35 px-3 py-2.5">
            <IdCard size={14} className="shrink-0 text-text-4" />
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Designation</p>
              <p className="truncate font-ui text-[12.5px] font-semibold text-text-1">{designationName ?? 'None'}</p>
              <div className="mt-1"><JobTypeBadge jobType={person.job_type} /></div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">Account status</span>
          <span className="flex items-center gap-1.5">
            <AccountStatusChip person={person} />
            <span className={cn('rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider', person.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
              {person.is_active ? 'Active' : 'Inactive'}
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}

function EmptyPeopleState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 text-text-3">
        <Users size={18} />
      </div>
      <p className="mt-3 font-ui text-[13px] font-semibold text-text-2">No people match</p>
      <p className="mt-1 font-ui text-[12px] text-text-4">Try changing the search or role filter.</p>
    </div>
  )
}

type ListProps = {
  people: Person[]
  myRole: string
  myId: string
  teamsByProfile: Map<string, string[]>
  designationName: Map<string, string>
  onEdit: (person: Person) => void
  onToggleActive: (person: Person) => void
  onDelete: (person: Person) => void
  onChangePassword: (person: Person) => void
  onResend: (person: Person) => void
}

// Bind the per-person callbacks into the prop shape PersonTableRow/PersonCard expect.
function rowActions(p: Person, l: ListProps): RowActions {
  return {
    onEdit: () => l.onEdit(p),
    onToggleActive: () => l.onToggleActive(p),
    onDelete: () => l.onDelete(p),
    onChangePassword: () => l.onChangePassword(p),
    onResend: () => l.onResend(p),
  }
}

function PeopleTable(props: ListProps) {
  const { people, myRole, myId, teamsByProfile, designationName } = props
  return (
    <div className="hidden overflow-visible rounded-lg border border-border-default bg-surface-1 shadow-[0_18px_50px_rgba(0,0,0,0.12)] lg:block">
      <div className={cn('grid gap-4 rounded-t-lg border-b border-border-subtle bg-surface-2 px-5 py-3', GRID_COLS)}>
        {['Member', 'Role', 'Teams', 'Designation', 'Status', 'Actions'].map((h) => (
          <span key={h} className={cn('font-mono text-[10px] uppercase tracking-wider text-text-4', h === 'Actions' && 'text-right')}>
            {h}
          </span>
        ))}
      </div>
      <div className="divide-y divide-border-subtle">
        {people.length === 0 ? (
          <EmptyPeopleState />
        ) : (
          people.map((p) => (
            <PersonTableRow
              key={p.id}
              person={p}
              myRole={myRole}
              myId={myId}
              teamLabels={teamsByProfile.get(p.id) ?? []}
              designationName={p.designation_id ? designationName.get(p.designation_id) ?? null : null}
              {...rowActions(p, props)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PeopleCards(props: ListProps) {
  const { people, myRole, myId, teamsByProfile, designationName } = props
  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-1">
        <EmptyPeopleState />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {people.map((p) => (
        <PersonCard
          key={p.id}
          person={p}
          myRole={myRole}
          myId={myId}
          teamLabels={teamsByProfile.get(p.id) ?? []}
          designationName={p.designation_id ? designationName.get(p.designation_id) ?? null : null}
          {...rowActions(p, props)}
        />
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const myRole = profile?.role ?? ''
  const myId = profile?.id ?? ''
  // Inviting is the same capability as managing people (was canInvite = canManagePeople).
  const canInvite = useCanManagePeople()

  // The only screen that shows people who have left, split across the two tabs
  // below. Everywhere else uses usePeople(), which is active-only.
  const { data: people = [], isLoading } = useAllPeople()
  const { data: teams = [] } = useTeams()
  const { data: designations = [] } = useDesignations()
  const { data: teamMembers = [] } = useTeamMembers()
  const { mutate: setActive } = useSetPersonActive()
  const { mutate: deleteUser } = useDeletePerson()
  const { mutate: resend } = useResendInvite()

  const designationOptions = useMemo(
    () => [{ value: '', label: 'None' }, ...designations.filter((d) => d.is_active).map((d) => ({ value: d.id, label: d.name }))],
    [designations],
  )

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  /** Active is the working set; Inactive is the archive of people who have left. */
  const [statusTab, setStatusTab] = useState<'active' | 'inactive'>('active')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [passwordFor, setPasswordFor] = useState<Person | null>(null)

  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])
  const designationName = useMemo(() => new Map(designations.map((d) => [d.id, d.name])), [designations])

  // profileId → team ids, and the same resolved to team names for display.
  const teamIdsByProfile = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const tm of teamMembers) {
      const list = m.get(tm.profile_id) ?? []
      list.push(tm.team_id)
      m.set(tm.profile_id, list)
    }
    return m
  }, [teamMembers])
  const teamsByProfile = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const [pid, ids] of teamIdsByProfile) {
      m.set(pid, ids.map((id) => teamName.get(id)).filter((n): n is string => !!n))
    }
    return m
  }, [teamIdsByProfile, teamName])

  const activeCount = people.filter((p) => p.is_active).length
  const inactiveCount = people.length - activeCount

  const filtered = people.filter((p) => {
    const q = search.toLowerCase()
    const matchesText = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    const matchesRole = !roleFilter || p.role === roleFilter
    const matchesStatus = statusTab === 'active' ? p.is_active : !p.is_active
    return matchesText && matchesRole && matchesStatus
  })

  const toggleActive = (p: Person) => {
    setActive({ profileId: p.id, active: !p.is_active }, {
      onSuccess: () => toast(p.is_active ? `${p.name} deactivated` : `${p.name} reactivated`, 'success'),
      onError: (e) => toast(humanizeError(e.message), 'error'),
    })
  }

  const removePerson = (p: Person) => {
    deleteUser({ profileId: p.id }, {
      onSuccess: () => toast(`${p.name} deleted`, 'success'),
      onError: (e) => toast(humanizeError(e.message), 'error'),
    })
  }

  const resendInviteFor = (p: Person) => {
    resend({ profileId: p.id }, {
      onSuccess: (res) => toast(res.emailed ? `Invitation re-sent to ${p.email}` : 'Invite link regenerated, but email delivery is not configured', res.emailed ? 'success' : 'info'),
      onError: (e) => toast(humanizeError(e.message), 'error'),
    })
  }

  const roleFilterOptions = [
    { value: '', label: 'All roles' },
    ...Array.from(new Set(people.map((p) => p.role))).map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] })),
  ]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="People" back="/more" />
      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-surface-inset border border-border-default rounded-md pl-9 pr-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Active / Inactive. Deactivated people have left the company, so they
                are archived here and appear nowhere else in the portal. */}
            <div className="inline-flex items-center rounded-md border border-border-default bg-surface-inset p-0.5">
              {([
                { value: 'active', label: 'Active', count: activeCount },
                { value: 'inactive', label: 'Inactive', count: inactiveCount },
              ] as const).map((t) => {
                const on = statusTab === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStatusTab(t.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-ui text-[12px] font-medium transition-colors motion-reduce:transition-none',
                      on
                        ? t.value === 'inactive'
                          ? 'bg-[rgba(238,39,55,0.14)] text-brand-red'
                          : 'bg-surface-3 text-text-1'
                        : 'text-text-3 hover:text-text-1',
                    )}
                  >
                    {t.label}
                    <span className="font-mono text-[10px] tabular-nums text-text-4">{t.count}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex-1 sm:flex-none sm:w-44"><Select value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} /></div>
            <ViewToggle value={viewMode} onChange={setViewMode} options={PEOPLE_VIEWS} className="hidden lg:flex" />
            {canInvite && <Button size="sm" className="shrink-0" onClick={() => setInviteOpen(true)}><Plus size={13} /> Invite</Button>}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>
        ) : (
          <>
            <div className="lg:hidden">
              <PeopleCards people={filtered} myRole={myRole} myId={myId} teamsByProfile={teamsByProfile} designationName={designationName} onEdit={setEditing} onToggleActive={toggleActive} onDelete={removePerson} onChangePassword={setPasswordFor} onResend={resendInviteFor} />
            </div>
            {viewMode === 'table' ? (
              <PeopleTable people={filtered} myRole={myRole} myId={myId} teamsByProfile={teamsByProfile} designationName={designationName} onEdit={setEditing} onToggleActive={toggleActive} onDelete={removePerson} onChangePassword={setPasswordFor} onResend={resendInviteFor} />
            ) : (
              <div className="hidden lg:block">
                <PeopleCards people={filtered} myRole={myRole} myId={myId} teamsByProfile={teamsByProfile} designationName={designationName} onEdit={setEditing} onToggleActive={toggleActive} onDelete={removePerson} onChangePassword={setPasswordFor} onResend={resendInviteFor} />
              </div>
            )}
          </>
        )}
      </div>

      {inviteOpen && <InviteModal actorRole={myRole} teams={teams.map((t) => ({ id: t.id, name: t.name }))} designationOptions={designationOptions} onClose={() => setInviteOpen(false)} />}
      {editing && <EditDrawer person={editing} actorRole={myRole} isSelf={editing.id === myId} teams={teams.map((t) => ({ id: t.id, name: t.name }))} designationOptions={designationOptions} currentTeamIds={teamIdsByProfile.get(editing.id) ?? []} onClose={() => setEditing(null)} />}
      {passwordFor && <ChangePasswordModal person={passwordFor} onClose={() => setPasswordFor(null)} />}
    </div>
  )
}
