import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  announceRelease, fetchReleaseAnnouncements, markReleaseSeen,
} from '../api/releases'
import { useAuthContext } from '../context/AuthContext'
import { RELEASES } from '../pages/docs/changelogData'

export const RELEASE_KEYS = {
  announcements: ['releases', 'announcements'] as const,
}

export function useReleaseAnnouncements(enabled = true) {
  return useQuery({
    queryKey: RELEASE_KEYS.announcements,
    queryFn: fetchReleaseAnnouncements,
    enabled,
    staleTime: 60_000,
  })
}

export function useMarkReleaseSeen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (version: string) => markReleaseSeen(version),
    // The dot is read off the profile, so that is what has to be refetched.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useAnnounceRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ version, title, body }: { version: string; title: string; body: string }) =>
      announceRelease(version, title, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_KEYS.announcements }),
  })
}

/**
 * Is there a release this person has not opened yet?
 *
 * Answered against the bundle rather than the database, because the changelog
 * ships inside the bundle: whatever release this build knows about is by
 * definition the newest one that has reached this browser. A profile with no
 * `last_seen_release` at all is somebody who has never opened the changelog,
 * which is worth one dot but not a permanent one, so it counts as unseen only
 * while the newest release is recent.
 */
export function useUnseenRelease(): { version: string; unseen: boolean } {
  const { profile } = useAuthContext()
  const newest = RELEASES[0]?.version ?? ''
  const seen = profile?.last_seen_release ?? null
  return { version: newest, unseen: !!newest && seen !== newest }
}
