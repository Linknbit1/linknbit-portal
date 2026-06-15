import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { RoleBadge } from '../shared/RoleBadge'
import { useToast } from '../ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useSaveProfile } from '../../hooks/useProfile'
import { toUserRole } from '../../lib/peopleAccess'

interface ProfileDialogProps {
  // Mounted only while open (parent renders conditionally), so initial state is
  // derived from the current profile without a reset effect.
  onClose: () => void
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

export function ProfileDialog({ onClose }: ProfileDialogProps) {
  const toast = useToast()
  const { profile, refreshProfile } = useAuthContext()
  const { mutateAsync: save, isPending } = useSaveProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile?.name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Revoke object URLs to avoid leaking blobs.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!profile) return null

  const dirty = name.trim() !== profile.name || avatarFile !== null
  const canSave = dirty && name.trim().length > 0 && !isPending

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file', 'error')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast('Image must be under 2 MB', 'error')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!canSave) return
    try {
      await save({ userId: profile.id, name: name.trim(), avatarFile })
      await refreshProfile()
      toast('Profile updated', 'success')
      onClose()
    } catch {
      toast('Could not update profile', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isPending ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="relative w-full max-w-md bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display font-bold text-[16px] text-text-1">My Profile</h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group rounded-full"
              aria-label="Change avatar"
            >
              <Avatar name={name || profile.name} src={preview ?? profile.avatar_url ?? undefined} size="xl" />
              <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={16} className="text-white" />
              </span>
            </button>
            <div>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera size={13} /> Change photo
              </Button>
              <p className="font-mono text-[10.5px] text-text-4 mt-1.5">PNG or JPG, up to 2 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>

          <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

          {/* Read-only identity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="font-ui text-[12.5px] text-text-3">Email</span>
              <span className="font-mono text-[12px] text-text-2">{profile.email}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="font-ui text-[12.5px] text-text-3">Role</span>
              <RoleBadge role={toUserRole(profile.role)} size="sm" />
            </div>
          </div>
        </div>

        <div className={cn('flex justify-end gap-2 px-5 py-4 border-t border-border-subtle')}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving</> : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
