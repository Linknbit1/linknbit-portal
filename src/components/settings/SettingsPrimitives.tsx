import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The shared furniture for every settings panel.
 *
 * Attendance, Standup and Gamification were three screens written at three
 * different times, each inventing its own headings, label sizes and helper-text
 * treatment. Now that they sit next to each other as tabs, one row has to look
 * like the next — so they all build out of these three pieces rather than
 * out of ad-hoc divs.
 */

interface SettingsGroupProps {
  icon: LucideIcon
  title: string
  /** One line under the heading, saying what this group is for. */
  description?: string
  children: ReactNode
  className?: string
}

/** A titled card holding related fields. */
export function SettingsGroup({ icon: Icon, title, description, children, className }: SettingsGroupProps) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-border-default bg-surface-1', className)}>
      <header className="flex items-start gap-2.5 border-b border-border-subtle px-4 py-3.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-brand-red/20 bg-brand-red/10">
          <Icon size={14} className="text-brand-red" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[14.5px] font-bold text-text-1">{title}</h3>
          {description && <p className="mt-0.5 font-ui text-[11.5px] text-text-4">{description}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  )
}

interface SettingsFieldProps {
  label: string
  /** Explains what the setting does, and what the current value means. */
  hint?: ReactNode
  children: ReactNode
  /** Put the control beside the label rather than under it — right for toggles. */
  inline?: boolean
}

/**
 * One labelled setting.
 *
 * The hint sits under the control rather than under the label, because it
 * usually describes the consequence of the value that is currently in it.
 */
export function SettingsField({ label, hint, children, inline }: SettingsFieldProps) {
  if (inline) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-ui text-[12.5px] font-medium text-text-1">{label}</p>
          {hint && <p className="mt-0.5 font-ui text-[11.5px] text-text-4">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    )
  }
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 font-ui text-[11.5px] text-text-4">{hint}</p>}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  disabled?: boolean
  hint?: ReactNode
  /** Rendered inside the field, after the number — "minutes", "XP", "characters". */
  suffix?: string
}

/** A number setting, sized to the number rather than stretched across the card. */
export function NumberField({ label, value, onChange, min, max, disabled, hint, suffix }: NumberFieldProps) {
  return (
    <SettingsField label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-9 w-28 rounded-md border border-border-default bg-surface-inset px-3',
            'font-mono text-[13px] text-text-1 outline-none focus:border-border-focus',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        />
        {suffix && <span className="font-ui text-[12px] text-text-3">{suffix}</span>}
      </div>
    </SettingsField>
  )
}
