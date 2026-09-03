import { useState } from 'react'
import { Drawer } from '../ui/Drawer'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import { TimePicker } from '../ui/TimePicker'
import { useToast } from '../ui/toast-context'
import { isInternalRole } from '../../lib/roles'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { usePeople } from '../../hooks/usePeople'
import {
  useLeaveTypes, useEnterLeaveForEmployee, useGrantWfh,
  useEnterExceptionForEmployee, useEnterOvertimeForEmployee,
} from '../../hooks/useAttendance'
import { DAY_PART_LABEL } from '../../lib/dayParts'
import { cn } from '../../lib/cn'

type Kind = 'leave' | 'wfh' | 'exception' | 'overtime'

// "WFH" rather than "Work from home": the four tabs share the width equally, so
// the longest label sets how small the others may be — and WFH is what the queue
// itself calls it everywhere else.
const KIND_TABS: { id: Kind; label: string }[] = [
  { id: 'leave', label: 'Leave' },
  { id: 'wfh', label: 'WFH' },
  { id: 'exception', label: 'Exception' },
  { id: 'overtime', label: 'Overtime' },
]

type ExceptionType = 'late_arrival' | 'early_departure' | 'out_of_office'

// Labels stay neutral of tense. An exception is filed in advance as often as it
// is recorded afterwards, so "Arrived at" is wrong half the time and "Will
// arrive at" the other half; the noun is right in both.
const EXCEPTION_TYPES: { value: ExceptionType; label: string; timeLabel: string }[] = [
  { value: 'late_arrival', label: 'Late arrival', timeLabel: 'Arrival' },
  { value: 'early_departure', label: 'Early departure', timeLabel: 'Departure' },
  { value: 'out_of_office', label: 'Out of office', timeLabel: 'Departure' },
]

/** Whole hours to two decimals, so 17:30 → 19:00 reads as 1.5. */
function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.round(((eh * 60 + em - (sh * 60 + sm)) / 60) * 100) / 100
}

interface EnterRequestForEmployeeModalProps {
  onClose: () => void
}

/**
 * File any of the four request types for somebody else.
 *
 * Leave and WFH have always been here; exceptions and overtime were not, which
 * made "Add for someone else" mean it only half the time — an HR manager could
 * put someone on leave but not correct the day they were marked late.
 *
 * The two halves behave differently on purpose, and the banner says which one
 * is about to happen. Leave and WFH apply immediately when an admin enters them
 * and wait for approval when anybody else does. An exception rewrites a day
 * already on the record and overtime is a claim, so both always go through the
 * queue whoever files them.
 *
 * Either way the approver is somebody else: nobody decides on a request they
 * filed. The banner used to end "Approve it there to apply it", which read as an
 * instruction to the one person guaranteed not to be able to.
 */
