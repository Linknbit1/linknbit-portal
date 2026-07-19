/** Helpers for month-scoped, date-grouped request lists (leave / WFH / exceptions / shoutouts). */

/** 'YYYY-MM-DD' for a local date. */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Day key of an ISO timestamp (e.g. created_at). */
export function isoDayKey(iso: string): string {
  return toDayKey(new Date(iso))
}

/** Every day from start to end inclusive, as 'YYYY-MM-DD'. Guards against bad ranges. */
export function datesInRange(start: string, end: string): string[] {
  const from = new Date(start + 'T00:00:00')
  const to = new Date(end + 'T00:00:00')
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return [start]
  const out: string[] = []
  for (let d = new Date(from); d <= to && out.length < 366; d.setDate(d.getDate() + 1)) {
    out.push(toDayKey(d))
  }
  return out
}

export interface DateGroup<T> {
  date: string
  items: T[]
}

/**
 * Buckets items under each day they apply to (an item spanning several days
 * appears under each), newest day first.
 */
export function groupByDate<T>(items: T[], getDates: (item: T) => string[]): DateGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    for (const date of getDates(item)) {
      const bucket = map.get(date)
      if (bucket) bucket.push(item)
      else map.set(date, [item])
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, groupItems]) => ({ date, items: groupItems }))
}

const TODAY_KEY = () => toDayKey(new Date())

/** "Today · Wednesday, 15 July 2026" style heading for a day bucket. */
export function formatDayHeading(date: string): { label: string; relative: string | null } {
  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const today = TODAY_KEY()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const relative =
    date === today ? 'Today'
    : date === toDayKey(yesterdayDate) ? 'Yesterday'
    : date === toDayKey(tomorrowDate) ? 'Tomorrow'
    : null
  return { label, relative }
}

/** Short "requested on" stamp, e.g. "12 Jul, 4:51 pm". */
export function formatRequestedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}
