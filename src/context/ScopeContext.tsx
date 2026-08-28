import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { SCOPES, clampScope, maxScopeFor, type Scope } from '../constants/scopes'
import { useAuthContext } from './AuthContext'

interface ScopeValue {
  scope: Scope
  setScope: (next: Scope) => void
  /** The widest scope this role may choose — the switch renders up to it. */
  maxScope: Scope
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
 *
 * The role's cap is applied on the way out rather than on the way in, so a
 * stored "everyone" from a wider role (or from before the caps existed) is
 * narrowed for this session without being overwritten — someone promoted back
 * finds their setting where they left it.
 */
export function ScopeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext()
  const [stored, setStoredState] = useState<Scope>(readStored)
  const maxScope = maxScopeFor(profile?.role)
  const scope = clampScope(stored, profile?.role)

  const setScope = useCallback((next: Scope) => {
    setStoredState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* private mode — the switch still works for this session */
    }
  }, [])

  const value = useMemo(() => ({ scope, setScope, maxScope }), [scope, setScope, maxScope])
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

/** Falls back to "everyone" outside the provider, so client-portal pages are safe. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScope(): ScopeValue {
  return useContext(ScopeContext) ?? { scope: 'everyone', setScope: () => {}, maxScope: 'everyone' }
}
