import { useState } from 'react'
import { Clock, Coins, Ruler, AlertTriangle, Save, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { TimePicker } from '../ui/TimePicker'
import { useToast } from '../ui/toast-context'
import { Skeleton } from '../ui/Skeleton'
import { useStandupSettings, useUpdateStandupSettings } from '../../hooks/useStandups'
import { useAttendanceSettings } from '../../hooks/useAttendance'
import { formatMinutes } from '../../lib/duration'
import { SettingsField, SettingsGroup, NumberField } from './SettingsPrimitives'

/** "17:55" from a day that ends at 18:00, minus a 5-minute offset. */
function minusMinutes(hhmm: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!m) return hhmm
  const total = (Number(m[1]) * 60 + Number(m[2]) - minutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function addMinutes(hhmm: string, minutes: number): string {
  return minusMinutes(hhmm, -minutes)
}

/**
 * The standup rules: when it opens, how long it counts as on time, what it is
 * worth, and how much has to be written.
 *
 * Unlock has two modes because both are legitimate. "Minutes before the day
 * ends" follows the working day on its own; a fixed clock time reads more
 * plainly but has to be kept in step, so the preview here shows where it lands
 * relative to the current day and warns when the two have drifted apart.
 */
export function StandupRulesPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast()
  const { data: settings, isLoading } = useStandupSettings()
  const { data: attendance } = useAttendanceSettings()
  const save = useUpdateStandupSettings()

  const [mode, setMode] = useState<'relative' | 'fixed'>('relative')
  const [offset, setOffset] = useState('5')
  const [fixedTime, setFixedTime] = useState('17:55')
  const [onTimeWindow, setOnTimeWindow] = useState('60')
  const [xp, setXp] = useState('5')
  const [minChars, setMinChars] = useState('100')
  const [enforce, setEnforce] = useState(true)
  const [loaded, setLoaded] = useState(false)

  // Seed once from the server, then leave the form alone — a refetch mid-edit
  // must not overwrite what is being typed.
  if (settings && !loaded) {
    setMode(settings.unlock_mode === 'fixed' ? 'fixed' : 'relative')
    setOffset(String(settings.unlock_offset_min))
    setFixedTime(settings.unlock_time.slice(0, 5))
    setOnTimeWindow(String(settings.on_time_window_min))
    setXp(String(settings.xp_on_time))
    setMinChars(String(settings.min_work_done_chars))
    setEnforce(settings.enforce_required_hours)
    setLoaded(true)
  }

  if (isLoading || !settings) return <Skeleton className="h-96" />

  const dayEnd = attendance?.work_end_time?.slice(0, 5) ?? '18:00'
  const opensAt = mode === 'fixed' ? fixedTime : minusMinutes(dayEnd, Number(offset) || 0)
  const onTimeUntil = addMinutes(opensAt, Number(onTimeWindow) || 0)
  // A fixed unlock that no longer sits near the working day is almost always a
  // day that moved without the standup being moved with it.
  const fixedDrifted =
    mode === 'fixed' && Math.abs(
      (Number(fixedTime.slice(0, 2)) * 60 + Number(fixedTime.slice(3, 5))) -
      (Number(dayEnd.slice(0, 2)) * 60 + Number(dayEnd.slice(3, 5))),
    ) > 120

  const handleSave = () => {
    save.mutate(
      {
        unlock_mode: mode,
        unlock_offset_min: Math.max(0, Number(offset) || 0),
        unlock_time: fixedTime,
        on_time_window_min: Math.max(5, Number(onTimeWindow) || 60),
        xp_on_time: Math.max(0, Number(xp) || 0),
        min_work_done_chars: Math.max(15, Number(minChars) || 100),
        enforce_required_hours: enforce,
      },
      {
        onSuccess: () => toast('Standup rules saved', 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not save the rules', 'error'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── When it opens ── */}
      <SettingsGroup
        icon={Clock}
        title="When the standup opens"
        description="Nobody can write their update before this, so it cannot be filled in at lunchtime."
      >
        <SettingsField label="Opening" hint="Follow the working day, or pin it to the clock.">
          <Select
            value={mode}
            onChange={(v) => setMode(v === 'fixed' ? 'fixed' : 'relative')}
            disabled={!canEdit}
            options={[
              { value: 'relative', label: 'Minutes before the day ends' },
              { value: 'fixed', label: 'A fixed time' },
            ]}
          />
        </SettingsField>

        {mode === 'relative' ? (
          <NumberField
            label="Minutes before the day ends"
            value={offset}
            onChange={setOffset}
            min={0}
            max={480}
            disabled={!canEdit}
            hint={`The day ends at ${dayEnd}, so the standup opens at ${opensAt}. Change the working day and this follows it.`}
          />
        ) : (
          <SettingsField
            label="Opens at"
            hint={`The working day ends at ${dayEnd}. A fixed time stays where you put it, so move it yourself if the day changes.`}
          >
            <TimePicker value={fixedTime} onChange={setFixedTime} disabled={!canEdit} />
          </SettingsField>
        )}

        {fixedDrifted && (
          <p className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/8 px-3 py-2 font-ui text-[11.5px] text-warning">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            The standup opens at {opensAt} but the working day ends at {dayEnd}. That is more than
            two hours apart, check the working day has not moved without this.
          </p>
        )}

        <NumberField
          label="On-time window (minutes)"
          value={onTimeWindow}
          onChange={setOnTimeWindow}
          min={5}
          max={1440}
          disabled={!canEdit}
          hint={`Submit by ${onTimeUntil} to count as on time. After that it still saves, marked late, and earns nothing.`}
        />
      </SettingsGroup>

      {/* ── What it is worth ── */}
      <SettingsGroup
        icon={Coins}
        title="Reward"
        description="What an on-time standup pays. A late one always pays nothing."
      >
        <NumberField
          label="XP for an on-time standup"
          value={xp}
          onChange={setXp}
          min={0}
          max={500}
          disabled={!canEdit}
          hint="Credits XP and reputation together. Set to 0 to stop rewarding standups entirely."
        />
      </SettingsGroup>

      {/* ── What counts as a real update ── */}
      <SettingsGroup
        icon={Ruler}
        title="What counts as a real update"
        description="The rules the form enforces before anything can be submitted."
      >
        <NumberField
          label="Minimum characters per task"
          value={minChars}
          onChange={setMinChars}
          min={15}
          max={1000}
          disabled={!canEdit}
          hint="Applies to each task's description on its own, not the whole standup. Blocks “worked on it”."
        />

        <SettingsField
          label="Require the full day to be accounted for"
          hint={
            enforce
              ? 'The logged time must match the day exactly. The working day less the break, less any leave or approved exception.'
              : 'The required hours are shown but not enforced. Anyone can submit any amount.'
          }
        >
          <Toggle checked={enforce} onChange={setEnforce} disabled={!canEdit} />
        </SettingsField>

        {attendance && (
          <p className="rounded-md border border-border-subtle bg-surface-2/40 px-3 py-2 font-ui text-[11.5px] text-text-3">
            Today a full day is{' '}
            <span className="font-semibold text-text-1">
              {formatMinutes(
                (() => {
                  const toMin = (t?: string | null) => {
                    const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null
                    return m ? Number(m[1]) * 60 + Number(m[2]) : null
                  }
                  const s = toMin(attendance.work_start_time)
                  const e = toMin(attendance.work_end_time)
                  const bs = toMin(attendance.break_start_time)
                  const be = toMin(attendance.break_end_time)
                  return Math.max(0, (s !== null && e !== null ? e - s : 0) -
                    (bs !== null && be !== null && be > bs ? be - bs : 0))
                })(),
              )}
            </span>
            . Change the working day or the lunch break under Settings → Attendance.
          </p>
        )}
      </SettingsGroup>

      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save rules
          </Button>
        </div>
      )}
    </div>
  )
}
