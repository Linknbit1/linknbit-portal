// Authoritative (management) roles get the management dashboard experience and can
// see People / Teams. Everyone else (employee, finance, clients) gets the
// individual-contributor experience. Team Lead / PM are authoritative but see
// scoped data — that scoping is layered on inside the relevant pages.
export const AUTHORITATIVE_ROLES = [
  'super_admin', 'admin', 'hr', 'project_manager', 'team_lead',
] as const

export const isAuthoritative = (role: string | null | undefined): boolean =>
  !!role && (AUTHORITATIVE_ROLES as readonly string[]).includes(role)
