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
  useSubmitLeave, useUpdateLeave, useSubmitWfh, useUpdateWfh,
  useRequestException, useUpdateException, useSubmitOvertime, useUpdateOvertime,
  useMyLeaveBalances, useLeaveBalancesByProfile,
} from '../../hooks/useAttendance'
import { DAY_PART_LABEL, toDayPart } from '../../lib/dayParts'
import { cn } from '../../lib/cn'
import type { AttendanceExceptionType, AttendanceRequestKind } from '../../types'

// "WFH" rather than "Work from home": the four tabs share the width equally, so
// the longest label sets how small the others may be — and WFH is what the queue
// itself calls it everywhere else.
const KIND_TABS: { id: AttendanceRequestKind; label: string }[] = [
  { id: 'leave', label: 'Leave' },
  { id: 'wfh', label: 'WFH' },
  { id: 'exception', label: 'Exception' },
  { id: 'overtime', label: 'Overtime' },
]

// Labels stay neutral of tense. An exception is filed in advance as often as it
// is recorded afterwards, so "Arrived at" is wrong half the time and "Will
// arrive at" the other half; the noun is right in both.
const EXCEPTION_TYPES: { value: AttendanceExceptionType; label: string; timeLabel: string }[] = [
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

/** Local calendar date (`en-CA` renders ISO), not UTC. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

/** Postgres returns `time` as HH:MM:SS; the pickers speak HH:MM. */
const toHHMM = (t: string | null | undefined): string => (t ? t.slice(0, 5) : '')

/**
 * An existing request, opened for editing. Display strings on the queue row are
 * derived and lossy — a formatted "05:30 PM – 07:00 PM" cannot be put back into
 * two time pickers — so the row hands the sheet the raw fields instead.
 */
export interface RequestDraft {
  id: string
  kind: AttendanceRequestKind
  profileId: string
  startDate: string
  endDate: string
  dayPart: string
  reason: string
  leaveTypeId?: string | null
  exceptionType?: string | null
  atTime?: string | null
  returnTime?: string | null
  endTime?: string | null
}

interface RequestSheetProps {
  onClose: () => void
  /** Which tab to open on — `?new=leave` from the leave balance card. */
  initialKind?: AttendanceRequestKind
  /** Editing an existing pending request rather than filing a new one. */
  editing?: RequestDraft | null
}

const isExceptionType = (v: string | null | undefined): v is AttendanceExceptionType =>
  EXCEPTION_TYPES.some((t) => t.value === v)

/**
 * File a request — your own, or somebody else's — and edit one that is still
 * pending. One sheet for all four kinds and for both of those jobs, because they
 * are the same form: what changed between "Add for someone else" and the four
 * per-kind forms on My Attendance was who the row was for, not what was in it.
 *
 * Who it is for follows from a permission, not a role, and defaults to you:
 * whoever may enter attendance for others gets a Who field, everybody else gets
 * the same sheet with that one field absent.
 *
 * What happens next has three outcomes, and the banner names the one that
 * applies rather than the two that might:
 *
 * - Filing for someone else while holding `can_apply_attendance_directly`
 *   applies immediately and writes their record.
 * - Filing for someone else without it queues the request — and the filer is
 *   never the approver, so it says who will decide instead of implying they can.
 * - Filing for yourself always queues, whatever you hold. That is not a UI
 *   choice: the insert policy on all four tables only accepts `status =
 *   'pending'` when `profile_id = auth.uid()`, so an Apply button here would
 *   promise something the database refuses.
 */
export function RequestSheet({ onClose, initialKind = 'leave', editing = null }: RequestSheetProps) {
  // Mounted by the parent on demand, so `open` starts true and the panel plays
  // its slide-out before `onExitComplete` unmounts it. Closing straight to
  // unmount is what made a backdrop press look like the panel had vanished
  // rather than been put away.
  const [open, setOpen] = useState(true)
  const close = () => setOpen(false)
  const isDesktop = useIsDesktop()
  const toast = useToast()
  const { profile } = useAuthContext()
  const isEdit = editing !== null

  const [kind, setKind] = useState<AttendanceRequestKind>(editing?.kind ?? initialKind)
  const [profileId, setProfileId] = useState(editing?.profileId ?? profile?.id ?? '')
  const [leaveTypeId, setLeaveTypeId] = useState(editing?.leaveTypeId ?? '')
  const [startDate, setStartDate] = useState(editing?.startDate ?? localToday)
  const [endDate, setEndDate] = useState(editing?.endDate ?? localToday)
  const [dayPart, setDayPart] = useState(editing?.dayPart ?? 'full')
  const [reason, setReason] = useState(editing?.reason ?? '')
  // Exception + overtime are single-day, and both are about clock times.
  const [day, setDay] = useState(editing?.startDate ?? localToday)
  const [exceptionType, setExceptionType] = useState<AttendanceExceptionType>(
    isExceptionType(editing?.exceptionType) ? editing.exceptionType : 'late_arrival',
  )
  const [atTime, setAtTime] = useState(toHHMM(editing?.atTime))
  const [returnTime, setReturnTime] = useState(toHHMM(editing?.returnTime))
  const [endTime, setEndTime] = useState(toHHMM(editing?.endTime))

  const isSelf = !!profile && profileId === profile.id
  // Entering attendance for somebody else, and skipping the queue when you do,
  // are two separate abilities — HR holds the first and not the second.
  const canFileForOthers = useCanAccess('can_manage_attendance')
  const canApplyDirectly = useCanAccess('can_apply_attendance_directly')
  const appliesDirectly = !isSelf && canApplyDirectly

  // Shared, already-warm cache (the directory and every people picker read it),
  // so this costs nothing extra for the employee who never opens the Who field.
  const { data: people = [] } = usePeople()
  const { data: leaveTypes = [] } = useLeaveTypes(true)
  const myBalances = useMyLeaveBalances()
  const theirBalances = useLeaveBalancesByProfile(isSelf ? undefined : profileId || undefined)
  const balances = (isSelf ? myBalances.data : theirBalances.data) ?? []

  const submitLeave = useSubmitLeave()
  const updateLeave = useUpdateLeave()
  const submitWfh = useSubmitWfh()
  const updateWfh = useUpdateWfh()
  const requestException = useRequestException()
  const updateException = useUpdateException()
  const submitOvertime = useSubmitOvertime()
  const updateOvertime = useUpdateOvertime()
  const enterLeave = useEnterLeaveForEmployee()
  const grantWfh = useGrantWfh()
  const enterException = useEnterExceptionForEmployee()
  const enterOvertime = useEnterOvertimeForEmployee()

  const isRange = kind === 'leave' || kind === 'wfh'
  const pending = [
    submitLeave, updateLeave, submitWfh, updateWfh, requestException, updateException,
    submitOvertime, updateOvertime, enterLeave, grantWfh, enterException, enterOvertime,
  ].some((m) => m.isPending)

  const peopleOptions = people
    .filter((p) => p.is_active && isInternalRole(p.role))
    .map((p) => ({
      // Your own row is named, not labelled "Me": the field is a list of people
      // and one of them is you. "(you)" marks it without renaming you.
      value: p.id,
      label: p.id === profile?.id ? `${p.name} (you)` : p.name,
      avatar: { name: p.name, url: p.avatar_url },
    }))

  // Balances carry the allowance, so they are the option list when we have them:
  // choosing a type is really choosing which allowance to spend, and the number
  // belongs on the option rather than a line below it. Falls back to the plain
  // type list, so a person with no balances configured still sees a usable form
  // rather than an empty dropdown with no explanation.
  const leaveOptions = balances.length > 0
    ? balances.map((b) => ({
        value: b.type.id,
        label: `${b.type.name}, ${b.remaining} of ${b.type.days_allowed} left`,
      }))
    : leaveTypes.map((t) => ({ value: t.id, label: t.name }))

  const timeLabel = EXCEPTION_TYPES.find((t) => t.value === exceptionType)?.timeLabel ?? 'At'
  // Overtime runs between two times, and an out-of-office comes back; a late
  // arrival and an early departure are one moment each.
  const hasSecondTime = kind === 'overtime' || exceptionType === 'out_of_office'
  const overtimeHours = day && atTime && endTime ? hoursBetween(atTime, endTime) : 0

  const done = () => {
    toast(
      isEdit ? 'Request updated' : appliesDirectly ? 'Applied' : 'Submitted for approval',
      'success',
    )
    close()
  }
  const failed = (e: unknown) =>
    toast(e instanceof Error ? e.message : 'Could not save that', 'error')
  const settle = { onSuccess: done, onError: failed }

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

      // The DB column is plain text; `toDayPart` is the one place that narrows it.
      const part = toDayPart(dayPart)

      if (kind === 'leave') {
        const payload = {
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          day_part: part,
          reason: reason.trim(),
        }
        if (isEdit) updateLeave.mutate({ id: editing.id, payload }, settle)
        else if (isSelf) submitLeave.mutate(payload, settle)
        else enterLeave.mutate({ payload: { ...payload, profile_id: profileId }, appliesDirectly }, settle)
        return
      }

      const payload = {
        start_date: startDate,
        end_date: endDate,
        day_part: part,
        reason: reason.trim(),
      }
      if (isEdit) updateWfh.mutate({ id: editing.id, payload }, settle)
      else if (isSelf) submitWfh.mutate(payload, settle)
      else {
        grantWfh.mutate(
          {
            payload: { ...payload, profile_id: profileId },
            grantedBy: profile?.id ?? '',
            appliesDirectly,
          },
          settle,
        )
      }
      return
    }

    if (!day) { toast('Choose the day', 'error'); return }

    if (kind === 'exception') {
      if (!atTime) { toast(`Say what time ${isSelf ? 'you' : 'they'} ${timeLabel.toLowerCase()}`, 'error'); return }
      if (exceptionType === 'out_of_office' && !returnTime) {
        toast(isSelf ? 'Say when you came back' : 'Say when they came back', 'error'); return
      }
      const payload = {
        exception_type: exceptionType,
        date: day,
        requested_time: atTime,
        return_time: exceptionType === 'out_of_office' ? returnTime : undefined,
        reason: reason.trim(),
      }
      if (isEdit) updateException.mutate({ id: editing.id, payload }, settle)
      else if (isSelf) requestException.mutate(payload, settle)
      else enterException.mutate({ profileId, payload, appliesDirectly }, settle)
      return
    }

    if (!atTime || !endTime) { toast('Choose the hours worked', 'error'); return }
    if (overtimeHours <= 0) { toast('The end time is before the start', 'error'); return }
    const payload = {
      date: day,
      start_time: atTime,
      end_time: endTime,
      hours: overtimeHours,
      reason: reason.trim(),
    }
    if (isEdit) updateOvertime.mutate({ id: editing.id, payload }, settle)
    else if (isSelf) submitOvertime.mutate(payload, settle)
    else enterOvertime.mutate({ profileId, payload, appliesDirectly }, settle)
  }

  const label = 'text-label font-ui font-semibold uppercase tracking-wider text-text-2'

  const banner = isEdit
    ? 'Changing a request that is still waiting for a decision. It stays pending, and the approver sees the new version.'
    : appliesDirectly
      ? 'This applies straight away and updates their record. You are allowed to enter attendance without approval.'
      : isSelf
        ? 'This waits for approval and changes nothing until it is given.'
        : 'This waits for approval and changes nothing until it is given. Not from you: nobody decides on a request they filed, so an admin or another approver will pick it up in this queue.'

  return (
    <Drawer
      open={open}
      onClose={close}
      onExitComplete={onClose}
      side={isDesktop ? 'right' : 'bottom'}
      width={460}
      busy={pending}
      title={
        <h2 className="font-display font-bold text-[16px] text-text-1">
          {isEdit ? 'Edit request' : 'New request'}
        </h2>
      }
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={close} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={submit} loading={pending}>
            {isEdit ? 'Save changes' : appliesDirectly ? 'Apply' : 'Submit for approval'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="rounded-sm border border-border-default bg-surface-2 px-3 py-2 font-ui text-[12px] text-text-3">
          {banner}
        </p>

        {/* Four equal columns rather than a wrapping row: the tabs are the
            panel's top-level choice, and a strip that fills the width reads as
            one control instead of four buttons that happened to fit. Editing
            shows no strip at all — a leave request cannot become an overtime
            claim, and a disabled row of tabs only invites the attempt. */}
        {!isEdit && (
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
        )}

        {/* Only for people who may file for others, and it opens on themselves —
            the same button files your own leave and somebody else's. */}
        {canFileForOthers && !isEdit && (
          <div className="space-y-1.5">
            <label className={label}>Who is this for</label>
            <Select value={profileId} onChange={setProfileId} options={peopleOptions} placeholder="Choose a person" />
          </div>
        )}

        {kind === 'leave' && (
          <div className="space-y-1.5">
            <label className={label}>Leave type</label>
            <Select
              value={leaveTypeId}
              onChange={setLeaveTypeId}
              options={leaveOptions}
              placeholder="Choose a type"
            />
          </div>
        )}

        {kind === 'exception' && (
          <div className="space-y-1.5">
            <label className={label}>What happened</label>
            <Select
              value={exceptionType}
              onChange={(v) => { if (isExceptionType(v)) setExceptionType(v) }}
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

            {/* Two columns only when there is a second time to put in one. A
                late arrival or an early departure is a single moment, and the
                fixed pair left its field at half width beside an empty slot. */}
            <div className={cn('grid gap-3', hasSecondTime && 'grid-cols-2')}>
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
            rows={4}
            placeholder={isSelf ? 'Why you need this.' : 'Why this is being entered for them.'}
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
          />
        </div>
      </div>
    </Drawer>
  )
}
