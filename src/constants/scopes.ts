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
 * The widest scope a set of permissions may look through.
 *
 * A cap, not a preference. It used to be a map of role names, which meant a role
 * invented on the Roles screen could never be given a delivery lead's reach
 * however it was configured — backwards for a portal whose roles are data.
 *
 * These are the same two keys `task_visible()` reads in the database, so the
 * lens can never offer a view RLS would then return empty:
 *
 *   can_view_all_tasks   everything in the portal          → Everyone
 *   can_view_team_tasks  your services and your teammates  → My team
 *   neither              your own work                     → Mine
 *
 * A project's own manager sees the whole project regardless, but that is a fact
 * about one project rather than a lens, so it is enforced in RLS and in the task
 * filter, not here.
 */
export const SCOPE_PERMISSION: Record<Exclude<Scope, 'mine'>, string> = {
  everyone: 'can_view_all_tasks',
  team: 'can_view_team_tasks',
}

/** Mirrors has_feature(): the `administrator` permission grants every other one. */
const ADMINISTRATOR = 'administrator'

export function maxScopeFrom(permissions: readonly string[] | undefined): Scope {
  if (!permissions) return 'mine'
  const has = (key: string) => permissions.includes(ADMINISTRATOR) || permissions.includes(key)
  if (has(SCOPE_PERMISSION.everyone)) return 'everyone'
  if (has(SCOPE_PERMISSION.team)) return 'team'
  return 'mine'
}

/** The scopes someone may choose between — always a prefix of SCOPES. */
export function scopesUpTo(max: Scope): readonly Scope[] {
  return SCOPES.slice(0, SCOPES.indexOf(max) + 1)
}

/** Narrows a scope to what is allowed, leaving allowed values alone. */
export function clampScope(scope: Scope, max: Scope): Scope {
  const allowed = scopesUpTo(max)
  return allowed.includes(scope) ? scope : allowed[allowed.length - 1]
}
