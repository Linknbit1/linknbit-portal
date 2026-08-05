import { useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatMinutes, parseDuration } from '../../lib/duration'

interface DurationInputProps {
  /** Whole minutes, or null when unset. */
  value: number | null
  onChange: (minutes: number | null) => void
  placeholder?: string
  className?: string
}

/**
 * Free-text duration field that accepts "1h 30m", "90m", "1.5h", "1:30" or a bare
 * "90", and normalises to "1h 30m" on blur. The raw text is held locally while
 * typing so a half-finished "1h " is never parsed into a wrong value.
 */
export function DurationInput({ value, onChange, placeholder = 'e.g. 1h 30m', className }: DurationInputProps) {
  // Holds the raw text only while it is being edited. Dropping back to null lets
  // the field read straight from `value`, so an update from elsewhere shows up
  // without an effect to re-sync it.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (value ? formatMinutes(value) : '')

  const invalid = text.trim() !== '' && parseDuration(text) === null

  const commit = () => {
    const raw = text.trim()
    if (!raw) { onChange(null); setDraft(null); return }
    const mins = parseDuration(raw)
    if (mins === null) return // keep the bad text on screen so it can be fixed
    onChange(mins)
    setDraft(null)
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
        {/* Sized to match DateTimeRangePicker's trigger — the Schedule field sits
            directly above this one, and both read as timestamps/metadata. */}
        <input
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
          placeholder={placeholder}
          inputMode="text"
          aria-invalid={invalid}
          className={cn(
            'w-full bg-surface-inset border rounded-md pl-8.5 pr-3 py-2 font-mono text-[12.5px] text-text-1 placeholder:text-text-4 outline-none transition-colors',
            invalid ? 'border-error focus:border-error' : 'border-border-default hover:border-border-strong focus:border-border-focus',
          )}
        />
      </div>
      {invalid && (
        <p className="font-ui text-[11px] text-error">Try “1h 30m”, “90m” or “1:30”.</p>
      )}
    </div>
  )
}
