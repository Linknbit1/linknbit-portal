import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER, BD_PROJECT_COLUMNS } from '../../constants/bd'
import { FormField } from './FormField'
import { useBd } from '../../context/BdContext'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import { PROJECT_STATUS_LABELS } from '../../lib/utils'
import type { BdProject, BdChannel, ProjectStatus } from '../../types'

interface BdProjectFormModalProps {
  open: boolean
  /** Null creates a new project. */
  project: BdProject | null
  onClose: () => void
}

export function BdProjectFormModal({ open, project, onClose }: BdProjectFormModalProps) {
  const toast = useToast()
  const { saveProject, viewerRepId, viewerName, people } = useBd()

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [ownerId, setOwnerId] = useState(project?.ownerId ?? viewerRepId)
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'in_progress')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [channels, setChannels] = useState<BdChannel[]>(project?.channels ?? [])
  const [memberIds, setMemberIds] = useState<string[]>(project?.members.map((m) => m.id) ?? [viewerRepId])
  const [touched, setTouched] = useState(false)

  const nameError = touched && !name.trim() ? 'Give the project a name' : undefined

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const submit = () => {
    setTouched(true)
    if (!name.trim()) return
    const owner = people.find((p) => p.id === ownerId)
    saveProject({
      id: project?.id ?? randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      ownerId,
      ownerName: owner?.name ?? viewerName,
      status,
      // Derived from the campaign's tasks on read; the value sent here is ignored.
      progress: 0,
      deadline: deadline || null,
      channels,
      members: people.filter((p) => memberIds.includes(p.id)).map((p) => ({ id: p.id, name: p.name })),
      taskCount: project?.taskCount ?? 0,
    })
    toast(project ? `${name.trim()} updated` : `${name.trim()} created`, 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={project ? `Edit ${project.name}` : 'New project'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{project ? 'Save changes' : 'Create project'}</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Input
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
          placeholder="Logistics Outbound Campaign"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <label htmlFor="bd-project-description" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Description <span className="text-text-4">- optional</span>
          </label>
          <textarea
            id="bd-project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What this campaign is targeting, and how…"
            className={cn(
              'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
              'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
            )}
          />
        </div>

        <FormField label="Owner">
          <Select
            value={ownerId}
            onChange={setOwnerId}
            options={people.map((p) => ({ value: p.id, label: p.name }))}
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus)}
            options={BD_PROJECT_COLUMNS.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
          />
        </FormField>

        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Deadline</p>
          <DatePicker value={deadline} onChange={setDeadline} placeholder="No deadline" />
        </div>
        {/* No progress field: a campaign's progress is its tasks' completion, so
            typing a number here would be a control that quietly does nothing. */}

        <div className="sm:col-span-2">
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Channels</p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_ORDER.map((channel) => {
              const config = CHANNEL_CONFIG[channel]
              const Icon = config.icon
              const active = channels.includes(channel)
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setChannels((c) => toggle(c, channel))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-ui text-[12px] transition-colors duration-150',
                    active
                      ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                  )}
                >
                  <Icon size={12} className={active ? config.tint : undefined} />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Team</p>
          <div className="flex flex-wrap gap-1.5">
            {people.map((rep) => {
              const active = memberIds.includes(rep.id)
              return (
                <button
                  key={rep.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMemberIds((m) => toggle(m, rep.id))}
                  className={cn(
                    'rounded-sm border px-2.5 py-1.5 font-ui text-[12px] transition-colors duration-150',
                    active
                      ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                  )}
                >
                  {rep.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
