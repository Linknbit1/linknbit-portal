/**
 * Shared vocabulary for partial days. Leave and WFH both use it, and they must
 * keep using the SAME words: a half-day leave and a partial WFH describe the
 * same halves of the same day, and a reader comparing two rows should not have
 * to work out whether "1st half" and "morning" mean the same thing.
 */

import type { AttendanceDayPart } from '../types'

/** Long form, for pickers where the reader is choosing rather than scanning. */
export const DAY_PART_OPTIONS: { value: AttendanceDayPart; label: string }[] = [
  { value: 'full', label: 'Full day(s)' },
  { value: 'first_half', label: 'Half day — first half' },
  { value: 'second_half', label: 'Half day — second half' },
]

/** Short form, for chips on a row that already says which day it is. */
export const DAY_PART_LABEL: Record<string, string> = {
  first_half: '1st half',
  second_half: '2nd half',
}

/** Narrows an arbitrary stored string (the DB column is plain text) to a day part. */
export function toDayPart(value: string): AttendanceDayPart {
  return value === 'first_half' || value === 'second_half' ? value : 'full'
}
