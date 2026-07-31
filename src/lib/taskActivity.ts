import { PRIORITY_LABELS, STATUS_LABELS } from './utils'
import type { TaskActivityRow } from '../api/auditLog'

/** One rendered line in the activity feed. */
export interface ActivityEntry {
  id: string
  createdAt: string
  actorId: string | null
  actorName: string
  /** Sentence fragment following the actor's name, e.g. "changed status from … to …". */
  text: string
}

type Values = Record<string, unknown> | null

function read(values: Values, key: string): unknown {
  return values && typeof values === 'object' ? values[key] : undefined
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v)
}

function labelFor(field: string, raw: unknown, names: Map<string, string>): string {
  const value = asString(raw)
  if (value === null) return 'empty'

  switch (field) {
    case 'status':
      return STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? value
    case 'priority':
      return PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] ?? value
    case 'assignee_id':
    case 'stage_id':
      // Ids are meaningless in a feed; fall back to the id only if unresolved.
      return names.get(value) ?? 'someone'
    case 'due_date':
    case 'start_date': {
      const at = new Date(value)
      const day = at.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
      // Midnight is what a date-only pick stores, so don't imply a time nobody set.
      if (at.getHours() === 0 && at.getMinutes() === 0) return day
      return `${day} at ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    case 'client_visible':
      return value === 'true' ? 'visible to client' : 'internal only'
    case 'estimated_minutes':
      return `${value} min`
    default:
      return value
  }
}

const FIELD_NOUN: Record<string, string> = {
  status: 'status',
  priority: 'priority',
  due_date: 'due date',
  start_date: 'start date',
  stage_id: 'stage',
  assignee_id: 'assignee',
  estimated_minutes: 'estimate',
}

/**
 * Turns audit rows into readable lines. One row can change several fields, so it
 * can produce several entries — each gets a suffixed id to stay keyable.
 *
 * `names` resolves profile/stage ids to display names; anything unresolved
 * degrades to a vaguer phrase rather than showing a raw uuid.
 */
export function describeTaskActivity(rows: TaskActivityRow[], names: Map<string, string>): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  for (const row of rows) {
    const actorName = row.actor_name ?? 'Someone'
    const base = { createdAt: row.created_at, actorId: row.actor_id, actorName }
    const oldValues = row.old_values as Values
    const newValues = row.new_values as Values

    if (row.action.endsWith('.created')) {
      entries.push({ ...base, id: row.id, text: 'created this task' })
      continue
    }

    if (row.action.endsWith('.deleted')) {
      entries.push({ ...base, id: row.id, text: 'deleted this task' })
      continue
    }

    for (const field of row.changed_fields) {
      const before = read(oldValues, field)
      const after = read(newValues, field)
      const id = `${row.id}:${field}`

      if (field === 'title') {
        entries.push({ ...base, id, text: `renamed this task to "${asString(after) ?? ''}"` })
        continue
      }

      if (field === 'client_visible') {
        entries.push({ ...base, id, text: `made this task ${labelFor(field, after, names)}` })
        continue
      }

      const noun = FIELD_NOUN[field] ?? field.replace(/_/g, ' ')
      const from = labelFor(field, before, names)
      const to = labelFor(field, after, names)

      // "set the due date to X" reads better than "changed … from empty to X".
      entries.push({
        ...base,
        id,
        text: from === 'empty' ? `set the ${noun} to ${to}` : `changed ${noun} from ${from} to ${to}`,
      })
    }
  }

  return entries
}
