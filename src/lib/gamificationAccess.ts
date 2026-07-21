// Role-based access for the gamification module.
//
// Capability questions (govern / recognize / fulfil payouts) moved to
// role_feature_flags — use the hooks in src/hooks/useRoleFlags.ts, which mirror the
// SQL helpers can_govern_gamification() / can_recognize(). Only the "is this person
// internal at all" test remains here, because it is not a toggleable capability.

const CLIENT_ROLES = ['client_owner', 'client_member'] as const

/** Any internal staff member can earn LP, claim tasks, and redeem rewards. */
export const canParticipate = (role: string | null | undefined): boolean =>
  !!role && !(CLIENT_ROLES as readonly string[]).includes(role)
