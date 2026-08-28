/**
 * Whose work a list is showing. The second axis beside the view a screen is in:
 * a board can be a board of your work, your team's, or everyone's, and that is
 * a different question from whether it is a board or a table.
 *
 * Kept out of the context file so the provider stays a component-only module.
 */
export type Scope = 'mine' | 'team' | 'everyone'

export const SCOPES: readonly Scope[] = ['mine', 'team', 'everyone']

export const SCOPE_LABEL: Record<Scope, string> = {
  mine: 'Mine',
  team: 'My team',
  everyone: 'Everyone',
}

/**
 * The widest scope each role may look through.
 *
 * A cap, not a preference: an employee sees their own work on every screen that
 * has a lens, a team lead or PM can widen to the people they share a team with,
 * and only the roles that answer for the whole company get "Everyone". Finance
 * is there because billing questions are company-wide by nature.
 *
 * This mirrors can_access_task() in the database, which is what actually decides.
 * Offering a lens wider than that rule would just render an empty board — so HR
 * sits at `mine` here for the same reason it is absent there: it never had
 * blanket access to delivery work, and this is not the change that grants it.
 *
 * A role missing from this map gets `mine` — a new role should have to be given
 * reach deliberately rather than inherit it by being forgotten.
 */
const MAX_SCOPE_BY_ROLE: Record<string, Scope> = {
  super_admin: 'everyone',
  admin: 'everyone',
  finance: 'everyone',
  project_manager: 'team',
  team_lead: 'team',
  hr: 'mine',
  employee: 'mine',
}

export function maxScopeFor(role: string | null | undefined): Scope {
  if (!role) return 'mine'
  return MAX_SCOPE_BY_ROLE[role] ?? 'mine'
}

/** The scopes a role may choose between — always a prefix of SCOPES. */
export function scopesFor(role: string | null | undefined): readonly Scope[] {
  return SCOPES.slice(0, SCOPES.indexOf(maxScopeFor(role)) + 1)
}

/** Narrows a scope to what the role is allowed, leaving allowed values alone. */
export function clampScope(scope: Scope, role: string | null | undefined): Scope {
  const allowed = scopesFor(role)
  return allowed.includes(scope) ? scope : allowed[allowed.length - 1]
}
