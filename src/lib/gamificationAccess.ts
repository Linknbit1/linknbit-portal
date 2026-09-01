import { isInternalRole } from './roles'
// Role-based access for the gamification module.
//
// Capability questions (govern / recognize / fulfil payouts) moved to
// role_feature_flags — use the hooks in src/hooks/useRoleFlags.ts, which mirror the
// SQL helpers can_govern_gamification() / can_recognize(). Only the "is this person
// internal at all" test remains here, because it is not a toggleable capability.


/** Any internal staff member can earn LP, claim tasks, and redeem rewards. */
export const canParticipate = (role: string | null | undefined): boolean =>
  isInternalRole(role)
