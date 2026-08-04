/**
 * Durations are stored as whole minutes (tasks.estimated_minutes), and typed by
 * people in shorthand — "1h 30m", "90m", "1.5h", "1:30" or a bare "90".
 */

/** "1h 30m" · "2h" · "45m". Always returns something, "0m" included. */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Same, but blank when there is no estimate to show. */
export function formatEstimate(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null
  return formatMinutes(minutes)
}

/** Whole seconds between two timestamps; `end` of null means "still running". */
export function secondsBetween(start: string, end: string | null, nowMs = Date.now()): number {
  const from = new Date(start).getTime()
  const to = end ? new Date(end).getTime() : nowMs
  return Math.max(0, Math.floor((to - from) / 1000))
}

/** "01:04:09" — the live read-out for a running timer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

const HM_PATTERN = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/i
const CLOCK_PATTERN = /^(\d+):([0-5]?\d)$/

/**
 * Parses duration shorthand to whole minutes.
 * Returns null for anything unparseable, so callers can hold the raw text and
 * show a validation message rather than silently storing a wrong number.
 */
export function parseDuration(input: string): number | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null

  // "1:30" — hours:minutes.
  const clock = CLOCK_PATTERN.exec(raw)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])

  // A bare number is minutes, which is what people type most often.
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const mins = Math.round(Number(raw))
    return mins > 0 ? mins : null
  }

  const hm = HM_PATTERN.exec(raw)
  if (!hm || (hm[1] === undefined && hm[2] === undefined)) return null

  const hours = hm[1] ? Number(hm[1]) : 0
  const mins = hm[2] ? Number(hm[2]) : 0
  const total = Math.round(hours * 60 + mins)
  return total > 0 ? total : null
}
