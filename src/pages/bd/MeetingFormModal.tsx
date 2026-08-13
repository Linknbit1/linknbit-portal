import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import { useToast } from '../../components/ui/toast-context'
import { FormField } from './FormField'
import { usePeople } from '../../hooks/usePeople'
import { useBd } from '../../context/BdPrototypeContext'
import { randomUUID } from '../../lib/uuid'
import { BD_REPS } from '../../data/bdMock'
import { cn } from '../../lib/cn'
import type { BdMeeting, MeetingType, MeetingPlatform } from '../../types'

const TYPES: { value: MeetingType; label: string }[] = [
  { value: 'discovery', label: 'Discovery call' },
  { value: 'proposal', label: 'Proposal walkthrough' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'other', label: 'Other' },
]

const PLATFORMS: { value: MeetingPlatform; label: string }[] = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'phone', label: 'Phone call' },
  { value: 'in_person', label: 'In person' },
]

const DURATIONS = [15, 30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))

interface MeetingFormModalProps {
  open: boolean
  meeting: BdMeeting | null
  onClose: () => void
}

export function MeetingFormModal({ open, meeting, onClose }: MeetingFormModalProps) {
  const toast = useToast()
  const { leads, saveMeeting, viewerRepId, viewerName } = useBd()
  const { data: people = [] } = usePeople()

  const [leadId, setLeadId] = useState(meeting?.leadId ?? leads[0]?.id ?? '')
  const [date, setDate] = useState(() => (meeting ? meeting.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10)))
  const [time, setTime] = useState(() =>
    meeting ? new Date(meeting.scheduledAt).toTimeString().slice(0, 5) : '15:00',
  )
  const [duration, setDuration] = useState(String(meeting?.durationMinutes ?? 30))
  const [type, setType] = useState<MeetingType>(meeting?.type ?? 'discovery')
  const [platform, setPlatform] = useState<MeetingPlatform>(meeting?.platform ?? 'zoom')
  const [hostId, setHostId] = useState(meeting?.hostId ?? viewerRepId)
  const [clientAttendees, setClientAttendees] = useState(meeting?.clientAttendees ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>((meeting?.internalAttendees ?? []).map((a) => a.id))
  const [outcome, setOutcome] = useState(meeting?.outcome ?? '')
  const [nextStep, setNextStep] = useState(meeting?.nextStep ?? '')
  const [touched, setTouched] = useState(false)

  const lead = leads.find((l) => l.id === leadId)
  const attendeesError = touched && !clientAttendees.trim() ? 'Who is joining from the client side?' : undefined

  const submit = () => {
    setTouched(true)
    if (!clientAttendees.trim() || !lead) return
    const host = BD_REPS.find((r) => r.id === hostId)
    saveMeeting({
      id: meeting?.id ?? randomUUID(),
      leadId: lead.id,
      company: lead.company,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      durationMinutes: Number(duration),
      type,
      hostId,
      hostName: host?.name ?? viewerName,
      internalAttendees: people
        .filter((p) => attendeeIds.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name })),
      clientAttendees: clientAttendees.trim(),
      platform,
      outcome: outcome.trim() || undefined,
      nextStep: nextStep.trim() || undefined,
    })
    toast(meeting ? 'Meeting updated' : `Meeting scheduled with ${lead.company}`, 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={meeting ? 'Edit meeting' : 'Schedule a meeting'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{meeting ? 'Save changes' : 'Schedule'}</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <FormField label="Lead">
          <Select
            value={leadId}
            onChange={setLeadId}
            className="sm:col-span-2"
            options={leads.map((l) => ({ value: l.id, label: l.company }))}
          />
        </FormField>

        <FormField label="Date">
          <DatePicker value={date} onChange={setDate} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Time">
            <TimePicker value={time} onChange={setTime} />
          </FormField>
          <FormField label="Duration">
              <Select value={duration} onChange={setDuration} options={DURATIONS} />
            </FormField>
        </div>

        <FormField label="Meeting type">
          <Select value={type} onChange={(v) => setType(v as MeetingType)} options={TYPES} />
        </FormField>
        <FormField label="Platform">
          <Select value={platform} onChange={(v) => setPlatform(v as MeetingPlatform)} options={PLATFORMS} />
        </FormField>

        <FormField label="Hosted by">
          <Select
            value={hostId}
            onChange={setHostId}
            options={BD_REPS.map((r) => ({ value: r.id, label: r.name }))}
          />
        </FormField>
        <FormField
          label="Invite colleagues"
          hint="— anyone in the portal"
          helper="They see it under Workspace → My Meetings"
        >
          <MultiSelectPeople
            value={attendeeIds}
            onChange={setAttendeeIds}
            options={people
              .filter((p) => p.is_active)
              .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
            placeholder="Nobody invited yet"
          />
        </FormField>

        <Input
          label="Client attendees"
          value={clientAttendees}
          onChange={(e) => setClientAttendees(e.target.value)}
          error={attendeesError}
          placeholder="Henrik Sølvberg (Operations Director)"
          className="sm:col-span-2"
        />

        {/* Outcome only makes sense once the meeting has happened, so it is
            offered but never required. */}
        <div className="sm:col-span-2">
          <label htmlFor="meeting-outcome" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Outcome <span className="text-text-4">— fill in after the meeting</span>
          </label>
          <textarea
            id="meeting-outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={3}
            placeholder="What was discussed and decided…"
            className={cn(
              'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
              'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
            )}
          />
        </div>

        <Input
          label="Next step"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Send revised SOW with the phased delivery option"
          className="sm:col-span-2"
        />
      </div>
    </Modal>
  )
}
