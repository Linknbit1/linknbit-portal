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
