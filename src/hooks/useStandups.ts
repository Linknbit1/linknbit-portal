import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStandupWindow, submitStandup, fetchStandupsByDate, fetchMyStandups, fetchStandupRoster,
  type StandupEntryInput,
} from '../api/standups'

export const STANDUP_KEYS = {
  window: ['standup', 'window'] as const,
  byDate: (date: string) => ['standups', 'date', date] as const,
  mine: (profileId: string) => ['standups', 'mine', profileId] as const,
  roster: (date: string) => ['standups', 'roster', date] as const,
}

/**
 * The submission window. Refetched every 30s so the gate flips open on its own
 * without a page reload; `useWindowCountdown` interpolates in between.
 */
export function useStandupWindow() {
  return useQuery({
    queryKey: STANDUP_KEYS.window,
    queryFn: fetchStandupWindow,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * Seconds until `target`, anchored to the SERVER clock. We record server time
 * alongside browser time when the payload arrives and advance from there, so a
 * skewed local clock can't make the countdown lie. (The RPC still has the final
 * say on submit — this only drives the display.)
 */
export function useWindowCountdown(serverNow?: string, target?: string): number | null {
  const [seconds, setSeconds] = useState<number | null>(null)
  const anchor = useRef<{ server: number; browser: number } | null>(null)

  useEffect(() => {
    anchor.current = serverNow ? { server: new Date(serverNow).getTime(), browser: Date.now() } : null
    const compute = () => {
      if (!anchor.current || !target) { setSeconds(null); return }
      const effectiveNow = anchor.current.server + (Date.now() - anchor.current.browser)
      setSeconds(Math.max(0, Math.round((new Date(target).getTime() - effectiveNow) / 1000)))
    }
    compute()
    const t = setInterval(compute, 1000)
    return () => clearInterval(t)
  }, [serverNow, target])

  return seconds
}

export function useSubmitStandup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entries, notes }: { entries: StandupEntryInput[]; notes?: string }) =>
      submitStandup(entries, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDUP_KEYS.window })
      qc.invalidateQueries({ queryKey: ['standups'] })
    },
  })
}

export function useStandupsByDate(date: string) {
  return useQuery({
    queryKey: STANDUP_KEYS.byDate(date),
    queryFn: () => fetchStandupsByDate(date),
    staleTime: 20_000,
  })
}

export function useMyStandups(profileId: string | undefined) {
  return useQuery({
    queryKey: STANDUP_KEYS.mine(profileId ?? ''),
    queryFn: () => fetchMyStandups(profileId!),
    enabled: !!profileId,
    staleTime: 20_000,
  })
}

export function useStandupRoster(date: string, enabled = true) {
  return useQuery({
    queryKey: STANDUP_KEYS.roster(date),
    queryFn: () => fetchStandupRoster(date),
    enabled,
    staleTime: 20_000,
  })
}
