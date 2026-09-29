import type { WorkLogRow } from '../api/reports'

type Cell = string | number

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-09-29" in the reader's clock — sorts correctly as text in any spreadsheet. */
function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "14:05" — 24-hour, so a sheet can sort and subtract it without AM/PM parsing. */
function localTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const WORK_LOG_HEADERS = [
  'Date', 'Person', 'Client', 'Project', 'Service', 'Task',
  'Start', 'End', 'Minutes', 'Hours', 'Description', 'Source', 'Billable', 'Task deleted',
]

/**
 * One CSV row per timer segment: who worked on what, from when to when, and the
 * description they gave when they started it. Sorted by person, then time, so
 * each person's month reads top to bottom as a diary.
 */
export function workLogCsvRows(rows: WorkLogRow[]): Cell[][] {
  return [...rows]
    .sort((a, b) =>
      (a.profile_name ?? '').localeCompare(b.profile_name ?? '') || a.started_at.localeCompare(b.started_at))
    .map((r) => [
      localDate(r.started_at),
      r.profile_name ?? '',
      r.client_name ?? '',
      r.project_name ?? '',
      r.service_name ?? '',
      r.task_title ?? '',
      localTime(r.started_at),
      r.is_running ? 'running' : r.ended_at ? localTime(r.ended_at) : '',
      r.minutes,
      Math.round((r.minutes / 60) * 100) / 100,
      // Older segments predate the required description; say so rather than leave a gap that reads as lost data.
      r.note?.trim() || '(no description)',
      r.source === 'manual' ? 'Logged by hand' : 'Timer',
      r.billable ? 'yes' : '',
      r.task_deleted ? 'yes' : '',
    ])
}
