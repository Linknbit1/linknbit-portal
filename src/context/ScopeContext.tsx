import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { SCOPES, clampScope, maxScopeFrom, type Scope } from '../constants/scopes'
import { useMyPermissions } from '../hooks/usePermissions'

interface ScopeValue {
  scope: Scope
  setScope: (next: Scope) => void
  /** The widest scope the viewer's permissions allow — the switch renders up to it. */
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
 * The cap is applied on the way out rather than on the way in, so a stored
 * "everyone" from a wider set of permissions (or from before the caps existed)
 * is narrowed for this session without being overwritten — someone granted it
 * back finds their setting where they left it.
 *
 * The cap comes from permissions, not from the role name, and permissions
 * arrive a moment after the app does. Until they land nothing is clamped:
 * narrowing to "Mine" first and widening a beat later would empty every board
 * on the way past, which reads as data loss rather than as loading.
 */
export function ScopeProvider({ children }: { children: ReactNode }) {
  const { data: permissions } = useMyPermissions()
  const [stored, setStoredState] = useState<Scope>(readStored)
  const maxScope = permissions ? maxScopeFrom(permissions) : stored
  const scope = clampScope(stored, maxScope)

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
