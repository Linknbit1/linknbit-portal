import { useRef, useState, type KeyboardEvent } from 'react'
import { Camera, Loader2, X, Lock, Check } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { RoleBadge } from '../components/shared/RoleBadge'
import { useToast } from '../components/ui/toast-context'
import { useAuthContext } from '../context/AuthContext'
import { useSaveProfile, useUpdatePassword } from '../hooks/useProfile'
import { toUserRole } from '../lib/peopleAccess'
import { cn } from '../lib/cn'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

// ── Chip (tag) input for skills / tech stacks ──────────────────────────────────────
function ChipInput({ label, values, onChange, placeholder }: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    else if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 bg-surface-inset border border-border-default rounded-md px-2.5 py-2 focus-within:border-border-focus">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-xs px-2 py-0.5 text-[12px] font-ui text-text-1">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-text-4 hover:text-error" aria-label={`Remove ${v}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={values.length ? '' : placeholder}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[13px] font-ui text-text-1 placeholder:text-text-4 py-0.5"
        />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const toast = useToast()
  const { profile, refreshProfile } = useAuthContext()
  const { mutateAsync: save, isPending: saving } = useSaveProfile()
  const { mutateAsync: changePassword, isPending: changingPw } = useUpdatePassword()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Personal details form — initialised from the current profile (page remounts on nav).
  const [name, setName] = useState(profile?.name ?? '')
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '')
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? [])
  const [techStacks, setTechStacks] = useState<string[]>(profile?.tech_stacks ?? [])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Password form
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  if (!profile) return null

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); return }
    if (file.size > MAX_AVATAR_BYTES) { toast('Image must be under 2 MB', 'error'); return }
    if (preview) URL.revokeObjectURL(preview)
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const ageNum = age.trim() ? Number(age) : null
  const ageValid = ageNum === null || (Number.isInteger(ageNum) && ageNum >= 14 && ageNum <= 120)

  const handleSave = async () => {
    if (!name.trim()) { toast('Name is required', 'error'); return }
    if (!ageValid) { toast('Enter a valid age (14–120)', 'error'); return }
    try {
      await save({
        userId: profile.id,
        name: name.trim(),
        avatarFile,
        bio: bio.trim() || null,
        age: ageNum,
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        location: location.trim() || null,
        skills,
        techStacks,
      })
      await refreshProfile()
      setAvatarFile(null)
      if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
      toast('Profile updated', 'success')
    } catch {
      toast('Could not update profile', 'error')
    }
  }

  const handleChangePassword = async () => {
    if (pw.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    if (pw !== pwConfirm) { toast('Passwords do not match', 'error'); return }
    try {
      await changePassword(pw)
      setPw(''); setPwConfirm('')
      toast('Password updated', 'success')
    } catch {
      toast('Could not update password', 'error')
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Profile" />

      <div className="px-4 py-6 lg:p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
        {/* Identity header */}
        <div className="bg-surface-1 border border-border-default rounded-xl p-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group rounded-full flex-shrink-0"
            aria-label="Change avatar"
          >
            <Avatar name={name || profile.name} src={preview ?? profile.avatar_url ?? undefined} size="xl" />
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={18} className="text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="font-display font-bold text-[18px] text-text-1 truncate">{profile.name}</p>
            <p className="font-mono text-[12px] text-text-3 truncate">{profile.email}</p>
            <div className="mt-1.5"><RoleBadge role={toUserRole(profile.role)} size="sm" /></div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        </div>

        {/* Personal details */}
        <section className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-4">
          <h2 className="font-display font-bold text-[15px] text-text-1">Personal details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <Input label="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Frontend Engineer" />
            <Input label="Age" type="number" min={14} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="—" error={ageValid ? undefined : 'Enter 14–120'} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 …" />
            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="sm:col-span-2" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A short intro about yourself…"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-3 outline-none focus:border-border-focus resize-y"
            />
          </div>

          <ChipInput label="Skills" values={skills} onChange={setSkills} placeholder="Type a skill, press Enter" />
          <ChipInput label="Tech stacks" values={techStacks} onChange={setTechStacks} placeholder="Type a stack, press Enter" />

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving</> : <><Check size={14} /> Save changes</>}
            </Button>
          </div>
        </section>

        {/* Password */}
        <section className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-4">
          <h2 className="font-display font-bold text-[15px] text-text-1 flex items-center gap-2"><Lock size={15} className="text-text-3" /> Change password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
            <Input label="Confirm password" type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Re-enter password"
              error={pwConfirm && pw !== pwConfirm ? 'Does not match' : undefined} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={handleChangePassword} disabled={changingPw || !pw || !pwConfirm}
              className={cn(pw && pwConfirm && pw === pwConfirm ? '' : 'opacity-90')}>
              {changingPw ? <><Loader2 size={13} className="animate-spin" /> Updating</> : 'Update password'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
