import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import { useToast } from '../ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { usePeople } from '../../hooks/usePeople'
import { useLeaveTypes, useEnterLeaveForEmployee, useGrantWfh } from '../../hooks/useAttendance'
import { DAY_PART_LABEL } from '../../lib/dayParts'

type Kind = 'leave' | 'wfh'

interface EnterRequestForEmployeeModalProps {
  onClose: () => void
}

/**
 * File leave or WFH for somebody else.
 *
 * This existed before the sidebar was reorganised and lost its way in. The
 * server side never went anywhere, including the rule that matters: an admin's
 * entry applies immediately, HR's waits for an admin to approve it. The banner
 * says which of the two is about to happen, because "saved" meaning two
 * different things without saying so is how people stop trusting a screen.
 */
export function EnterRequestForEmployeeModal({ onClose }: EnterRequestForEmployeeModalProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: people = [] } = usePeople()
  const { data: leaveTypes = [] } = useLeaveTypes(true)
  const enterLeave = useEnterLeaveForEmployee()
  const grantWfh = useGrantWfh()

  const [kind, setKind] = useState<Kind>('leave')
  const [profileId, setProfileId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dayPart, setDayPart] = useState('full')
  const [reason, setReason] = useState('')

  const appliesDirectly = profile?.role === 'admin' || profile?.role === 'super_admin'
  const pending = enterLeave.isPending || grantWfh.isPending

  const peopleOptions = people
    .filter((p) => p.is_active && p.role !== 'client_owner' && p.role !== 'client_member')
    .map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))

  const submit = () => {
    if (!profileId) { toast('Choose who this is for', 'error'); return }
    if (!startDate || !endDate) { toast('Choose the dates', 'error'); return }
    if (endDate < startDate) { toast('The end date is before the start', 'error'); return }
    if (dayPart !== 'full' && startDate !== endDate) {
      toast('A half day has to be a single day', 'error'); return
    }
    if (reason.trim().length < 3) { toast('Say why, briefly', 'error'); return }
    if (kind === 'leave' && !leaveTypeId) { toast('Choose a leave type', 'error'); return }

    const done = () => {
      toast(appliesDirectly ? 'Applied' : 'Submitted for an admin to approve', 'success')
      onClose()
    }
    const failed = (e: unknown) =>
      toast(e instanceof Error ? e.message : 'Could not save that', 'error')

    if (kind === 'leave') {
      enterLeave.mutate(
        {
          profile_id: profileId,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          day_part: dayPart as 'full' | 'first_half' | 'second_half',
          reason: reason.trim(),
        },
        { onSuccess: done, onError: failed },
      )
    } else {
      grantWfh.mutate(
        {
          payload: {
            profile_id: profileId,
            start_date: startDate,
            end_date: endDate,
            day_part: dayPart as 'full' | 'first_half' | 'second_half',
            reason: reason.trim(),
          },
          grantedBy: profile?.id ?? '',
        },
        { onSuccess: done, onError: failed },
      )
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add for someone else"
      size="md"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={submit} loading={pending}>
            {appliesDirectly ? 'Apply' : 'Submit for approval'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="rounded-sm border border-border-default bg-surface-2 px-3 py-2 font-ui text-[12px] text-text-3">
          {appliesDirectly
            ? 'This applies straight away and updates their attendance for those days.'
            : 'This is submitted for an admin to approve. It does not affect their attendance until they do.'}
        </p>

        <div className="flex gap-1 rounded-sm border border-border-default bg-surface-1 p-1 w-fit">
          {(['leave', 'wfh'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`h-8 rounded-sm px-3 font-ui text-[12.5px] font-medium transition-colors ${
                kind === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1'
              }`}
            >
              {k === 'leave' ? 'Leave' : 'Work from home'}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Who</label>
          <Select value={profileId} onChange={setProfileId} options={peopleOptions} placeholder="Choose a person" />
        </div>

        {kind === 'leave' && (
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Leave type</label>
            <Select
              value={leaveTypeId}
              onChange={setLeaveTypeId}
              options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Choose a type"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">From</label>
            <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (!endDate) setEndDate(v) }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">To</label>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Part of day</label>
          <Select
            value={dayPart}
            onChange={setDayPart}
            options={[
              { value: 'full', label: 'Full day' },
              { value: 'first_half', label: DAY_PART_LABEL.first_half },
              { value: 'second_half', label: DAY_PART_LABEL.second_half },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why this is being entered for them."
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
          />
        </div>
      </div>
    </Modal>
  )
}
