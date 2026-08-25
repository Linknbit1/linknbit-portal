import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { SCOPES, type Scope } from '../constants/scopes'

interface ScopeValue {
  scope: Scope
  setScope: (next: Scope) => void
}

const ScopeContext = createContext<ScopeValue | null>(null)

const STORAGE_KEY = 'work_scope'
/** The old two-state toggle. Read once so nobody's setting is lost on upgrade. */
const LEGACY_KEY = 'me_mode'

function isScope(value: string | null): value is Scope {
  return value !== null && SCOPES.some((s) => s === value)
}

function readStored(): Scope {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isScope(stored)) return stored
    // Me Mode on becomes "Mine"; off becomes "Everyone", which is what it meant.
    return localStorage.getItem(LEGACY_KEY) === '1' ? 'mine' : 'everyone'
  } catch {
    return 'everyone'
  }
}

/**
 * A workspace-wide lens narrowing task and project views to your own work, your
 * teams' work, or nothing at all.
 *
 * Context rather than per-page state so the lens survives navigation: moving
 * from Tasks into a project should not silently widen it back to everyone.
 * Persisted to localStorage because it is a view preference — no auth or
 * profile data, which is what the storage rules actually guard against.
 */
export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<Scope>(readStored)

  const setScope = useCallback((next: Scope) => {
    setScopeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* private mode — the switch still works for this session */
    }
  }, [])

  const value = useMemo(() => ({ scope, setScope }), [scope, setScope])
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

/** Falls back to "everyone" outside the provider, so client-portal pages are safe. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScope(): ScopeValue {
  return useContext(ScopeContext) ?? { scope: 'everyone', setScope: () => {} }
}
