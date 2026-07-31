import { useCallback, useEffect, useRef, useState } from 'react'

/** What an inline auto-save indicator is currently reporting. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** How long a settled state stays on screen before the badge clears itself. */
const CLEAR_AFTER: Partial<Record<SaveState, number>> = { saved: 2000, error: 5000 }

/**
 * Drives the "Saving… / Saved" badge on screens that persist edits as you make
 * them, rather than behind a Save button.
 *
 * Each mark cancels the previous timer, so a burst of edits keeps the badge up
 * until the last one lands instead of clearing on the first one's schedule.
 */
export function useSaveStatus() {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const mark = useCallback((next: SaveState) => {
    clearTimeout(timer.current)
    setSaveState(next)
    const ms = CLEAR_AFTER[next]
    if (ms) timer.current = setTimeout(() => setSaveState('idle'), ms)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    saveState,
    markSaving: useCallback(() => mark('saving'), [mark]),
    markSaved: useCallback(() => mark('saved'), [mark]),
    markFailed: useCallback(() => mark('error'), [mark]),
  }
}
