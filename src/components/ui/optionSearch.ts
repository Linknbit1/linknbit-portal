/**
 * Shared search behaviour for the dropdowns. Lives outside the components so
 * Select and MultiSelectPeople agree on when a list needs a search box and what
 * counts as a match — a picker that filters differently depending on which one
 * you opened is worse than one that doesn't filter at all.
 */

/**
 * Every dropdown carries a search box, whatever its length. Deliberate product
 * call: one habit — open, type, Enter — that never depends on guessing how many
 * options are behind the trigger. Individual pickers can still opt out with
 * `searchable={false}`.
 */
export const SEARCHABLE_BY_DEFAULT = true

/**
 * Touch keyboards cover the list they are meant to filter, and there is no
 * "just start typing" on a phone anyway — the field is still there to tap.
 */
export function shouldAutoFocusSearch(): boolean {
  return !window.matchMedia?.('(pointer: coarse)').matches
}

/** Case-insensitive "contains" across every field an option can be found by. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((f) => !!f && f.toLowerCase().includes(q))
}
