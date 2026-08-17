import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdContext'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import type { BdChannel, BdDailyUpdate } from '../../types'

interface DailyUpdateModalProps {
  open: boolean
  /** Editing an already-submitted update, or null to write today's. */
  update: BdDailyUpdate | null
  onClose: () => void
}

export function DailyUpdateModal({ open, update, onClose }: DailyUpdateModalProps) {
  const toast = useToast()
  const { saveUpdate, viewerRepId, viewerName } = useBd()

  const [platforms, setPlatforms] = useState<BdChannel[]>(update?.platforms ?? [])
  const [summary, setSummary] = useState(update?.summary ?? '')
  const [proposals, setProposals] = useState(update?.proposalsSent ?? 0)
  const [calls, setCalls] = useState(update?.callsMade ?? 0)
  const [meetings, setMeetings] = useState(update?.meetingsHeld ?? 0)
  const [leadsAdded, setLeadsAdded] = useState(update?.leadsAdded ?? 0)
  const [touched, setTouched] = useState(false)

  const summaryError = touched && !summary.trim() ? 'A one-line recap is the whole point of the check-in' : undefined

  const toggle = (channel: BdChannel) =>
    setPlatforms((p) => (p.includes(channel) ? p.filter((c) => c !== channel) : [...p, channel]))

  const submit = () => {
    setTouched(true)
    if (!summary.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    saveUpdate({
      id: update?.id ?? randomUUID(),
      repId: update?.repId ?? viewerRepId,
      repName: update?.repName ?? viewerName,
      date: update?.date ?? today,
      submittedAt: new Date().toISOString(),
      platforms,
      summary: summary.trim(),
      proposalsSent: proposals,
      callsMade: calls,
      meetingsHeld: meetings,
      leadsAdded,
    })
    toast(update?.submittedAt ? 'Update edited' : 'Checked in for today', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={update?.submittedAt ? 'Edit your update' : "Today's check-in"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{update?.submittedAt ? 'Save' : 'Submit'}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Platforms worked on</p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_ORDER.map((channel) => {
              const config = CHANNEL_CONFIG[channel]
              const Icon = config.icon
              const active = platforms.includes(channel)
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(channel)}
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

        <div>
          <label htmlFor="update-summary" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            What did you do today?
          </label>
          <textarea
            id="update-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="Twelve Upwork proposals out, mostly healthcare and legal. Two replies already…"
            className={cn(
              'w-full resize-y rounded-md border bg-surface-inset px-3 py-2.5 font-ui text-[13px] text-text-1',
              'placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
              summaryError ? 'border-error' : 'border-border-default',
            )}
          />
          {summaryError && <p className="mt-1 font-ui text-[11.5px] text-error">{summaryError}</p>}
        </div>

        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">
            Key numbers <span className="text-text-4">— leave at zero if not applicable</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="Proposals" type="number" min={0} value={proposals} onChange={(e) => setProposals(Number(e.target.value) || 0)} />
            <Input label="Calls" type="number" min={0} value={calls} onChange={(e) => setCalls(Number(e.target.value) || 0)} />
            <Input label="Meetings" type="number" min={0} value={meetings} onChange={(e) => setMeetings(Number(e.target.value) || 0)} />
            <Input label="Leads added" type="number" min={0} value={leadsAdded} onChange={(e) => setLeadsAdded(Number(e.target.value) || 0)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
