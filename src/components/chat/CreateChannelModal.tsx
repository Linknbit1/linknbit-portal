import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { MultiSelectPeople } from '../ui/MultiSelectPeople'
import { useToast } from '../ui/toast-context'
import { useCreateChannel } from '../../hooks/useChannels'
import { usePeople } from '../../hooks/usePeople'
import { useAuthContext } from '../../context/AuthContext'

interface CreateChannelModalProps {
  open: boolean
  onClose: () => void
  onCreated: (channelId: string) => void
}

export function CreateChannelModal({ open, onClose, onCreated }: CreateChannelModalProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: people = [] } = usePeople()
  const { mutate: createChannel, isPending } = useCreateChannel()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])

  const reset = () => { setName(''); setDescription(''); setMemberIds([]) }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast('Give the channel a name', 'error'); return }
    createChannel(
      { name: trimmed, description: description.trim() || null, memberIds },
      {
        onSuccess: (channel) => {
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
      <div className="flex flex-col gap-4">
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
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-4">Members</span>
          <MultiSelectPeople
            value={memberIds}
            onChange={setMemberIds}
            options={people.filter((p) => p.id !== profile?.id).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
            placeholder="Add people"
          />
          <p className="font-ui text-[11.5px] text-text-4">You'll be added as the channel owner.</p>
        </div>
      </div>
    </Modal>
  )
}
