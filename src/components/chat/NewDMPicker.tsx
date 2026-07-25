import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Input } from '../ui/Input'
import { useToast } from '../ui/toast-context'
import { useCreateDM } from '../../hooks/useChannels'
import { usePeople } from '../../hooks/usePeople'
import { useAuthContext } from '../../context/AuthContext'

interface NewDMPickerProps {
  open: boolean
  onClose: () => void
  onCreated: (channelId: string) => void
}

export function NewDMPicker({ open, onClose, onCreated }: NewDMPickerProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: people = [] } = usePeople()
  const { mutate: createDM, isPending } = useCreateDM()
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return people
      .filter((p) => p.id !== profile?.id && p.is_active)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [people, profile?.id, search])

  const start = (profileId: string) => {
    createDM(profileId, {
      onSuccess: (channelId) => { setSearch(''); onCreated(channelId) },
      onError: () => toast('Could not start that conversation', 'error'),
    })
  }

  return (
    <Modal open={open} onClose={() => { setSearch(''); onClose() }} title="New message" busy={isPending}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-1">
          {shown.length === 0 ? (
            <p className="font-ui text-[12.5px] text-text-4 text-center py-8">No one matches that search.</p>
          ) : (
            shown.map((p) => (
              <button
                key={p.id}
                onClick={() => start(p.id)}
                disabled={isPending}
                className="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 hover:bg-surface-2 disabled:opacity-50 transition-colors"
              >
                <Avatar name={p.name} src={p.avatar_url ?? undefined} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block font-ui text-[13px] text-text-1 truncate">{p.name}</span>
                  <span className="block font-mono text-[10.5px] text-text-4">{p.role.replace(/_/g, ' ')}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
