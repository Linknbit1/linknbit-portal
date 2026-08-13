import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'me_mode'

interface MeModeValue {
  /** True when views should show only the signed-in user's own work. */
  enabled: boolean
  toggle: () => void
  setEnabled: (next: boolean) => void
}

const MeModeContext = createContext<MeModeValue | null>(null)

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * "Me Mode" — a workspace-wide lens that narrows task views to what the signed-in
 * user is assigned to or tagged in.
 *
 * Context rather than a per-page toggle so it survives navigation: switching from
 * Tasks to a project should not silently drop the filter and show everyone's work
 * again. Persisted to localStorage because it is a view preference — no auth or
 * profile data, which is what the storage rules actually guard against.
 */
export function MeModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readStored)

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* private mode — the toggle still works for this session */ }
  }, [])

  const value = useMemo(
    () => ({ enabled, setEnabled, toggle: () => setEnabled(!enabled) }),
    [enabled, setEnabled],
  )

  return <MeModeContext.Provider value={value}>{children}</MeModeContext.Provider>
}

/** Returns a disabled stub outside the provider, so client-portal pages are safe. */
// eslint-disable-next-line react-refresh/only-export-components
export function useMeMode(): MeModeValue {
  return useContext(MeModeContext) ?? { enabled: false, toggle: () => {}, setEnabled: () => {} }
}
