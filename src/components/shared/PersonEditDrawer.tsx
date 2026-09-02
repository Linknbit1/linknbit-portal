import { useMemo, useRef, useState } from 'react'
import { Check, Loader2, ShieldAlert, Upload, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TimePicker } from '../ui/TimePicker'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import { ProfileRoles } from './ProfileRoles'
import { TeamPicker } from './TeamPicker'
import { SalaryCard } from './SalaryCard'
import { useDesignations } from '../../hooks/useDesignations'
import { useTeams } from '../../hooks/useTeams'
import { useSetProfileTeams, useTeamMembers } from '../../hooks/useTeamMembers'
import { useUpdatePersonDetails, useUpdatePersonRole } from '../../hooks/usePeople'
import { useAuthority, useCanAccess, useCanManagePeople } from '../../hooks/useRoleFlags'
import { assignableRoleSlugs, humanizeError, outranks, toUserRole } from '../../lib/peopleAccess'
import { JOB_TYPE_OPTIONS, ROLE_LABELS } from '../../lib/utils'
import { validateAvatarFile } from '../../lib/avatar'
import type { Person } from '../../api/people'

interface PersonEditDrawerProps {
  person: Person
  /** Editing yourself: the role picker locks, since nobody promotes themselves. */
  isSelf: boolean
  onClose: () => void
}

/**
 * Edit one person's details, role and assignment.
 *
 * Opened from People and from a member's profile page, so it reads the teams,
 * designations and rank ladder it needs from their shared queries rather than
 * taking them as props — all four are cached for five minutes and deduped by
 * TanStack Query, and threading them through two callers would only let the two
 * screens drift apart.
 *
 * Every gate here is the UI half of a rule the database enforces anyway:
 * `can_edit_any_profile` / rank for details, rank for role and teams. The
 * admin_*_profile RPCs would refuse regardless — this only keeps a person from
 * filling in a form that was always going to be rejected.
 */
export function PersonEditDrawer({ person, isSelf, onClose }: PersonEditDrawerProps) {
  const toast = useToast()
  const { mutateAsync: saveRole, isPending: savingRole } = useUpdatePersonRole()
  const { mutateAsync: saveDetails, isPending: savingDetails } = useUpdatePersonDetails()
  const { mutateAsync: saveTeams, isPending: savingTeams } = useSetProfileTeams()

  const authority = useAuthority()
  const { data: teams = [] } = useTeams()
  const { data: designations = [] } = useDesignations()
  const { data: teamMembers = [], isPending: teamsLoading } = useTeamMembers()

  const teamOptions = useMemo(() => teams.map((t) => ({ id: t.id, name: t.name })), [teams])
  const designationOptions = useMemo(
    () => [{ value: '', label: 'None' }, ...designations.filter((d) => d.is_active).map((d) => ({ value: d.id, label: d.name }))],
    [designations],
  )
  const currentTeamIds = useMemo(
    () => teamMembers.filter((tm) => tm.profile_id === person.id).map((tm) => tm.team_id),
    [teamMembers, person.id],
  )

  const canEditAnyProfile = useCanAccess('can_edit_any_profile')
  const canManagePeople = useCanManagePeople()
  const mayManage = outranks(authority.myRank, authority.rankOf(person.role))
  // Editing someone's details still needs you to outrank them: the rank check is
  // what stopped an admin renaming a super admin.
  const mayDetails = canEditAnyProfile && mayManage

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(person.name)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [role, setRole] = useState(person.role)
  // null until the picker is actually touched. Opened from a profile page the
  // memberships may still be in flight, and seeding state from the empty array
  // that useTeamMembers returns while loading would read back as "every team
  // removed" the moment they arrived.
  const [pickedTeamIds, setPickedTeamIds] = useState<string[] | null>(null)
  const teamIds = pickedTeamIds ?? currentTeamIds
  const [designation, setDesignation] = useState(person.designation_id ?? '')
  const [jobType, setJobType] = useState(person.job_type ?? 'on_site')
  // Stored as a postgres `time` (HH:MM:SS); the picker works in HH:MM.
  const origAllowedCheckIn = person.allowed_check_in?.slice(0, 5) ?? ''
  const [allowedCheckIn, setAllowedCheckIn] = useState(origAllowedCheckIn)
  const [attendanceExcluded, setAttendanceExcluded] = useState(person.attendance_excluded)

  const roleOptions = assignableRoleSlugs(authority.myRank, authority.ladder)
    .map((r) => ({ value: r, label: ROLE_LABELS[toUserRole(r)] }))
  const isPending = savingRole || savingDetails || savingTeams

  const sameTeams = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()
  const detailsChanged = name !== person.name || avatarFile !== null
  const roleChanged = role !== person.role || (designation || null) !== person.designation_id
    || jobType !== person.job_type || allowedCheckIn !== origAllowedCheckIn
    || attendanceExcluded !== person.attendance_excluded
  const teamsChanged = pickedTeamIds !== null && !sameTeams(pickedTeamIds, currentTeamIds)

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
              {teamsLoading
                ? <div className="h-11 animate-pulse rounded-md border border-border-default bg-surface-inset" />
                : <TeamPicker teams={teamOptions} value={teamIds} onChange={setPickedTeamIds} />}
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
                <p className="font-mono text-[10px] text-text-4 mt-0.5">Exempt (e.g. CEO/COO), no check-in, hidden from attendance lists & reports.</p>
              </div>
              <Toggle checked={attendanceExcluded} onChange={setAttendanceExcluded} />
            </div>
          </section>
        ) : (
          <p className="font-ui text-[12.5px] text-text-3 flex items-center gap-2"><ShieldAlert size={14} className="text-text-4" /> You don't have permission to change this user's role.</p>
        )}

        {canManagePeople && <SalaryCard profileId={person.id} context="admin" />}
      </div>
    </Drawer>
  )
}
