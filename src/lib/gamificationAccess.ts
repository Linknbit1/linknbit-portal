// Role-based access for the gamification module.
// Replaces the old role_feature_flags lookups — mirrors the SQL helpers
// can_govern_gamification() / can_recognize() so UI gates match RLS exactly.

const GOVERN_ROLES    = ['super_admin', 'admin', 'hr'] as const
const RECOGNIZE_ROLES = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead'] as const
const CLIENT_ROLES    = ['client_owner', 'client_member'] as const

const has = (list: readonly string[], role: string | null | undefined): boolean =>
  !!role && list.includes(role)

/** HR + Admins: approve tasks/shoutouts/redemptions, manage the catalog, grant LP, restrict, award badges. */
export const canGovernGamification = (role: string | null | undefined): boolean =>
  has(GOVERN_ROLES, role)

/** Managers + Team Leads (and governors): post quest tasks, give shoutouts, review task submissions. */
export const canRecognize = (role: string | null | undefined): boolean =>
  has(RECOGNIZE_ROLES, role)

/** Any internal staff member can earn LP, claim tasks, and redeem rewards. */
export const canParticipate = (role: string | null | undefined): boolean =>
  !!role && !has(CLIENT_ROLES, role)

/** Finance may mark cash payouts fulfilled and view the redemption queue (in addition to governors). */
export const canFulfillPayouts = (role: string | null | undefined): boolean =>
  canGovernGamification(role) || role === 'finance'