export function EnterRequestForEmployeeModal({ onClose }: EnterRequestForEmployeeModalProps) {
  // Mounted by the parent on demand, so `open` starts true and the panel plays
  // its slide-out before `onExitComplete` unmounts it. Closing straight to
  // unmount is what made a backdrop press look like the panel had vanished
  // rather than been put away.
  const [open, setOpen] = useState(true)
  const close = () => setOpen(false)
  const isDesktop = useIsDesktop()
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: people = [] } = usePeople()
  const { data: leaveTypes = [] } = useLeaveTypes(true)
  const enterLeave = useEnterLeaveForEmployee()
  const grantWfh = useGrantWfh()
  const enterException = useEnterExceptionForEmployee()
  const enterOvertime = useEnterOvertimeForEmployee()

  const [kind, setKind] = useState<Kind>('leave')
  const [profileId, setProfileId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dayPart, setDayPart] = useState('full')
  const [reason, setReason] = useState('')
  // Exception + overtime are single-day, and both are about clock times.
  const [day, setDay] = useState('')
  const [exceptionType, setExceptionType] = useState<ExceptionType>('late_arrival')
  const [atTime, setAtTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const isRange = kind === 'leave' || kind === 'wfh'
  // Whether this entry skips the queue is a permission, not a role, and it
  // applies to all four kinds — an admin bypasses the queue everywhere.
  const appliesDirectly = useCanAccess('can_apply_attendance_directly')
  const pending =
    enterLeave.isPending || grantWfh.isPending || enterException.isPending || enterOvertime.isPending

  const peopleOptions = people
    .filter((p) => p.is_active && isInternalRole(p.role))
    .map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))

  const timeLabel = EXCEPTION_TYPES.find((t) => t.value === exceptionType)?.timeLabel ?? 'At'
  const overtimeHours = day && atTime && endTime ? hoursBetween(atTime, endTime) : 0

  const done = () => {
    toast(appliesDirectly ? 'Applied' : 'Submitted for approval', 'success')
    close()
  }
  const failed = (e: unknown) =>
    toast(e instanceof Error ? e.message : 'Could not save that', 'error')

  const submit = () => {
    if (!profileId) { toast('Choose who this is for', 'error'); return }
    if (reason.trim().length < 3) { toast('Say why, briefly', 'error'); return }

    if (isRange) {
      if (!startDate || !endDate) { toast('Choose the dates', 'error'); return }
      if (endDate < startDate) { toast('The end date is before the start', 'error'); return }
      if (dayPart !== 'full' && startDate !== endDate) {
        toast('A half day has to be a single day', 'error'); return
      }
      if (kind === 'leave' && !leaveTypeId) { toast('Choose a leave type', 'error'); return }

      if (kind === 'leave') {
        enterLeave.mutate(
          {
            payload: {
              profile_id: profileId,
              leave_type_id: leaveTypeId,
              start_date: startDate,
              end_date: endDate,
              day_part: dayPart as 'full' | 'first_half' | 'second_half',
              reason: reason.trim(),
            },
            appliesDirectly,
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
            appliesDirectly,
          },
          { onSuccess: done, onError: failed },
        )
      }
      return
    }

    if (!day) { toast('Choose the day', 'error'); return }

    if (kind === 'exception') {
      if (!atTime) { toast(`Say what time they ${timeLabel.toLowerCase()}`, 'error'); return }
      if (exceptionType === 'out_of_office' && !returnTime) {
        toast('Say when they came back', 'error'); return
      }
      enterException.mutate(
        {
          profileId,
          payload: {
            exception_type: exceptionType,
            date: day,
            requested_time: atTime,
            return_time: exceptionType === 'out_of_office' ? returnTime : undefined,
            reason: reason.trim(),
          },
          appliesDirectly,
        },
        { onSuccess: done, onError: failed },
      )
      return
    }

    if (!atTime || !endTime) { toast('Choose the hours worked', 'error'); return }
    if (overtimeHours <= 0) { toast('The end time is before the start', 'error'); return }
    enterOvertime.mutate(
      {
        profileId,
        payload: {
          date: day,
          start_time: atTime,
          end_time: endTime,
          hours: overtimeHours,
          reason: reason.trim(),
        },
        appliesDirectly,
      },
      { onSuccess: done, onError: failed },
    )
  }

  const label = 'text-label font-ui font-semibold uppercase tracking-wider text-text-2'

  return (
    <Drawer
      open={open}
      onClose={close}
      onExitComplete={onClose}
      side={isDesktop ? 'right' : 'bottom'}
      width={460}
      busy={pending}
      title={<h2 className="font-display font-bold text-[16px] text-text-1">Add for someone else</h2>}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={close} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={submit} loading={pending}>
            {appliesDirectly ? 'Apply' : 'Submit for approval'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="rounded-sm border border-border-default bg-surface-2 px-3 py-2 font-ui text-[12px] text-text-3">
          {appliesDirectly
            ? 'This applies straight away and updates their record. You are allowed to enter attendance without approval.'
            : 'This waits for approval and changes nothing until it is given. Not by you: nobody decides on a request they filed, so it goes to another approver.'}
        </p>

        {/* Four equal columns rather than a wrapping row: the tabs are the
            panel's top-level choice, and a strip that fills the width reads as
            one control instead of four buttons that happened to fit. */}
        <div className="grid grid-cols-4 gap-1 rounded-sm border border-border-default bg-surface-1 p-1">
          {KIND_TABS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                'flex h-8 items-center justify-center truncate rounded-sm px-1 text-center font-ui text-[12.5px] font-medium transition-colors',
                kind === k.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className={label}>Who</label>
          <Select value={profileId} onChange={setProfileId} options={peopleOptions} placeholder="Choose a person" />
        </div>

        {kind === 'leave' && (
          <div className="space-y-1.5">
            <label className={label}>Leave type</label>
            <Select
              value={leaveTypeId}
              onChange={setLeaveTypeId}
              options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Choose a type"
            />
          </div>
        )}

        {kind === 'exception' && (
          <div className="space-y-1.5">
            <label className={label}>What happened</label>
            <Select
              value={exceptionType}
              onChange={(v) => {
                const match = EXCEPTION_TYPES.find((t) => t.value === v)
                if (match) setExceptionType(match.value)
              }}
              options={EXCEPTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
        )}

        {isRange ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={label}>From</label>
                <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (!endDate) setEndDate(v) }} />
              </div>
              <div className="space-y-1.5">
                <label className={label}>To</label>
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={label}>Part of day</label>
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
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className={label}>Day</label>
              <DatePicker value={day} onChange={setDay} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={label}>{kind === 'overtime' ? 'Started at' : timeLabel}</label>
                <TimePicker value={atTime} onChange={setAtTime} step={5} />
              </div>
              {kind === 'overtime' ? (
                <div className="space-y-1.5">
                  <label className={label}>Finished at</label>
                  <TimePicker value={endTime} onChange={setEndTime} step={5} />
                </div>
              ) : exceptionType === 'out_of_office' ? (
                <div className="space-y-1.5">
                  <label className={label}>Return</label>
                  <TimePicker value={returnTime} onChange={setReturnTime} step={5} />
                </div>
              ) : null}
            </div>

            {kind === 'overtime' && overtimeHours > 0 && (
              <p className="font-mono text-[11.5px] text-text-3">
                {overtimeHours} hour{overtimeHours === 1 ? '' : 's'} claimed.
              </p>
            )}
          </>
        )}

        <div className="space-y-1.5">
          <label className={label}>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why this is being entered for them."
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
          />
        </div>
      </div>
    </Drawer>
  )
}
