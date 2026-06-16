// Pure timezone helpers for attendance. No React, no Supabase.
//
// Attendance check_in/check_out are stored as UTC timestamptz. The office runs in
// a single configured IANA timezone (e.g. 'Asia/Karachi'). These helpers convert
// between a UTC instant and the office wall-clock without relying on the browser's
// own timezone.

interface WallParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone: string): WallParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  }
}

// Offset (timeZone − UTC) in minutes for the given instant. Pakistan = +300.
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return (asUTC - date.getTime()) / 60000
}

/** Minutes since local midnight (office timezone) for a UTC ISO instant. */
export function isoToZonedMinutes(iso: string, timeZone: string): number {
  const p = zonedParts(new Date(iso), timeZone)
  return p.hour * 60 + p.minute
}

/**
 * Convert an office wall-clock date + time to the matching UTC ISO instant.
 * `date` is 'YYYY-MM-DD', `time` is 'HH:MM' (24h). Used when HR enters a
 * check-in/out time that should be interpreted in the office timezone.
 */
export function zonedWallTimeToIso(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const guessUTC = Date.UTC(y, mo - 1, d, h, mi)
  // The offset at the guessed instant is accurate for fixed-offset zones (e.g.
  // Pakistan, no DST); a single correction is sufficient for the rare DST edge.
  const offset = tzOffsetMinutes(new Date(guessUTC), timeZone)
  return new Date(guessUTC - offset * 60000).toISOString()
}
