import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FormFieldProps {
  label: string
  /** Shown greyed after the label — "optional", a unit, a hint. */
  hint?: string
  /** Rendered under the control in error red. */
  error?: string
  /** Rendered under the control in muted text when there is no error. */
  helper?: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

/**
 * A labelled form row for the BD module.
 *
 * The shared `Select` prints its label *inside* the trigger, so the control read
 * as "Delivery service Development" on one line — the label competing with the
 * value it describes. Rather than change that component (it is used across the
 * whole portal), BD forms drop `label` from Select and wrap the control in this,
 * which puts the label above like `Input` already does. That makes every BD
 * form field — input, select, date picker, textarea — sit on the same grid.
 */
export function FormField({ label, hint, error, helper, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block font-ui text-[12px] font-medium text-text-2"
      >
        {label}
        {hint && <span className="ml-1 font-normal text-text-4">{hint}</span>}
      </label>
      {children}
      {error
        ? <p className="mt-1 font-ui text-[11.5px] text-error">{error}</p>
        : helper
          ? <p className="mt-1 font-ui text-[11.5px] text-text-4">{helper}</p>
          : null}
    </div>
  )
}
