/**
 * The half of a request that decides who may act on it.
 *
 * WFH has no `entered_by` column, so it is optional — a request nobody filed on
 * somebody's behalf simply has nothing to exclude.
 */
export interface ReviewableRequest {
  profile_id: string
  entered_by?: string | null
}

/**
 * Whether this viewer may decide on this request, mirroring the RLS rule: not
 * your own, and not one you filed for somebody else.
 *
 * Shared rather than rewritten per screen because it is the difference between
 * two badges meaning the same thing and meaning different things. HR filing
 * leave for an employee used to add one to HR's own "waiting on you" count — a
 * number she could never drive to zero, because she is the one person barred
 * from clearing it — while the admin who actually had to sign it off saw it
 * only as part of an undifferentiated queue total.
 */
export function isDecidableBy(request: ReviewableRequest, viewerId: string | undefined): boolean {
  if (!viewerId) return false
  return request.profile_id !== viewerId && (request.entered_by ?? null) !== viewerId
}

/** How many of these are actually stuck on the viewer. */
export function countDecidable(
  requests: ReviewableRequest[],
  viewerId: string | undefined,
): number {
  return requests.reduce((n, request) => (isDecidableBy(request, viewerId) ? n + 1 : n), 0)
}
