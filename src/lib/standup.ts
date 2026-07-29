/** Pure formatting helpers shared by the standup pages. */

/** Countdown shape: "1h 20m", "9m 05s", "42s". */
export function hhmm(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

/** Duration in minutes as "6h 30m" / "45m". */
export function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

/** Office-local wall time of an ISO instant, e.g. "4:55 PM". */
export function officeTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

/** Today in the browser's locale as an ISO date (YYYY-MM-DD) — what the pickers speak. */
export const localToday = (): string => new Intl.DateTimeFormat('en-CA').format(new Date())
