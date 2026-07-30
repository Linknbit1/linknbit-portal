import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTerminal,
  fetchEnrollmentLinks,
  fetchPunchesByProfileDate,
  fetchMyTerminalGate,
  fetchTerminals,
  fetchUnmatchedPunches,
  linkEnrollment,
  rotateTerminalSecret,
  setTerminalActive,
  unlinkEnrollment,
} from '../api/biometric'
import type { CreateTerminalPayload } from '../api/biometric'
import { ATTENDANCE_KEYS } from './useAttendance'

export const BIOMETRIC_KEYS = {
  terminals: ['biometric', 'terminals'] as const,
  myTerminalGate: ['biometric', 'terminals', 'my-gate'] as const,
  unmatchedPunches: ['biometric', 'punches', 'unmatched'] as const,
  punchesByProfileDate: (profileId: string, date: string) =>
    ['biometric', 'punches', profileId, date] as const,
  enrollmentLinks: ['biometric', 'enrollments'] as const,
}

/**
 * Health is time-dependent — a terminal goes stale simply because time passed,
 * with no server event to react to — so this polls rather than waiting for an
 * invalidation that would never come.
 */
export function useTerminals() {
  return useQuery({
    queryKey: BIOMETRIC_KEYS.terminals,
    queryFn: fetchTerminals,
    refetchInterval: 30_000,
  })
}

/**
 * Terminal gate for the employee-facing check-in card. Polls because a member
 * looking at a "use the terminal" card needs the portal button to come back on
 * its own once the relay goes down — there is no server event to react to.
 */
export function useMyTerminalGate() {
  return useQuery({
    queryKey: BIOMETRIC_KEYS.myTerminalGate,
    queryFn: fetchMyTerminalGate,
    refetchInterval: 60_000,
  })
}

export function useUnmatchedPunches(limit = 200) {
  return useQuery({
    queryKey: BIOMETRIC_KEYS.unmatchedPunches,
    queryFn: () => fetchUnmatchedPunches(limit),
    refetchInterval: 60_000,
  })
}

export function usePunchesByProfileDate(profileId: string, date: string) {
  return useQuery({
    queryKey: BIOMETRIC_KEYS.punchesByProfileDate(profileId, date),
    queryFn: () => fetchPunchesByProfileDate(profileId, date),
    enabled: Boolean(profileId && date),
  })
}

export function useEnrollmentLinks() {
  return useQuery({
    queryKey: BIOMETRIC_KEYS.enrollmentLinks,
    queryFn: fetchEnrollmentLinks,
  })
}

export function useCreateTerminal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTerminalPayload) => createTerminal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.terminals })
    },
  })
}

export function useRotateTerminalSecret() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, secret }: { id: string; secret: string }) =>
      rotateTerminalSecret(id, secret),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.terminals })
    },
  })
}

export function useSetTerminalActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setTerminalActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.terminals })
    },
  })
}

export function useLinkEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, zkUserId }: { profileId: string; zkUserId: string }) =>
      linkEnrollment(profileId, zkUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.enrollmentLinks })
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.unmatchedPunches })
      // Linking adopts historical punches, which changes what the attendance
      // views should show for those members.
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myHistory })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useUnlinkEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => unlinkEnrollment(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIOMETRIC_KEYS.enrollmentLinks })
    },
  })
}
