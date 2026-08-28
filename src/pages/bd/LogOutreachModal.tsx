import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { FormField } from './FormField'
import { useBd } from '../../context/BdContext'
import { cn } from '../../lib/cn'
import type { BdChannel } from '../../types'

interface LogOutreachModalProps {
  open: boolean
  /** Pre-selected channel when opened from a specific channel card. */
  channel?: BdChannel
  onClose: () => void
}

/**
 * Log a batch of outreach against a channel.
 *
 * Deliberately not the same form as the per-lead activity log. Most outreach
 * never becomes a lead — twenty Upwork proposals are twenty units of effort and
 * maybe one lead — so this counts effort in bulk against a channel, and the
 * lead-level log stays for the touchpoints that belong to a named prospect.
 */
export function LogOutreachModal({ open, channel: initialChannel, onClose }: LogOutreachModalProps) {
  const toast = useToast()
  const { logBatch, viewerRepId, viewerName, canSeeAll, people } = useBd()

  const [channel, setChannel] = useState<BdChannel>(initialChannel ?? 'upwork')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [repId, setRepId] = useState(viewerRepId)
  const [volume, setVolume] = useState(0)
  const [responses, setResponses] = useState(0)
  const [meetings, setMeetings] = useState(0)
  const [leads, setLeads] = useState(0)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const config = CHANNEL_CONFIG[channel]
  const passive = !!config.passive
  const volumeError = touched && volume <= 0 ? `${config.volumeLabel} must be more than zero` : undefined
  // Replies cannot exceed sends; on a passive channel the enquiry *is* the reply.
  const responseError =
    touched && !passive && responses > volume ? 'More replies than messages sent' : undefined

  const submit = () => {
    setTouched(true)
    if (volume <= 0) return
    if (!passive && responses > volume) return
    const rep = people.find((p) => p.id === repId)
    logBatch({
      channel,
      at: new Date(`${date}T12:00:00`).toISOString(),
      // A passive channel is not sent on — the enquiry itself is the reply.
      volume,
      responses: passive ? volume : responses,
      meetingsBooked: meetings,
      leadsCreated: leads,
      note: note.trim(),
      byId: repId,
      byName: rep?.name ?? viewerName,
    })
    toast(`${volume} logged against ${config.label}`, 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Log outreach"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>Log outreach</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Channel first — it relabels the count field below, so it has to be
            chosen before the numbers make sense. */}
        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Channel</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {CHANNEL_ORDER.map((c) => {
              const cfg = CHANNEL_CONFIG[c]
              const Icon = cfg.icon
              const active = channel === c
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setChannel(c)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 transition-colors duration-150',
                    active
                      ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                  )}
                >
                  <Icon size={15} className={active ? cfg.tint : undefined} />
                  <span className="font-ui text-[11px]">{cfg.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Date</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <FormField label="Logged by">
            <Select
              value={repId}
              onChange={setRepId}
              options={
              canSeeAll
              ? people.map((p) => ({ value: p.id, label: p.name }))
              : [{ value: viewerRepId, label: `${viewerName} (you)` }]
              }
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-4">
          <Input
            label={config.volumeLabel}
            type="number"
            min={0}
            value={volume || ''}
            onChange={(e) => setVolume(Number(e.target.value) || 0)}
            error={volumeError}
            className={volumeError ? 'col-span-2 sm:col-span-4' : undefined}
          />
          {/* A passive channel has no send to reply to — the enquiry is the reply. */}
          {!passive && (
            <Input
              label="Replies"
              type="number"
              min={0}
              value={responses || ''}
              onChange={(e) => setResponses(Number(e.target.value) || 0)}
              error={responseError}
            />
          )}
          <Input
            label="Meetings"
            type="number"
            min={0}
            value={meetings || ''}
            onChange={(e) => setMeetings(Number(e.target.value) || 0)}
          />
          <Input
            label="Leads"
            type="number"
            min={0}
            value={leads || ''}
            onChange={(e) => setLeads(Number(e.target.value) || 0)}
          />
        </div>

        <div>
          <label htmlFor="outreach-note" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Note <span className="text-text-4">- optional</span>
          </label>
          <textarea
            id="outreach-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Which list, which segment, anything worth remembering…"
            className={cn(
              'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
              'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
