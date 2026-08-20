import { useMemo, useState } from 'react'

/** The ranges a report offers, plus the custom escape hatch. */
export type RangePreset = 'today' | 'week' | 'month' | 'custom'

export interface DateRange {
  from: string
  to: string
}

const iso = (d: Date): string => d.toISOString().slice(0, 10)

/** Presets resolve against today, so "this week" means the week you are in. */
export function resolvePreset(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const now = new Date()
  const to = iso(now)
  if (preset === 'today') return { from: to, to }
  if (preset === 'week') {
    // Monday-start, matching how the office talks about a week.
    const day = (now.getDay() + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - day)
    return { from: iso(monday), to }
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: iso(first), to }
}

/**
 * The range control every backlog report shares.
 *
 * Presets first because they cover almost every question, with custom dates
 * appearing only once asked for — a pair of date pickers on permanent display
 * makes the common case look harder than it is.
 */
export function useReportRange(initial: Exclude<RangePreset, 'custom'> = 'month') {
  const [preset, setPreset] = useState<RangePreset>(initial)
  const [custom, setCustom] = useState<DateRange>(() => resolvePreset(initial))

  const range = useMemo(
    () => (preset === 'custom' ? custom : resolvePreset(preset)),
    [preset, custom],
  )

  return { preset, setPreset, custom, setCustom, range }
}

