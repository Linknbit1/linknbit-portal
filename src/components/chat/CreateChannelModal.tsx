import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Toggle } from '../ui/Toggle'
import { MultiSelectPeople } from '../ui/MultiSelectPeople'
import { RolePicker } from './RolePicker'
import { Select } from '../ui/Select'
import { useChannelCategories, useCreateChannelCategory, useSetChannelCategory } from '../../hooks/useChannelCategories'
import { useToast } from '../ui/toast-context'
import { useCreateChannel } from '../../hooks/useChannels'
import { usePeople } from '../../hooks/usePeople'
import { useAuthContext } from '../../context/AuthContext'

interface CreateChannelModalProps {
  open: boolean
  onClose: () => void
  onCreated: (channelId: string) => void
}

/** Sentinel for "create a heading that doesn't exist yet", inline. */
const NEW_CATEGORY = '__new__'

export function CreateChannelModal({ open, onClose, onCreated }: CreateChannelModalProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: people = [] } = usePeople()
  const { mutate: createChannel, isPending } = useCreateChannel()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const { data: categories = [] } = useChannelCategories()
  const createCategory = useCreateChannelCategory()
  const setChannelCategory = useSetChannelCategory()
  const [categoryId, setCategoryId] = useState('')
  // Typing a heading that doesn't exist yet shouldn't mean leaving the modal.
  const [newCategory, setNewCategory] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const reset = () => {
    setName(''); setDescription(''); setMemberIds([]); setRoles([]); setIsPrivate(false)
    setCategoryId(''); setNewCategory('')
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast('Give the channel a name', 'error'); return }
    createChannel(
      { name: trimmed, description: description.trim() || null, memberIds, roles, isPrivate },
      {
        onSuccess: async (channel) => {
          // The channel has to exist before it can be filed under a heading.
          try {
            let target = categoryId === NEW_CATEGORY ? '' : categoryId
            if (categoryId === NEW_CATEGORY && newCategory.trim()) {
              target = (await createCategory.mutateAsync(newCategory)).id
            }
            if (target) {
              await setChannelCategory.mutateAsync({ channelId: channel.id, categoryId: target })
            }
          } catch {
            // The channel is real either way; say so rather than looking failed.
            toast(`#${trimmed} created, but it could not be filed under that category`, 'error')
          }
          toast(`#${trimmed} created`, 'success')
          reset()
          onCreated(channel.id)
        },
        onError: () => toast('Could not create the channel', 'error'),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="New channel"
      busy={isPending}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={submit} loading={isPending}>Create channel</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="channel-name" className="font-mono text-[11px] uppercase tracking-wider text-text-4">Name</label>
          <Input
            id="channel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="development"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="channel-desc" className="font-mono text-[11px] uppercase tracking-wider text-text-4">Description</label>
          <Input
            id="channel-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this channel is for (optional)"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Category</span>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: '', label: 'Uncategorised' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
              { value: NEW_CATEGORY, label: '+ New category…' },
            ]}
          />
          {categoryId === NEW_CATEGORY && (
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name (e.g. Design)"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Add by role</span>
          <RolePicker value={roles} onChange={setRoles} disabled={isPending} />
          <p className="font-ui text-[11.5px] text-text-4">
            Everyone with a selected role joins now, and anyone who takes that role later is added automatically.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Add people</span>
          <MultiSelectPeople
            value={memberIds}
            onChange={setMemberIds}
            options={people.filter((p) => p.id !== profile?.id).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
            placeholder="Add people"
          />
          <p className="font-ui text-[11.5px] text-text-4">You'll be added as the channel owner.</p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border-default bg-surface-2/40 p-3">
          <Toggle checked={isPrivate} onChange={setIsPrivate} disabled={isPending} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-ui text-[13px] font-medium text-text-1">
              <Lock size={12} className="text-text-3" /> Private channel
            </p>
            <p className="mt-0.5 font-ui text-[11.5px] text-text-4">
              Only people who can manage channels may add members. Channels are always invisible to
              non-members. This stops anyone else from inviting people in.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
