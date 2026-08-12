import { useState } from 'react'
import { Phone, Mail, MessageSquare, Video, FileText, StickyNote, type LucideIcon } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { useBd } from '../../context/BdPrototypeContext'
import { cn } from '../../lib/cn'
import type { Lead, BdActivityType, BdActivityOutcome } from '../../types'

/** `stage_change` is written by the system, never chosen here. */
const TYPES: { value: BdActivityType; label: string; icon: LucideIcon }[] = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'proposal', label: 'Proposal', icon: FileText },
  { value: 'note', label: 'Note', icon: StickyNote },
]

const OUTCOMES: { value: BdActivityOutcome; label: string }[] = [
  { value: 'connected', label: 'Connected' },
  { value: 'no_response', label: 'No response' },
  { value: 'follow_up', label: 'Follow-up needed' },
  { value: 'meeting_booked', label: 'Meeting booked' },
  { value: 'not_interested', label: 'Not interested' },
]

interface LogActivityModalProps {
  open: boolean
  lead: Lead | null
  onClose: () => void
}

export function LogActivityModal({ open, lead, onClose }: LogActivityModalProps) {
  const toast = useToast()
  const { logActivity, viewerRepId, viewerName } = useBd()
  const [type, setType] = useState<BdActivityType>('call')
  const [outcome, setOutcome] = useState<BdActivityOutcome>('connected')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [touched, setTouched] = useState(false)

  if (!lead) return null

  const noteError = touched && !note.trim() ? 'Write what happened — this is what gets reported on' : undefined

  const submit = () => {
    setTouched(true)
    if (!note.trim()) return
    logActivity({
      leadId: lead.id,
      type,
      at: new Date(`${date}T12:00:00`).toISOString(),
      outcome,
      note: note.trim(),
      byId: viewerRepId,
      byName: viewerName,
    })
    toast('Activity logged', 'success')
    setNote('')
    setTouched(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Log activity — ${lead.company}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>Log it</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Type is a 6-way choice with icons — a segmented row beats a dropdown. */}
        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">What happened?</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {TYPES.map((t) => {
              const Icon = t.icon
              const active = type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 transition-colors duration-150',
                    active
                      ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                  )}
                >
                  <Icon size={15} />
                  <span className="font-ui text-[11px]">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Outcome" value={outcome} onChange={(v) => setOutcome(v as BdActivityOutcome)} options={OUTCOMES} />
          <div>
            <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">When</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>

        <div>
          <label htmlFor="activity-note" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Notes
          </label>
          <textarea
            id="activity-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Walked through the automation scope. Pricing accepted in principle…"
            className={cn(
              'w-full resize-y rounded-md border bg-surface-inset px-3 py-2.5 font-ui text-[13px] text-text-1',
              'placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
              noteError ? 'border-error' : 'border-border-default',
            )}
          />
          {noteError && <p className="mt-1 font-ui text-[11.5px] text-error">{noteError}</p>}
        </div>
      </div>
    </Modal>
  )
}
